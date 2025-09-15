import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, DollarSign, User, Calendar, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ZellePayment {
  id: string;
  amount: number;
  status: string;
  zelle_confirmation_code: string;
  created_at: string;
  zelle_verified_at?: string;
  user_id: string;
  document_id: string;
  // Informações do usuário
  user_name?: string;
  user_email?: string;
  // Informações do documento
  document_filename?: string;
  document_pages?: number;
}

export function ZellePaymentVerification() {
  const [zellePayments, setZellePayments] = useState<ZellePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchZellePayments();
  }, []);

  const fetchZellePayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles!inner(name, email),
          documents!inner(filename, pages)
        `)
        .eq('payment_method', 'zelle')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPayments = data.map(payment => ({
        ...payment,
        user_name: payment.profiles?.name || 'Unknown',
        user_email: payment.profiles?.email || 'Unknown',
        document_filename: payment.documents?.filename || 'Unknown',
        document_pages: payment.documents?.pages || 0
      }));

      setZellePayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching Zelle payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string) => {
    setVerifying(paymentId);
    
    try {
      // Obter sessão do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      // Atualizar o pagamento como verificado
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          zelle_verified_at: new Date().toISOString(),
          zelle_verified_by: session.user.id
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Atualizar o documento para começar o processamento
      const payment = zellePayments.find(p => p.id === paymentId);
      if (payment) {
        const { error: docError } = await supabase
          .from('documents')
          .update({ status: 'processing' })
          .eq('id', payment.document_id);

        if (docError) throw docError;
      }

      // Atualizar a lista
      await fetchZellePayments();

    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Error verifying payment. Please try again.');
    } finally {
      setVerifying(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center mb-6">
        <DollarSign className="w-6 h-6 text-green-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">
          Zelle Payment Verification
        </h2>
        <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
          {zellePayments.filter(p => p.status === 'pending_verification').length} Pending
        </span>
      </div>

      {zellePayments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p>No Zelle payments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {zellePayments.map((payment) => (
            <div
              key={payment.id}
              className={`border rounded-lg p-4 ${
                payment.status === 'pending_verification' 
                  ? 'border-yellow-200 bg-yellow-50/50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1 capitalize">{payment.status.replace('_', ' ')}</span>
                    </div>
                    <span className="ml-3 text-lg font-bold text-gray-900">
                      ${payment.amount}.00
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <div>
                        <p className="font-medium">{payment.user_name}</p>
                        <p>{payment.user_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      <div>
                        <p className="font-medium">{payment.document_filename}</p>
                        <p>{payment.document_pages} page{payment.document_pages !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <div>
                        <p className="font-medium">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                        <p>
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded p-3 mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Zelle Confirmation Code:
                    </p>
                    <p className="font-mono text-base text-gray-900">
                      {payment.zelle_confirmation_code}
                    </p>
                  </div>

                  {payment.zelle_verified_at && (
                    <div className="text-sm text-green-600">
                      ✅ Verified on {new Date(payment.zelle_verified_at).toLocaleString()}
                    </div>
                  )}
                </div>

                {payment.status === 'pending_verification' && (
                  <div className="ml-4">
                    <button
                      onClick={() => handleVerifyPayment(payment.id)}
                      disabled={verifying === payment.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifying === payment.id ? 'Verifying...' : 'Verify Payment'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
