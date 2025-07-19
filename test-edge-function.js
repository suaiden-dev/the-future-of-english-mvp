// Script para testar a Edge Function de upload
async function testUploadFunction() {
  console.log('Testando Edge Function de upload...');
  
  const testData = {
    userId: 'd233fbc7-cb30-439d-89b7-e5335a660d21',
    fileName: 'test-document.pdf',
    fileContent: 'Test document content for n8n processing',
    fileType: 'application/pdf'
  };
  
  try {
    const response = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/functions/v1/test-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4'
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('Resultado do teste:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Upload bem-sucedido!');
      console.log('📁 Caminho do arquivo:', result.filePath);
      console.log('🔗 URL pública:', result.publicUrl);
      console.log('✅ URL acessível:', result.urlAccessible);
      console.log('📋 Arquivos do usuário:', result.fileList);
    }
    
  } catch (error) {
    console.error('Erro ao testar Edge Function:', error);
  }
}

// Executar teste
testUploadFunction(); 