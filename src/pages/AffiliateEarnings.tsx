import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { DollarSign, Clock, Calendar, Plus, X, ArrowLeft } from 'lucide-react';

interface BalanceInfo {
  available_balance: number;
  pending_balance: number;
  next_withdrawal_date: string | null;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  payment_method: string;
  payment_details: any;
  status: string;
  requested_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

export function AffiliateEarnings() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'commissions' | 'withdrawals'>('commissions');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    payment_method: 'zelle' as 'zelle' | 'bank_transfer' | 'stripe' | 'other',
    payment_details: {} as any
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        navigate('/affiliates/login');
        return;
      }

      try {
        // Get affiliate data
        const { data: affiliateData, error: affiliateError } = await supabase
          .rpc('get_user_affiliate_data', { p_user_id: user.id });

        if (affiliateError || !affiliateData || affiliateData.length === 0) {
          console.error('[AffiliateEarnings] Erro ao buscar dados:', affiliateError);
          navigate('/affiliates/dashboard');
          return;
        }

        const affiliate = affiliateData[0];
        setAffiliateId(affiliate.id);

        // Fetch balance and commissions
        await Promise.all([
          fetchBalance(affiliate.id),
          fetchCommissions(affiliate.id),
          fetchWithdrawalRequests(affiliate.id)
        ]);
      } catch (err) {
        console.error('[AffiliateEarnings] Erro:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const fetchBalance = async (affId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_affiliate_available_balance', { p_affiliate_id: affId });

      if (error) {
        console.error('[AffiliateEarnings] Erro ao buscar saldo:', error);
      } else if (data && data.length > 0) {
        setBalanceInfo(data[0]);
      }
    } catch (err) {
      console.error('[AffiliateEarnings] Erro ao buscar saldo:', err);
    }
  };

  const fetchCommissions = async (affId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_affiliate_referrals', { p_affiliate_id: affId });

      if (error) {
        console.error('[AffiliateEarnings] Erro ao buscar comissões:', error);
      } else {
        setCommissions(data || []);
      }
    } catch (err) {
      console.error('[AffiliateEarnings] Erro ao buscar comissões:', err);
    }
  };

  const fetchWithdrawalRequests = async (affId: string) => {
    try {
      const { data, error } = await supabase
        .from('affiliate_withdrawal_requests')
        .select('*')
        .eq('affiliate_id', affId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('[AffiliateEarnings] Erro ao buscar saques:', error);
      } else {
        setWithdrawalRequests(data || []);
      }
    } catch (err) {
      console.error('[AffiliateEarnings] Erro ao buscar saques:', err);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!affiliateId || !balanceInfo) return;

    const amount = parseFloat(withdrawalForm.amount);
    
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (amount > balanceInfo.available_balance) {
      return;
    }

    // Validate payment details based on method
    const paymentDetails: any = {};
    
    if (withdrawalForm.payment_method === 'zelle') {
      if (!withdrawalForm.payment_details.email && !withdrawalForm.payment_details.phone) {
        return;
      }
      paymentDetails.email = withdrawalForm.payment_details.email || '';
      paymentDetails.phone = withdrawalForm.payment_details.phone || '';
    } else if (withdrawalForm.payment_method === 'bank_transfer') {
      if (!withdrawalForm.payment_details.bank || !withdrawalForm.payment_details.account_holder || 
          !withdrawalForm.payment_details.account_number || !withdrawalForm.payment_details.routing_number) {
        return;
      }
      paymentDetails.bank = withdrawalForm.payment_details.bank;
      paymentDetails.account_holder = withdrawalForm.payment_details.account_holder;
      paymentDetails.account_number = withdrawalForm.payment_details.account_number;
      paymentDetails.routing_number = withdrawalForm.payment_details.routing_number;
    } else if (withdrawalForm.payment_method === 'stripe') {
      if (!withdrawalForm.payment_details.email) {
        return;
      }
      paymentDetails.email = withdrawalForm.payment_details.email;
    } else if (withdrawalForm.payment_method === 'other') {
      if (!withdrawalForm.payment_details.description) {
        return;
      }
      paymentDetails.description = withdrawalForm.payment_details.description;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .rpc('create_withdrawal_request', {
          p_affiliate_id: affiliateId,
          p_amount: amount,
          p_payment_method: withdrawalForm.payment_method,
          p_payment_details: paymentDetails
        });

      if (error) {
        console.error('[AffiliateEarnings] Erro ao criar solicitação:', error);
      } else {
        setShowWithdrawalModal(false);
        setWithdrawalForm({
          amount: '',
          payment_method: 'zelle',
          payment_details: {}
        });
        await fetchWithdrawalRequests(affiliateId);
        await fetchBalance(affiliateId);
      }
    } catch (err: any) {
      console.error('[AffiliateEarnings] Erro:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'completed':
        return 'Completo';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/affiliates/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="Voltar ao Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Ganhos e Saques</h1>
                <p className="text-xs text-gray-500">Gerencie suas comissões e solicite saques</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 hidden sm:inline">{user?.user_metadata?.name || user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Saldo Disponível</p>
            <p className="text-3xl font-bold text-gray-900">
              {balanceInfo ? formatCurrency(balanceInfo.available_balance) : '$0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-2">Pronto para saque</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Saldo Pendente</p>
            <p className="text-3xl font-bold text-gray-900">
              {balanceInfo ? formatCurrency(balanceInfo.pending_balance) : '$0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-2">Em período de carência</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Próxima Liberação</p>
            <p className="text-lg font-semibold text-gray-900">
              {balanceInfo?.next_withdrawal_date
                ? formatDate(balanceInfo.next_withdrawal_date)
                : 'N/A'}
            </p>
            <p className="text-xs text-gray-400 mt-2">Data da próxima comissão</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('commissions')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'commissions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Comissões
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'withdrawals'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Saques
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'commissions' ? (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Histórico de Comissões</h3>
                </div>
                {commissions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma comissão encontrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuário</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Disponível em</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {commissions.map((commission) => (
                          <tr key={commission.id}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {commission.user_name || 'Usuário desconhecido'}
                                </p>
                                <p className="text-xs text-gray-500">{commission.user_email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(commission.commission_amount || 0)}
                              </p>
                              {commission.withdrawn_amount > 0 && (
                                <p className="text-xs text-gray-500">
                                  Sacado: {formatCurrency(commission.withdrawn_amount)}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                commission.status === 'converted' ? 'bg-green-100 text-green-800' :
                                commission.status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {commission.status === 'converted' ? 'Confirmada' :
                                 commission.status === 'withdrawn' ? 'Sacada' :
                                 commission.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(commission.created_at)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {commission.available_for_withdrawal_at
                                ? formatDate(commission.available_for_withdrawal_at)
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Histórico de Saques</h3>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    disabled={!balanceInfo || balanceInfo.available_balance <= 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Solicitar Saque</span>
                  </button>
                </div>
                {withdrawalRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum saque solicitado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Método</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Solicitado em</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {withdrawalRequests.map((request) => (
                          <tr key={request.id}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(request.amount)}
                              </p>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-600 capitalize">
                                {request.payment_method === 'bank_transfer' ? 'Transferência Bancária' :
                                 request.payment_method === 'zelle' ? 'Zelle' :
                                 request.payment_method}
                              </p>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                {getStatusLabel(request.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(request.requested_at)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {request.admin_notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Solicitar Saque</h2>
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor do Saque
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={balanceInfo?.available_balance || 0}
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Disponível: {balanceInfo ? formatCurrency(balanceInfo.available_balance) : '$0.00'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pagamento
                </label>
                <select
                  value={withdrawalForm.payment_method}
                  onChange={(e) => setWithdrawalForm({ 
                    ...withdrawalForm, 
                    payment_method: e.target.value as any,
                    payment_details: {}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="zelle">Zelle</option>
                  <option value="bank_transfer">Transferência Bancária</option>
                  <option value="stripe">Stripe</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              {/* Payment Details */}
              {withdrawalForm.payment_method === 'zelle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email do Zelle
                    </label>
                    <input
                      type="email"
                      value={withdrawalForm.payment_details.email || ''}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        payment_details: { ...withdrawalForm.payment_details, email: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone do Zelle (opcional)
                    </label>
                    <input
                      type="tel"
                      value={withdrawalForm.payment_details.phone || ''}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        payment_details: { ...withdrawalForm.payment_details, phone: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {withdrawalForm.payment_method === 'bank_transfer' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banco
                    </label>
                    <input
                      type="text"
                      value={withdrawalForm.payment_details.bank || ''}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        payment_details: { ...withdrawalForm.payment_details, bank: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titular da Conta
                    </label>
                    <input
                      type="text"
                      value={withdrawalForm.payment_details.account_holder || ''}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        payment_details: { ...withdrawalForm.payment_details, account_holder: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número da Conta
                    </label>
                    <input
                      type="text"
                      value={withdrawalForm.payment_details.account_number || ''}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        payment_details: { ...withdrawalForm.payment_details, account_number: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Routing Number
                    </label>
                    <input
                      type="text"
                      value={withdrawalForm.payment_details.routing_number || ''}
                      onChange={(e) => setWithdrawalForm({
                        ...withdrawalForm,
                        payment_details: { ...withdrawalForm.payment_details, routing_number: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              )}

              {withdrawalForm.payment_method === 'stripe' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email do Stripe
                  </label>
                  <input
                    type="email"
                    value={withdrawalForm.payment_details.email || ''}
                    onChange={(e) => setWithdrawalForm({
                      ...withdrawalForm,
                      payment_details: { ...withdrawalForm.payment_details, email: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {withdrawalForm.payment_method === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detalhes do Método de Pagamento
                  </label>
                  <textarea
                    value={withdrawalForm.payment_details.description || ''}
                    onChange={(e) => setWithdrawalForm({
                      ...withdrawalForm,
                      payment_details: { ...withdrawalForm.payment_details, description: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    required
                  />
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Enviando...' : 'Solicitar Saque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

