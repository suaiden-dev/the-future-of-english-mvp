import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const supabaseUrl = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Environment variables not configured');
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar usuário autenticado
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar role (apenas admin ou lush-admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'lush-admin')) {
      throw new Error('Forbidden: Admin access required');
    }

    // Obter documentIds do body
    const { documentIds } = await req.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      throw new Error('documentIds array is required');
    }

    console.log(`🗑️ [APPROVED-CLEANUP] Iniciando remoção de ${documentIds.length} documentos por ${user.email}`);

    let deletedCount = 0;
    let storageDeletedCount = 0;
    let sessionsDeletedCount = 0;
    const errors: Array<{ documentId: string, error: string }> = [];

    // Processar cada documento individualmente
    for (const documentId of documentIds) {
      try {
        console.log(`🗑️ [APPROVED-CLEANUP] Processando documento ${documentId}`);

        // 1. Buscar informações do documento antes de apagar
        // Aceitar documentos com status draft, processing ou pending (sem pagamento completed)
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .select('id, filename, file_url, user_id, status')
          .eq('id', documentId)
          .in('status', ['draft', 'processing', 'pending'])
          .single();

        // Verificar se não tem pagamento completed (segurança extra)
        if (doc) {
          const { data: completedPayments } = await supabase
            .from('payments')
            .select('id')
            .eq('document_id', documentId)
            .eq('status', 'completed')
            .limit(1);
          
          if (completedPayments && completedPayments.length > 0) {
            console.error(`⚠️ [APPROVED-CLEANUP] Documento ${documentId} tem pagamento completed - não pode ser removido`);
            errors.push({ documentId, error: 'Documento tem pagamento completed' });
            continue;
          }
        }

        if (docError || !doc) {
          console.error(`⚠️ [APPROVED-CLEANUP] Documento ${documentId} não encontrado ou não é draft:`, docError);
          errors.push({ documentId, error: 'Documento não encontrado ou não é draft' });
          continue;
        }

        // 2. Apagar arquivo do storage
        if (doc.file_url) {
          try {
            // Extrair o caminho do arquivo da URL
            // Formato esperado: https://[project].supabase.co/storage/v1/object/public/documents/[path]
            const urlParts = doc.file_url.split('/storage/v1/object/public/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              
              const { error: storageError } = await supabase.storage
                .from('documents')
                .remove([filePath]);

              if (storageError) {
                console.error(`⚠️ [APPROVED-CLEANUP] Erro ao remover arquivo do storage para ${documentId}:`, storageError);
                // Não adicionar ao erro, continuar com a remoção do banco
              } else {
                console.log(`🗑️ [APPROVED-CLEANUP] Arquivo removido do storage para doc ${documentId}`);
                storageDeletedCount++;
              }
            } else {
              console.warn(`⚠️ [APPROVED-CLEANUP] URL do arquivo em formato inesperado: ${doc.file_url}`);
            }
          } catch (storageException) {
            console.error(`❌ [APPROVED-CLEANUP] Exceção ao remover arquivo do storage para ${documentId}:`, storageException);
            // Não adicionar ao erro, continuar com a remoção do banco
          }
        }

        // 3. Apagar sessões Stripe relacionadas
        try {
          const { error: sessionDeleteError } = await supabase
            .from('stripe_sessions')
            .delete()
            .eq('document_id', documentId);

          if (sessionDeleteError) {
            console.error(`⚠️ [APPROVED-CLEANUP] Erro ao remover sessões Stripe para ${documentId}:`, sessionDeleteError);
            // Não adicionar ao erro, continuar com a remoção do banco
          } else {
            console.log(`🗑️ [APPROVED-CLEANUP] Sessões Stripe removidas para doc ${documentId}`);
            sessionsDeletedCount++;
          }
        } catch (sessionException) {
          console.error(`❌ [APPROVED-CLEANUP] Exceção ao remover sessões Stripe para ${documentId}:`, sessionException);
          // Não adicionar ao erro, continuar com a remoção do banco
        }

        // 4. Apagar documento do banco
        const { error: deleteError } = await supabase
          .from('documents')
          .delete()
          .eq('id', documentId);

        if (deleteError) {
          console.error(`❌ [APPROVED-CLEANUP] Erro ao remover documento ${documentId}:`, deleteError);
          errors.push({ documentId, error: deleteError.message });
        } else {
          console.log(`✅ [APPROVED-CLEANUP] Documento ${documentId} (${doc.filename}) removido com sucesso`);
          deletedCount++;
        }

      } catch (docException: any) {
        console.error(`❌ [APPROVED-CLEANUP] Exceção ao processar documento ${documentId}:`, docException);
        errors.push({ documentId, error: docException.message || 'Erro desconhecido' });
      }
    }

    console.log(`✅ [APPROVED-CLEANUP] Processamento concluído:`);
    console.log(`   - Documentos removidos: ${deletedCount}`);
    console.log(`   - Arquivos removidos do storage: ${storageDeletedCount}`);
    console.log(`   - Sessões Stripe removidas: ${sessionsDeletedCount}`);
    console.log(`   - Erros: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        storageDeletedCount,
        sessionsDeletedCount,
        errors,
        totalRequested: documentIds.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ [APPROVED-CLEANUP] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

