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
    const { documentId, isBankStatement, filename, userId } = await req.json();

    if (!documentId || isBankStatement === undefined || !filename || !userId) {
      throw new Error('Missing required parameters: documentId, isBankStatement, filename, userId');
    }

    console.log('DEBUG: Atualizando validação de extrato bancário:', { 
      documentId, 
      isBankStatement, 
      filename, 
      userId 
    });

    // Atualizar documento na tabela documents_to_be_verified
    const { data: updateData, error: updateError } = await supabase
      .from('documents_to_be_verified')
      .update({
        is_bank_statement: isBankStatement,
        updated_at: new Date().toISOString()
      })
      .eq('file_id', documentId)
      .eq('filename', filename)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('ERROR: Erro ao atualizar validação de extrato bancário:', updateError);
      throw new Error(`Failed to update bank statement validation: ${updateError.message}`);
    }

    console.log('DEBUG: Validação de extrato bancário atualizada com sucesso:', updateData);

    // Também atualizar na tabela documents se necessário
    const { data: docUpdateData, error: docUpdateError } = await supabase
      .from('documents')
      .update({
        is_bank_statement: isBankStatement,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('filename', filename)
      .eq('user_id', userId)
      .select()
      .single();

    if (docUpdateError) {
      console.error('ERROR: Erro ao atualizar documento principal:', docUpdateError);
      // Não falhar se isso der erro, apenas log
    } else {
      console.log('DEBUG: Documento principal atualizado:', docUpdateData);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        validation: updateData,
        document: docUpdateData,
        message: `Bank statement validation updated to: ${isBankStatement}`
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