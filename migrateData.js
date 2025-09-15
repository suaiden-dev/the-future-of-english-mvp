// Script para migrar dados de todas as tabelas do Supabase antigo para o novo
// Requer: npm install @supabase/supabase-js

const { createClient } = require('@supabase/supabase-js');

// Configurações dos bancos
const OLD_SUPABASE_URL = 'https://ywpogqwhwscbdhnoqsmv.supabase.co';
const OLD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xaGJ3cGl6YWl6aHlpamt4a3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUxMTgwNywiZXhwIjoyMDY4MDg3ODA3fQ.LFEK8IUrEsQbUEzgXkLv8Yrq2yrYdbNoL4YTv2cbS-w';
const NEW_SUPABASE_URL = 'https://ywpogqwhwscbdhnoqsmv.supabase.co';
const NEW_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjU5NjEzOSwiZXhwIjoyMDY4MTcyMTM5fQ.R8WEMueMNajrK7_cVGLRIokJljWYXMUiZ2PHHQeMBG4';

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newClient = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

async function getTables() {
  // Busca todas as tabelas do schema public
  const { data, error } = await oldClient.rpc('pg_catalog.pg_tables', { schemaname: 'public' });
  if (error) throw error;
  return data.map(row => row.tablename);
}

async function getTableNames() {
  // Alternativa: consulta direta à information_schema.tables
  const { data, error } = await oldClient.from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  if (error) throw error;
  return data.map(row => row.table_name);
}

async function migrateTable(table) {
  console.log(`Migrando tabela: ${table}`);
  // Busca todos os dados da tabela antiga
  const { data, error } = await oldClient.from(table).select('*');
  if (error) {
    console.error(`Erro ao ler ${table}:`, error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.log(`Tabela ${table} vazia, pulando.`);
    return;
  }
  // Insere em lotes de 1000 registros
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error: insertError } = await newClient.from(table).insert(batch, { returning: 'minimal' });
    if (insertError) {
      console.error(`Erro ao inserir em ${table}:`, insertError.message);
      return;
    }
    console.log(`Inseridos ${batch.length} registros em ${table}`);
  }
}

async function main() {
  try {
    // const tables = await getTables(); // Pode não funcionar por permissão
    const tables = await getTableNames();
    console.log('Tabelas encontradas:', tables);
    for (const table of tables) {
      await migrateTable(table);
    }
    console.log('Migração concluída!');
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

main(); 