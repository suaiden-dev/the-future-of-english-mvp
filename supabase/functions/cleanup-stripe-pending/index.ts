import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Iniciando limpeza de documentos Stripe pendentes');

    // Buscar documentos que estão há mais de 2 minutos em stripe_pending (para teste)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: pendingDocs, error: fetchError } = await supabase
      .from('documents')
      .select('id, user_id, filename, file_url, created_at')
      .eq('status', 'stripe_pending')
      .lt('updated_at', twoMinutesAgo);

    if (fetchError) {
      console.error('❌ Erro ao buscar documentos Stripe pendentes:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending documents' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!pendingDocs || pendingDocs.length === 0) {
      console.log('✅ Nenhum documento Stripe pendente encontrado para limpeza');
      return new Response(
        JSON.stringify({ 
          message: 'No pending documents found for cleanup',
          cleanedCount: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📊 Encontrados ${pendingDocs.length} documentos Stripe pendentes para limpeza`);

    let cleanedCount = 0;
    const errors = [];

    // Processar cada documento
    for (const doc of pendingDocs) {
      try {
        // Verificar se já existe pagamento para este documento
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('document_id', doc.id)
          .single();

        // Se já existe pagamento, pular
        if (existingPayment) {
          console.log(`✅ Documento ${doc.id} já tem pagamento, pulando limpeza`);
          continue;
        }

        // Excluir arquivo do storage se existir
        if (doc.file_url) {
          try {
            const urlParts = doc.file_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `${doc.user_id}/${fileName}`;
            
            const { error: storageError } = await supabase.storage
              .from('documents')
              .remove([filePath]);
              
            if (storageError) {
              console.error(`❌ Erro ao remover arquivo do storage para documento ${doc.id}:`, storageError);
            } else {
              console.log(`🗑️ Arquivo removido do storage: ${filePath}`);
            }
          } catch (storageError) {
            console.error(`❌ Erro no storage cleanup para documento ${doc.id}:`, storageError);
          }
        }

        // Excluir registro do documento
        const { error: dbError } = await supabase
          .from('documents')
          .delete()
          .eq('id', doc.id);

        if (dbError) {
          console.error(`❌ Erro ao remover documento ${doc.id} do banco:`, dbError);
          errors.push(`Failed to delete document ${doc.id}: ${dbError.message}`);
        } else {
          console.log(`✅ Documento ${doc.id} removido com sucesso`);
          cleanedCount++;
        }

        // Excluir sessão Stripe associada
        const { error: sessionError } = await supabase
          .from('stripe_sessions')
          .delete()
          .eq('document_id', doc.id);

        if (sessionError) {
          console.error(`❌ Erro ao remover sessão Stripe para documento ${doc.id}:`, sessionError);
        } else {
          console.log(`🗑️ Sessão Stripe removida para documento ${doc.id}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar documento ${doc.id}:`, error);
        errors.push(`Failed to process document ${doc.id}: ${error.message}`);
      }
    }

    console.log(`✅ Limpeza concluída: ${cleanedCount} documentos removidos`);

    return new Response(
      JSON.stringify({ 
        message: 'Stripe pending documents cleanup completed',
        cleanedCount,
        totalFound: pendingDocs.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erro na função de limpeza Stripe:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
