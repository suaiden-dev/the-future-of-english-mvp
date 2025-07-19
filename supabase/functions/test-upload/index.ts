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
    // Verificar método HTTP
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    // Obter variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('DEBUG: Verificando variáveis de ambiente...');
    console.log('DEBUG: SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Environment variables not configured');
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se o bucket 'documents' existe
    console.log('DEBUG: Verificando se o bucket documents existe...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('ERROR: Erro ao listar buckets:', bucketsError);
      throw new Error(`Failed to list buckets: ${bucketsError.message}`);
    }

    console.log('DEBUG: Buckets encontrados:', buckets.map(b => b.name));
    
    const documentsBucket = buckets.find(b => b.name === 'documents');
    if (!documentsBucket) {
      console.log('DEBUG: Bucket documents não encontrado, criando...');
      
      const { data: newBucket, error: createBucketError } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf', 'image/*']
      });

      if (createBucketError) {
        console.error('ERROR: Erro ao criar bucket:', createBucketError);
        throw new Error(`Failed to create bucket: ${createBucketError.message}`);
      }

      console.log('DEBUG: Bucket documents criado:', newBucket);
    } else {
      console.log('DEBUG: Bucket documents já existe:', documentsBucket);
    }

    // Testar upload de um arquivo simples
    console.log('DEBUG: Testando upload de arquivo...');
    
    const testContent = 'Test file content';
    const testFileName = `test_${Date.now()}.txt`;
    const testFilePath = `test/${testFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFilePath, new Blob([testContent], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('ERROR: Erro no upload de teste:', uploadError);
      throw new Error(`Test upload failed: ${uploadError.message}`);
    }

    console.log('DEBUG: Upload de teste bem-sucedido:', uploadData);

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(testFilePath);

    console.log('DEBUG: URL pública do arquivo de teste:', publicUrl);

    // Verificar se o arquivo pode ser baixado
    const downloadResponse = await fetch(publicUrl);
    if (!downloadResponse.ok) {
      console.error('ERROR: Não foi possível baixar o arquivo de teste');
    } else {
      console.log('DEBUG: Arquivo de teste pode ser baixado com sucesso');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Upload test completed successfully',
        testFile: {
          path: testFilePath,
          url: publicUrl,
          size: testContent.length
        }
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
        error: error.message || 'Erro interno do servidor',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}); 