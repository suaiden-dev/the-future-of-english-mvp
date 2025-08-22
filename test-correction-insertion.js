// Test Script for insert-correction Edge Function
// This script tests if the correction insertion is working properly

const SUPABASE_URL = 'https://ywpogqwhwscbdhnoqsmv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4';

async function testCorrectionInsertion() {
  console.log('🧪 Testando inserção de correção...');
  
  try {
    // Dados de teste para correção
    const testCorrectionData = {
      user_id: 'test-user-id-123',
      filename: 'test-correction-document.pdf',
      translated_file_url: 'https://example.com/test-document.pdf',
      source_language: 'Portuguese',
      target_language: 'English',
      pages: 5,
      total_cost: 25.00,
      verification_code: 'TFE' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      client_name: 'Test Client',
      is_bank_statement: false,
      parent_document_id: 'test-parent-doc-123',
      original_document_id: 'test-original-doc-123',
      correction_reason: 'Document rejected by authenticator - TEST'
    };
    
    console.log('📋 Dados de teste:', testCorrectionData);
    
    // Chamar edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/insert-correction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        correctionData: testCorrectionData
      })
    });
    
    console.log('📡 Status da resposta:', response.status);
    console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📡 Resposta completa:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Resposta não é JSON válido:', e);
      return;
    }
    
    if (response.ok) {
      console.log('✅ Sucesso! Resposta:', responseData);
      
      if (responseData.data) {
        console.log('📊 Dados inseridos:', responseData.data);
        console.log('🆔 ID da correção:', responseData.data.id);
        console.log('📝 Status:', responseData.data.status);
        console.log('👤 User ID:', responseData.data.user_id);
        console.log('🏷️ É correção:', responseData.data.is_correction);
      }
    } else {
      console.error('❌ Erro na resposta:', responseData);
      console.error('❌ Status:', response.status);
      console.error('❌ Mensagem:', responseData.error);
      
      if (responseData.details) {
        console.error('❌ Detalhes do erro:', responseData.details);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro durante o teste:', error);
    console.error('💥 Stack trace:', error.stack);
  }
}

// Função para testar estrutura da tabela
async function testTableStructure() {
  console.log('\n🔍 Testando estrutura da tabela...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/documents_to_be_verified?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    console.log('📡 Status da consulta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Estrutura da tabela (primeira linha):', data[0] || 'Tabela vazia');
      
      if (data[0]) {
        const columns = Object.keys(data[0]);
        console.log('📋 Colunas disponíveis:', columns);
        
        // Verificar campos de correção
        const correctionFields = ['parent_document_id', 'is_correction', 'original_document_id', 'correction_reason'];
        const missingFields = correctionFields.filter(field => !columns.includes(field));
        
        if (missingFields.length === 0) {
          console.log('✅ Todos os campos de correção estão presentes');
        } else {
          console.log('❌ Campos de correção faltando:', missingFields);
          console.log('⚠️ Execute a migração SQL primeiro!');
        }
      }
    } else {
      console.error('❌ Erro ao consultar tabela:', response.status);
      const errorText = await response.text();
      console.error('❌ Detalhes:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Erro ao testar estrutura da tabela:', error);
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes da Edge Function insert-correction...\n');
  
  // Testar estrutura da tabela primeiro
  await testTableStructure();
  
  // Testar inserção de correção
  await testCorrectionInsertion();
  
  console.log('\n🏁 Testes concluídos!');
}

// Executar se for chamado diretamente
if (typeof window === 'undefined') {
  // Node.js environment
  runTests().catch(console.error);
} else {
  // Browser environment
  window.testCorrectionInsertion = testCorrectionInsertion;
  window.testTableStructure = testTableStructure;
  window.runTests = runTests;
  
  console.log('🧪 Script de teste carregado. Use:');
  console.log('- testTableStructure() - para testar estrutura da tabela');
  console.log('- testCorrectionInsertion() - para testar inserção de correção');
  console.log('- runTests() - para executar todos os testes');
}
