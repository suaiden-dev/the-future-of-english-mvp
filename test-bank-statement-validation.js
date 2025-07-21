// Script para testar a validação de extrato bancário
async function testBankStatementValidation() {
  console.log('🧪 Testando validação de extrato bancário...');
  
  const testData = {
    documentId: 'test-document-id',
    isBankStatement: true, // Valor validado pelo N8N
    filename: 'test-document.pdf',
    userId: 'test-user-id'
  };
  
  try {
    const response = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/functions/v1/update-bank-statement-validation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4'
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Resultado do teste:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 Validação de extrato bancário atualizada com sucesso!');
      console.log('📋 Mensagem:', result.message);
      console.log('🔍 Dados da validação:', JSON.stringify(result.validation, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar validação:', error);
  }
}

// Função para verificar dados na tabela documents_to_be_verified
async function checkDocumentsToBeVerified() {
  console.log('🔍 Verificando dados na tabela documents_to_be_verified...');
  
  try {
    const response = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/rest/v1/documents_to_be_verified?select=*&limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao buscar dados:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('📊 Dados encontrados:', data.length, 'documentos');
    
    data.forEach((doc, index) => {
      console.log(`📄 Documento ${index + 1}:`);
      console.log(`   - ID: ${doc.id}`);
      console.log(`   - Filename: ${doc.filename}`);
      console.log(`   - is_bank_statement: ${doc.is_bank_statement}`);
      console.log(`   - Status: ${doc.status}`);
      console.log(`   - Created: ${doc.created_at}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
  }
}

// Executar testes
console.log('🚀 Iniciando testes de validação de extrato bancário...\n');

// Primeiro verificar dados existentes
await checkDocumentsToBeVerified();

console.log('\n' + '='.repeat(50) + '\n');

// Depois testar a validação
await testBankStatementValidation(); 