import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 [insert-correction] Iniciando processamento da correção');
    
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { correctionData } = await req.json()
    console.log('📋 [insert-correction] Dados recebidos:', JSON.stringify(correctionData, null, 2));

    // Validate required fields
    if (!correctionData.user_id || !correctionData.filename || !correctionData.translated_file_url) {
      const errorMsg = 'Missing required fields: user_id, filename, translated_file_url';
      console.error('❌ [insert-correction] Erro de validação:', errorMsg);
      throw new Error(errorMsg);
    }

    // Preparar dados para inserção na tabela translated_documents
    const insertData = {
      original_document_id: correctionData.original_document_id || correctionData.parent_document_id,
      user_id: correctionData.user_id,
      filename: correctionData.filename,
      translated_file_url: correctionData.translated_file_url,
      source_language: correctionData.source_language || 'Portuguese',
      target_language: correctionData.target_language || 'English',
      pages: correctionData.pages || 1,
      status: 'completed', // Status padrão para documentos traduzidos
      total_cost: correctionData.total_cost || 0,
      verification_code: correctionData.verification_code || 'TFE' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      is_authenticated: true, // Documento já foi autenticado pelo autenticador
      upload_date: new Date().toISOString(),
      authenticated_by: correctionData.authenticated_by || null,
      authenticated_by_name: correctionData.authenticated_by_name || null,
      authenticated_by_email: correctionData.authenticated_by_email || null,
      authentication_date: new Date().toISOString()
    };

    console.log('📝 [insert-correction] Dados para inserção em translated_documents:', JSON.stringify(insertData, null, 2));

    // Insert the correction into translated_documents table
    const { data, error } = await supabaseClient
      .from('translated_documents')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ [insert-correction] Erro na inserção:', error);
      console.error('❌ [insert-correction] Detalhes do erro:', JSON.stringify(error, null, 2));
      return new Response(
        JSON.stringify({ 
          error: error.message,
          details: error,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ [insert-correction] Correção inserida com sucesso em translated_documents:', data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: 'Correction inserted successfully into translated_documents',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 [insert-correction] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
