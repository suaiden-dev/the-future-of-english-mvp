import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Pool } from "npm:pg@^8.11.3";

// Configuração do PostgreSQL externo
const POSTGRES_CONFIG = {
  host: "212.1.213.163",
  port: 5432,
  user: "postgres",
  password: "61cedf22a8e02d92aefb3025997cc3d2",
  database: "n8n_utility",
  ssl: false
};

// Pool de conexões (singleton)
let pool: any = null;
function getPool() {
  if (!pool) {
    pool = new Pool(POSTGRES_CONFIG);
    console.log('✅ [ZelleHistory] Pool PostgreSQL inicializado');
  }
  return pool;
}

interface ZelleHistoryRequest {
  zelle_confirmation_code: string;
}

Deno.serve(async (req: Request) => {
  console.log('🚀 Zelle History Edge Function called');
  console.log('Method:', req.method);
  
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const data: ZelleHistoryRequest = await req.json();
    console.log('🔍 [ZelleHistory] Dados recebidos:', data);

    // Validar dados obrigatórios
    if (!data.zelle_confirmation_code) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: zelle_confirmation_code' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await insertZelleCode(data.zelle_confirmation_code);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ [ZelleHistory] Erro geral:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Insere um código Zelle na tabela do PostgreSQL externo
 */
async function insertZelleCode(confirmationCode: string) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // Primeiro vamos verificar a estrutura da tabela
    const tableStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'zelle_payment_history' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 [ZelleHistory] Estrutura da tabela:', tableStructure.rows);
    
    // Baseado na estrutura, vamos tentar com o nome de coluna correto
    const query = `
      INSERT INTO public.zelle_payment_history 
      (confirmation_code, created_at)
      VALUES ($1, NOW())
      RETURNING *
    `;
    
    const values = [confirmationCode];
    
    console.log('🔍 [ZelleHistory] Executando INSERT:', query);
    console.log('🔍 [ZelleHistory] Valores:', values);
    
    const result = await client.query(query, values);
    
    console.log('✅ [ZelleHistory] Código Zelle inserido com sucesso:', result.rows[0]);
    
    return {
      success: true,
      data: result.rows[0]
    };
    
  } catch (error) {
    console.error('❌ [ZelleHistory] Erro ao inserir código Zelle:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
    
  } finally {
    client.release();
  }
}
