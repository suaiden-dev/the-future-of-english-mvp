// PostgreSQL integration via API calls (browser-compatible)
// Since pg library cannot run in the browser, we use HTTP requests

export interface ZellePaymentHistory {
  id?: string;
  payment_id: string;
  user_id: string;
  zelle_confirmation_code: string;
  amount: number;
  user_name: string;
  user_email: string;
  document_filename?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class PostgreSQLService {
  private static readonly API_BASE_URL = 'https://nwh.thefutureofenglish.com/api';

  /**
   * Insere um registro na tabela zelle_payment_history via API
   */
  static async insertZellePaymentHistory(data: ZellePaymentHistory): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/zelle-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: data.payment_id,
          user_id: data.user_id,
          zelle_confirmation_code: data.zelle_confirmation_code,
          amount: data.amount,
          user_name: data.user_name,
          user_email: data.user_email,
          document_filename: data.document_filename || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Zelle payment history successfully sent to PostgreSQL API:', result);
    } catch (error) {
      console.error('❌ Error sending Zelle payment history to API:', error);
      throw new Error(`Failed to insert Zelle payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Testa a conexão com a API PostgreSQL
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PostgreSQL API connection successful:', result);
        return true;
      } else {
        console.error('❌ PostgreSQL API connection failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ PostgreSQL API connection error:', error);
      return false;
    }
  }

  /**
   * Cria a tabela zelle_payment_history via API se ela não existir
   */
  static async createTableIfNotExists(): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/setup-zelle-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Zelle table setup completed via API:', result);
    } catch (error) {
      console.error('❌ Error setting up Zelle table via API:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de pagamentos Zelle via API
   */
  static async getPaymentHistory(paymentId?: string, userId?: string): Promise<ZellePaymentHistory[]> {
    try {
      const params = new URLSearchParams();
      if (paymentId) params.append('payment_id', paymentId);
      if (userId) params.append('user_id', userId);

      const response = await fetch(`${this.API_BASE_URL}/zelle-history?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching Zelle payment history:', error);
      return [];
    }
  }
}

export default PostgreSQLService;
