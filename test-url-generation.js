// Script de teste para verificar geração de URLs do Supabase Storage
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ywpogqwhwscbdhnoqsmv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Testar geração de URL pública
async function testUrlGeneration() {
  console.log('Testando geração de URLs do Supabase Storage...');
  
  // URL de exemplo que está falhando
  const testPath = 'd233fbc7-cb30-439d-89b7-e5335a660d21/1752887133676_ogapcmc75.png';
  
  try {
    // Gerar URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(testPath);
    
    console.log('URL gerada:', publicUrl);
    
    // Testar se a URL é acessível
    const response = await fetch(publicUrl);
    console.log('Status da resposta:', response.status);
    console.log('URL acessível:', response.ok);
    
    if (!response.ok) {
      console.log('Erro ao acessar URL:', response.statusText);
    }
    
  } catch (error) {
    console.error('Erro ao gerar URL:', error);
  }
}

// Testar listagem de arquivos no bucket
async function testBucketContents() {
  console.log('\nTestando conteúdo do bucket...');
  
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .list('d233fbc7-cb30-439d-89b7-e5335a660d21');
    
    if (error) {
      console.error('Erro ao listar arquivos:', error);
    } else {
      console.log('Arquivos encontrados:', data);
    }
    
  } catch (error) {
    console.error('Erro ao listar bucket:', error);
  }
}

// Executar testes
testUrlGeneration();
testBucketContents(); 