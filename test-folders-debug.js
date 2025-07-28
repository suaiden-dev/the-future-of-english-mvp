// Teste para verificar problemas com pastas e documentos
console.log('=== TESTE DE DEBUG - PASTAS E DOCUMENTOS ===');

// Verificar se as variáveis de ambiente estão configuradas
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || 'NÃO CONFIGURADO');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'CONFIGURADO' : 'NÃO CONFIGURADO');

// Testar conexão com Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFoldersAndDocuments() {
  try {
    console.log('\n🔍 Testando conexão com Supabase...');
    
    // Testar autenticação
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Erro na autenticação:', sessionError);
      return;
    }
    console.log('✅ Autenticação OK');
    
    // Testar consulta de pastas
    console.log('\n📁 Testando consulta de pastas...');
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', 'd233fbc7-cb30-439d-89b7-e5335a660d21')
      .order('created_at', { ascending: false });
    
    if (foldersError) {
      console.error('❌ Erro ao buscar pastas:', foldersError);
      return;
    }
    console.log('✅ Pastas encontradas:', folders?.length || 0);
    console.log('📁 Dados das pastas:', folders);
    
    // Testar consulta de documentos traduzidos
    console.log('\n📄 Testando consulta de documentos traduzidos...');
    const { data: documents, error: docsError } = await supabase
      .from('translated_documents')
      .select('*')
      .eq('user_id', 'd233fbc7-cb30-439d-89b7-e5335a660d21')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (docsError) {
      console.error('❌ Erro ao buscar documentos:', docsError);
      return;
    }
    console.log('✅ Documentos encontrados:', documents?.length || 0);
    console.log('📄 Dados dos documentos:', documents);
    
    // Testar RLS (Row Level Security)
    console.log('\n🔒 Testando RLS...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('translated_documents')
      .select('count')
      .eq('user_id', 'd233fbc7-cb30-439d-89b7-e5335a660d21');
    
    if (rlsError) {
      console.error('❌ Erro no teste RLS:', rlsError);
      return;
    }
    console.log('✅ RLS funcionando corretamente');
    
    console.log('\n🎉 Todos os testes passaram!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testFoldersAndDocuments(); 