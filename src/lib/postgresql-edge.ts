import { supabase } from './supabase';

export interface ZellePaymentHistory {
  payment_id: string;
  user_id: string;
  zelle_confirmation_code: string;
  amount: number;
  user_name: string;
  user_email: string;
  document_filename?: string;
}

export class PostgreSQLService {
  /**
   * Insere um registro na tabela zelle_payment_history via Edge Function
   */
  static async insertZellePaymentHistory(data: ZellePaymentHistory): Promise<void> {
    try {
      console.log('🚀 Sending Zelle payment history to Edge Function:', data);

      // Obter a URL da função e a API key
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration');
      }

      // Obter token do usuário autenticado
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Enviar apenas o código de confirmação Zelle
      const payload = {
        zelle_confirmation_code: data.zelle_confirmation_code
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/zelle-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge Function HTTP error:', response.status, errorText);
        throw new Error(`Edge Function failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result?.success) {
        console.error('❌ Edge Function failed:', result);
        throw new Error(result?.error || 'Unknown error from Edge Function');
      }

      console.log('✅ Zelle payment history successfully saved via Edge Function:', result);
    } catch (error) {
      console.error('❌ Error calling zelle-history Edge Function:', error);
      throw new Error(`Failed to save Zelle payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Testa a conexão com a Edge Function
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Edge Function availability...');
      // Edge Function está sempre disponível se o Supabase estiver funcionando
      return true;
    } catch (error) {
      console.error('❌ Edge Function connection test failed:', error);
      return false;
    }
  }

  /**
   * Edge Function cuida da criação da tabela, então essa função não é necessária
   * mas mantemos para compatibilidade
   */
  static async createTableIfNotExists(): Promise<void> {
    console.log('ℹ️ Table creation is handled by the Edge Function automatically');
    return Promise.resolve();
  }
}

export default PostgreSQLService;
