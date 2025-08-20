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
    const { userId, fileName, fileContent, fileType } = await req.json();

    if (!userId || !fileName || !fileContent) {
      throw new Error('Missing required parameters: userId, fileName, fileContent');
    }

    console.log('DEBUG: Testando upload para usuário:', userId);
    console.log('DEBUG: Nome do arquivo:', fileName);
    console.log('DEBUG: Tipo do arquivo:', fileType);

    // Criar um arquivo de teste simples
    const testContent = fileContent || 'Test file content';
    const testFile = new Blob([testContent], { type: fileType || 'text/plain' });
    
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileExt = fileName.split('.').pop() || 'txt';
    const uniqueFileName = `${timestamp}_${randomId}.${fileExt}`;
    const filePath = `${userId}/${uniqueFileName}`;

    console.log('DEBUG: Caminho do arquivo:', filePath);

    // Fazer upload do arquivo
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('ERROR: Erro no upload:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('DEBUG: Upload bem-sucedido:', uploadData);

    // Gerar URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    console.log('DEBUG: URL pública gerada:', publicUrl);

    // Testar se a URL é acessível
    let urlAccessible = false;
    try {
      const response = await fetch(publicUrl);
      urlAccessible = response.ok;
      console.log('DEBUG: URL acessível:', urlAccessible, 'Status:', response.status);
    } catch (urlError) {
      console.error('ERROR: Erro ao testar URL:', urlError);
    }

    // Listar arquivos do usuário
    const { data: fileList, error: listError } = await supabase.storage
      .from('documents')
      .list(userId);

    if (listError) {
      console.error('ERROR: Erro ao listar arquivos:', listError);
    } else {
      console.log('DEBUG: Arquivos do usuário:', fileList);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        uploadData,
        publicUrl,
        urlAccessible,
        fileList,
        filePath
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