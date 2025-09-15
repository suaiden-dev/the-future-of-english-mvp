import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CleanupRequest {
  documentId: string;
  timestamp?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId }: CleanupRequest = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🧹 Cleaning up document:', documentId);

    // Verificar se já existe um pagamento para este documento
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('document_id', documentId)
      .single();

    // Se já existe pagamento, não excluir
    if (existingPayment) {
      console.log('✅ Document has payment, skipping cleanup:', documentId);
      return new Response(
        JSON.stringify({ message: 'Document has payment, cleanup skipped' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar dados do documento para exclusão do storage
    const { data: document } = await supabase
      .from('documents')
      .select('user_id, filename, file_url')
      .eq('id', documentId)
      .single();

    if (!document) {
      console.log('⚠️ Document not found:', documentId);
      return new Response(
        JSON.stringify({ message: 'Document not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Excluir arquivo do storage se existir
    if (document.file_url) {
      try {
        // Extrair path do storage da URL
        const urlParts = document.file_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${document.user_id}/${fileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]);
          
        if (storageError) {
          console.error('❌ Error removing file from storage:', storageError);
        } else {
          console.log('🗑️ File removed from storage:', filePath);
        }
      } catch (storageError) {
        console.error('❌ Error in storage cleanup:', storageError);
      }
    }

    // Excluir registro do documento
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('❌ Error removing document from database:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to remove document from database' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Document cleaned up successfully:', documentId);

    return new Response(
      JSON.stringify({ 
        message: 'Document cleaned up successfully',
        documentId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in cleanup function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
