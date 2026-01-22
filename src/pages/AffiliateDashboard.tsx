import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { DollarSign, Clock, Calendar, Plus, X } from 'lucide-react';

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

export function AffiliateDashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Earnings & Withdrawals state
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [activeEarningsTab, setActiveEarningsTab] = useState<'commissions' | 'withdrawals'>('commissions');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    payment_method: 'zelle' as 'zelle' | 'bank_transfer' | 'stripe' | 'other',
    payment_details: {} as any
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    const fetchAffiliateData = async () => {
      if (!user) {
        navigate('/affiliates/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_user_affiliate_data', { p_user_id: user.id });

        if (error || !data || data.length === 0) {
          console.error('[AffiliateDashboard] Erro ao buscar dados ou usuário não é afiliado:', error);
          navigate('/translations#affiliates');
          return;
        }

        setAffiliateData(data[0]);
        
        if (data[0]?.id) {
          await Promise.all([
            fetchReferrals(data[0].id),
            fetchStats(data[0].id),
            fetchBalance(data[0].id),
            fetchCommissions(data[0].id),
            fetchWithdrawalRequests(data[0].id)
          ]);
        }
      } catch (err) {
        console.error('[AffiliateDashboard] Erro inesperado:', err);
        navigate('/translations#affiliates');
      } finally {
        setLoading(false);
      }
    };

    fetchAffiliateData();
  }, [user, navigate]);

    const fetchReferrals = async (affiliateId: string) => {
      try {
        const { data: referralsData, error: referralsError } = await supabase
          .rpc('get_affiliate_referrals', { p_affiliate_id: affiliateId });

        if (referralsError) {
          console.error('[AffiliateDashboard] Erro ao buscar referências:', referralsError);
        } else {
          setReferrals(referralsData || []);
        }
      } catch (err) {
        console.error('[AffiliateDashboard] Erro ao buscar referências:', err);
      }
    };

    const fetchStats = async (affiliateId: string) => {
      try {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_affiliate_stats', { p_affiliate_id: affiliateId });

        if (statsError) {
          console.error('[AffiliateDashboard] Erro ao buscar estatísticas:', statsError);
        } else {
          setStats(statsData && statsData.length > 0 ? statsData[0] : null);
        }
      } catch (err) {
        console.error('[AffiliateDashboard] Erro ao buscar estatísticas:', err);
      }
    };

  const fetchBalance = async (affId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_affiliate_available_balance', { p_affiliate_id: affId });

      if (error) {
        console.error('[AffiliateDashboard] Erro ao buscar saldo:', error);
      } else if (data && data.length > 0) {
        setBalanceInfo(data[0]);
      }
    } catch (err) {
      console.error('[AffiliateDashboard] Erro ao buscar saldo:', err);
    }
  };

  const fetchCommissions = async (affId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_affiliate_referrals', { p_affiliate_id: affId });

      if (error) {
        console.error('[AffiliateDashboard] Erro ao buscar comissões:', error);
      } else {
        setCommissions(data || []);
      }
    } catch (err) {
      console.error('[AffiliateDashboard] Erro ao buscar comissões:', err);
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
        console.error('[AffiliateDashboard] Erro ao buscar saques:', error);
      } else {
        setWithdrawalRequests(data || []);
      }
    } catch (err) {
      console.error('[AffiliateDashboard] Erro ao buscar saques:', err);
    }
  };

  const handleCopyCode = () => {
    if (affiliateData?.referral_code) {
      navigator.clipboard.writeText(affiliateData.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (affiliateData?.referral_code) {
      const link = `${window.location.origin}?ref=${affiliateData.referral_code}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
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

  const handleLogout = async () => {
    await signOut();
    navigate('/translations#affiliates');
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    
    if (!affiliateData?.id || !balanceInfo) {
      setFormError('Erro ao carregar dados. Por favor, recarregue a página.');
      return;
    }

    const amount = parseFloat(withdrawalForm.amount);
    
    if (isNaN(amount) || amount <= 0) {
      setFormError('Por favor, informe um valor válido maior que zero.');
      return;
    }

    if (amount > balanceInfo.available_balance) {
      setFormError(`Saldo insuficiente. Disponível: ${formatCurrency(balanceInfo.available_balance)}`);
      return;
    }

    const paymentDetails: any = {};
    
    if (withdrawalForm.payment_method === 'zelle') {
      if (!withdrawalForm.payment_details.email && !withdrawalForm.payment_details.phone) {
        setFormError('Informe o email ou telefone do Zelle.');
        return;
      }
      paymentDetails.email = withdrawalForm.payment_details.email || '';
      paymentDetails.phone = withdrawalForm.payment_details.phone || '';
    } else if (withdrawalForm.payment_method === 'bank_transfer') {
      if (!withdrawalForm.payment_details.bank || !withdrawalForm.payment_details.account_holder || 
          !withdrawalForm.payment_details.account_number || !withdrawalForm.payment_details.routing_number) {
        setFormError('Preencha todos os dados bancários.');
        return;
      }
      paymentDetails.bank = withdrawalForm.payment_details.bank;
      paymentDetails.account_holder = withdrawalForm.payment_details.account_holder;
      paymentDetails.account_number = withdrawalForm.payment_details.account_number;
      paymentDetails.routing_number = withdrawalForm.payment_details.routing_number;
    } else if (withdrawalForm.payment_method === 'stripe') {
      if (!withdrawalForm.payment_details.email) {
        setFormError('Informe o email do Stripe.');
        return;
      }
      paymentDetails.email = withdrawalForm.payment_details.email;
    } else if (withdrawalForm.payment_method === 'other') {
      if (!withdrawalForm.payment_details.description) {
        setFormError('Informe os detalhes do método de pagamento.');
        return;
      }
      paymentDetails.description = withdrawalForm.payment_details.description;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .rpc('create_withdrawal_request', {
          p_affiliate_id: affiliateData.id,
          p_amount: amount,
          p_payment_method: withdrawalForm.payment_method,
          p_payment_details: paymentDetails
        });

      if (error) {
        console.error('[AffiliateDashboard] Erro ao criar solicitação:', error);
        setFormError(error.message || 'Erro ao criar solicitação de saque. Tente novamente.');
      } else {
        setFormSuccess(true);
        setTimeout(() => {
          setShowWithdrawalModal(false);
          setFormSuccess(false);
          setFormError(null);
          setWithdrawalForm({
            amount: '',
            payment_method: 'zelle',
            payment_details: {}
          });
          fetchWithdrawalRequests(affiliateData.id);
          fetchBalance(affiliateData.id);
        }, 1500);
      }
    } catch (err: any) {
      console.error('[AffiliateDashboard] Erro:', err);
      setFormError(err.message || 'Erro ao criar solicitação de saque. Tente novamente.');
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


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!affiliateData) {
    return null;
  }

  const referralLink = `${window.location.origin}?ref=${affiliateData.referral_code}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-12 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <i className="fas fa-share-alt text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('affiliates.dashboardTitle')}</h1>
                <p className="text-xs text-gray-500 mt-0.5">Painel de controle do afiliado</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {(user?.user_metadata?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.user_metadata?.name || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span className="hidden sm:inline">{t('navigation.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-12 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Esquerda */}
            <div className="lg:col-span-3 xl:col-span-3 space-y-6">
            {/* Card do Código de Referência */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="mb-5">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <i className="fas fa-tag text-white text-sm"></i>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{t('affiliates.yourReferralCode')}</h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{t('affiliates.referralCodeDescription')}</p>
              </div>
              
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-4 border-2 border-blue-100">
                  <p className="text-3xl font-black text-gray-900 font-mono text-center tracking-widest">
                  {affiliateData.referral_code}
                </p>
              </div>
              
              <button
                onClick={handleCopyCode}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] ${
                  copied 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700'
                }`}
              >
                {copied ? (
                  <>
                    <i className="fas fa-check-circle"></i>
                    <span>{t('affiliates.copied')}</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-copy"></i>
                    <span>{t('affiliates.copyCode')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Card do Link de Referência */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-link text-white text-sm"></i>
                  </div>
                  <label className="block text-base font-bold text-gray-900">
                {t('affiliates.referralLink')}
              </label>
                </div>
              <div className="space-y-3">
                  <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                    <i className="fas fa-link text-blue-500 text-sm"></i>
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 font-mono truncate"
                  />
                </div>
                <button
                  onClick={handleCopyLink}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] ${
                    linkCopied
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                        : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-lg shadow-gray-700/30 hover:from-gray-800 hover:to-gray-900'
                  }`}
                >
                  {linkCopied ? (
                    <>
                        <i className="fas fa-check-circle"></i>
                        <span>{t('affiliates.copied')}</span>
                    </>
                  ) : (
                    <>
                        <i className="fas fa-copy"></i>
                        <span>{t('affiliates.copyLink')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card de Ações Rápidas */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center space-x-2 mb-5">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-bolt text-white text-sm"></i>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{t('affiliates.quickActions')}</h3>
                </div>
                <div className="space-y-3">
                <button
                  onClick={() => window.open(`mailto:?subject=${encodeURIComponent(t('affiliates.shareSubject'))}&body=${encodeURIComponent(t('affiliates.shareBody', { link: referralLink }))}`)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:shadow-md group"
                >
                    <span className="text-gray-700 font-semibold group-hover:text-blue-700">{t('affiliates.shareByEmail')}</span>
                    <i className="fas fa-envelope text-gray-400 group-hover:text-blue-500"></i>
                </button>
                <button
                  onClick={() => {
                    const text = `${t('affiliates.shareText')} ${referralLink}`;
                    navigator.clipboard.writeText(text);
                  }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:shadow-md group"
                >
                    <span className="text-gray-700 font-semibold group-hover:text-blue-700">{t('affiliates.copyShareText')}</span>
                    <i className="fas fa-copy text-gray-400 group-hover:text-blue-500"></i>
                </button>
                </div>
              </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="lg:col-span-9 xl:col-span-9 space-y-6">
              {/* Balance Cards e Total Referrals - Uma única linha */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center shadow-md shadow-green-400/20">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Available Balance</p>
                  <p className="text-2xl font-black text-gray-900 mb-1">
                    {balanceInfo ? formatCurrency(balanceInfo.available_balance) : '$0.00'}
                  </p>
                  <p className="text-xs font-medium text-gray-400">Ready for withdrawal</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg flex items-center justify-center shadow-md shadow-amber-400/20">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Pending Balance</p>
                  <p className="text-2xl font-black text-gray-900 mb-1">
                    {balanceInfo ? formatCurrency(balanceInfo.pending_balance) : '$0.00'}
                  </p>
                  <p className="text-xs font-medium text-gray-400">In grace period</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-400/20">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Next Release</p>
                  <p className="text-lg font-black text-gray-900 mb-1">
                    {balanceInfo?.next_withdrawal_date
                      ? formatDate(balanceInfo.next_withdrawal_date)
                      : 'N/A'}
                  </p>
                  <p className="text-xs font-medium text-gray-400">Date of next commission</p>
                </div>

                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center shadow-md shadow-blue-400/20">
                      <i className="fas fa-users text-white text-sm"></i>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">{t('affiliates.totalReferrals')}</p>
                  <p className="text-2xl font-black text-gray-900 mb-1">{stats?.total_referrals || referrals.length || 0}</p>
                  <p className="text-xs font-medium text-gray-400">{t('affiliates.activeReferrals')}</p>
                </div>
              </div>

              {/* Informações do Programa e Conta */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center">
                      <i className="fas fa-info-circle text-white"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{t('affiliates.programInfo')}</h3>
                  </div>
                  <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                    <p className="font-medium">{t('affiliates.programDescription')}</p>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{t('affiliates.benefit1')}</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{t('affiliates.benefit2')}</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{t('affiliates.benefit3')}</span>
                      </li>
                    </ul>
                  </div>
              </div>
              
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center space-x-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-xl flex items-center justify-center">
                      <i className="fas fa-user-circle text-white"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{t('affiliates.accountInfo')}</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{t('affiliates.name')}</p>
                      <p className="text-sm font-bold text-gray-900">{affiliateData.name}</p>
                    </div>
                    <div className="pb-3 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{t('affiliates.email')}</p>
                      <p className="text-sm font-bold text-gray-900">{affiliateData.email}</p>
                    </div>
                    {affiliateData.phone && (
                      <div className="pb-3 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{t('affiliates.phone')}</p>
                        <p className="text-sm font-bold text-gray-900">{affiliateData.phone}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{t('affiliates.status')}</p>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold ${
                          affiliateData.status === 'approved' 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-200' 
                            : affiliateData.status === 'pending'
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-2 border-yellow-200'
                            : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-2 border-red-200'
                        }`}>
                          {affiliateData.status === 'approved' ? t('affiliates.statusApproved') : 
                           affiliateData.status === 'pending' ? t('affiliates.statusPending') : 
                           t('affiliates.statusRejected')}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{t('affiliates.memberSince')}</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(affiliateData.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Earnings Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                      <i className="fas fa-dollar-sign text-white"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Earnings & Withdrawals</h3>
                  </div>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    disabled={!balanceInfo || balanceInfo.available_balance <= 0}
                    className="flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Request Withdrawal</span>
                  </button>
                </div>
                
                <div className="border-b border-gray-200 bg-gray-50/50">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveEarningsTab('commissions')}
                      className={`py-4 px-8 text-sm font-bold border-b-2 transition-all duration-200 ${
                        activeEarningsTab === 'commissions'
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
                      }`}
                    >
                      Commissions
                    </button>
                    <button
                      onClick={() => setActiveEarningsTab('withdrawals')}
                      className={`py-4 px-8 text-sm font-bold border-b-2 transition-all duration-200 ${
                        activeEarningsTab === 'withdrawals'
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50'
                      }`}
                    >
                      Withdrawals
                    </button>
                  </nav>
              </div>
              
              <div className="p-6">
                  {activeEarningsTab === 'commissions' ? (
                    <div>
                      {!balanceInfo || balanceInfo.pending_balance === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-dollar-sign text-gray-400 text-2xl"></i>
                  </div>
                          <p className="text-gray-500 font-medium">No pending commissions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                <tr className="hover:bg-blue-50/50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="text-base font-black text-gray-900">
                                      {formatCurrency(balanceInfo.pending_balance || 0)}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-2 border-yellow-200">
                                      Pending
                              </span>
                            </td>
                                </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {withdrawalRequests.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-wallet text-gray-400 text-2xl"></i>
                          </div>
                          <p className="text-gray-500 font-medium">No withdrawal requests</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Requested on</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {withdrawalRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-blue-50/50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="text-base font-black text-gray-900">
                                      {formatCurrency(request.amount)}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="text-sm font-semibold text-gray-700 capitalize">
                                      {request.payment_method === 'bank_transfer' ? 'Bank Transfer' :
                                       request.payment_method === 'zelle' ? 'Zelle' :
                                       request.payment_method}
                                    </p>
                            </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold ${getStatusColor(request.status)}`}>
                                      {getStatusLabel(request.status)}
                                </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                                    {formatDate(request.requested_at)}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-600">
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
          </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Request Withdrawal</h2>
              <button
                onClick={() => {
                  setShowWithdrawalModal(false);
                  setFormError(null);
                  setFormSuccess(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{formError}</p>
                </div>
              )}

              {/* Success Message */}
              {formSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">Solicitação de saque criada com sucesso!</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount
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
                  Available: {balanceInfo ? formatCurrency(balanceInfo.available_balance) : '$0.00'}
                </p>
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
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
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="stripe">Stripe</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Payment Details */}
              {withdrawalForm.payment_method === 'zelle' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zelle Email
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
                      Zelle Phone (optional)
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
                      Bank
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
                      Account Holder
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
                      Account Number
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
                    Stripe Email
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
                    Payment Method Details
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
                  onClick={() => {
                    setShowWithdrawalModal(false);
                    setFormError(null);
                    setFormSuccess(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

