import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('PROJECT_URL');
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Environment variables not configured');
    }

    // Criar cliente Supabase com service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obter dados da requisição
    const { documentId, fileUrl, userId } = await req.json();

    if (!documentId || !fileUrl || !userId) {
      throw new Error('Missing required parameters: documentId, fileUrl, userId');
    }

    console.log('DEBUG: Atualizando documento:', { documentId, fileUrl, userId });

    // Atualizar documento
    const { data: updateData, error: updateError } = await supabase
      .from('documents')
      .update({
        file_url: fileUrl,
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('ERROR: Erro ao atualizar documento:', updateError);
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    console.log('DEBUG: Documento atualizado com sucesso:', updateData);

    // Atualizar documento na tabela documents_to_be_verified
    const { data: verificationUpdate, error: verificationError } = await supabase
      .from('documents_to_be_verified')
      .update({
        translated_file_url: fileUrl,
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('file_id', updateData.file_id)
      .select()
      .single();

    if (verificationError) {
      console.error('ERROR: Erro ao atualizar documento para verificação:', verificationError);
      // Não falhar se isso der erro, apenas log
    } else {
      console.log('DEBUG: Documento para verificação atualizado:', verificationUpdate);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: updateData,
        verification: verificationUpdate 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('ERROR:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}); 