// Script para testar o payload da Edge Function send-translation-webhook
async function testWebhookPayload() {
  console.log('Testando payload da Edge Function send-translation-webhook...');
  
  const testData = {
    filename: 'test-document.pdf',
    url: 'https://ywpogqwhwscbdhnoqsmv.supabase.co/storage/v1/object/public/documents/d233fbc7-cb30-439d-89b7-e5335a660d21/test.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    user_id: 'd233fbc7-cb30-439d-89b7-e5335a660d21',
    paginas: 2,
    tipo_trad: 'Certificado',
    valor: 30.00,
    idioma_raiz: 'Portuguese',
    is_bank_statement: false
  };
  
  try {
    const response = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/functions/v1/send-translation-webhook', {
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
      console.log('✅ Webhook enviado com sucesso!');
      console.log('📋 Payload enviado:', JSON.stringify(result.payload, null, 2));
      console.log('📄 É PDF:', result.payload.isPdf);
      console.log('🔗 Extensão:', result.payload.fileExtension);
      console.log('📊 Tabela:', result.payload.tableName);
    }
    
  } catch (error) {
    console.error('Erro ao testar webhook:', error);
  }
}

// Executar teste
testWebhookPayload(); 