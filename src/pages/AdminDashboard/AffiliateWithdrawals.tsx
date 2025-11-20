import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { Check, X, Eye, DollarSign, Filter } from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  amount: number;
  payment_method: string;
  payment_details: any;
  status: string;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  processed_by_name: string | null;
  admin_notes: string | null;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'completed';

export function AffiliateWithdrawals() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredWithdrawals(withdrawals);
    } else {
      setFilteredWithdrawals(withdrawals.filter(w => w.status === statusFilter));
    }
  }, [statusFilter, withdrawals]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_pending_withdrawal_requests');

      if (error) {
        console.error('[AffiliateWithdrawals] Erro ao buscar saques:', error);
        // Removido toast de erro no carregamento inicial
      } else {
        setWithdrawals(data || []);
        if (statusFilter === 'all') {
          setFilteredWithdrawals(data || []);
        } else {
          setFilteredWithdrawals((data || []).filter(w => w.status === statusFilter));
        }
      }
    } catch (err) {
      console.error('[AffiliateWithdrawals] Erro:', err);
      // Removido toast de erro no carregamento inicial
    } finally {
      setLoading(false);
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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'zelle':
        return 'Zelle';
      case 'bank_transfer':
        return 'Transferência Bancária';
      case 'stripe':
        return 'Stripe';
      case 'other':
        return 'Outro';
      default:
        return method;
    }
  };

  const handleStatusUpdate = async (withdrawalId: string, newStatus: 'approved' | 'rejected' | 'completed', shouldProcessApproval = false, notes?: string) => {
    if (!user) return;

    setProcessing(true);
    try {
      // Update withdrawal request status
      const { error: updateError } = await supabase
        .from('affiliate_withdrawal_requests')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_by: user.id,
          admin_notes: notes || adminNotes || null
        })
        .eq('id', withdrawalId);

      if (updateError) {
        console.error('[AffiliateWithdrawals] Erro ao atualizar status:', updateError);
        showToast('Erro ao atualizar status', 'error');
        return;
      }

      // If approving, process the withdrawal (mark commissions as withdrawn)
      if (newStatus === 'approved' && shouldProcessApproval) {
        try {
          const { error: processError } = await supabase
            .rpc('process_withdrawal_approval', { p_withdrawal_id: withdrawalId });

          if (processError) {
            console.error('[AffiliateWithdrawals] Erro ao processar aprovação:', processError);
            showToast('Status atualizado, mas erro ao processar comissões', 'error');
          } else {
            showToast('Saque aprovado e processado com sucesso!', 'success');
          }
        } catch (err) {
          console.error('[AffiliateWithdrawals] Erro ao processar:', err);
          showToast('Status atualizado, mas erro ao processar comissões', 'error');
        }
      } else {
        showToast(`Status atualizado para ${newStatus === 'approved' ? 'aprovado' : newStatus === 'rejected' ? 'rejeitado' : 'completo'}`, 'success');
      }

      setShowDetailModal(false);
      setShowRejectConfirm(false);
      setAdminNotes('');
      await fetchWithdrawals();
    } catch (err) {
      console.error('[AffiliateWithdrawals] Erro:', err);
      showToast('Erro ao atualizar status', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickApprove = async (withdrawal: WithdrawalRequest) => {
    if (!window.confirm(`Tem certeza que deseja aprovar o saque de ${formatCurrency(withdrawal.amount)} para ${withdrawal.affiliate_name}?`)) {
      return;
    }
    await handleStatusUpdate(withdrawal.id, 'approved', true);
  };

  const handleQuickReject = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setShowRejectConfirm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const approvedCount = withdrawals.filter(w => w.status === 'approved').length;
  const rejectedCount = withdrawals.filter(w => w.status === 'rejected').length;
  const completedCount = withdrawals.filter(w => w.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Solicitações de Saque de Afiliados</h2>
          <p className="mt-1 text-sm text-gray-600">Gerencie e processe solicitações de saque dos afiliados</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filtrar por Status:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({withdrawals.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'approved'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aprovadas ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejeitadas ({rejectedCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completas ({completedCount})
          </button>
        </div>
      </div>

      {filteredWithdrawals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {withdrawals.length === 0 
              ? 'Nenhuma solicitação de saque encontrada'
              : `Nenhuma solicitação com status "${getStatusLabel(statusFilter)}" encontrada`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Afiliado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Solicitado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{withdrawal.affiliate_name}</p>
                        <p className="text-xs text-gray-500">{withdrawal.affiliate_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {getPaymentMethodLabel(withdrawal.payment_method)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                        {getStatusLabel(withdrawal.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(withdrawal.requested_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(withdrawal)}
                              disabled={processing}
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                              title="Aprovar"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleQuickReject(withdrawal)}
                              disabled={processing}
                              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                              title="Rejeitar"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Rejeitar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setAdminNotes(withdrawal.admin_notes || '');
                            setShowDetailModal(true);
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Detalhes da Solicitação de Saque</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Affiliate Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Informações do Afiliado</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><span className="font-medium">Nome:</span> {selectedWithdrawal.affiliate_name}</p>
                  <p className="text-sm"><span className="font-medium">Email:</span> {selectedWithdrawal.affiliate_email}</p>
                </div>
              </div>

              {/* Request Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Detalhes da Solicitação</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm"><span className="font-medium">Valor:</span> {formatCurrency(selectedWithdrawal.amount)}</p>
                  <p className="text-sm"><span className="font-medium">Método:</span> {getPaymentMethodLabel(selectedWithdrawal.payment_method)}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> 
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedWithdrawal.status)}`}>
                      {getStatusLabel(selectedWithdrawal.status)}
                    </span>
                  </p>
                  <p className="text-sm"><span className="font-medium">Solicitado em:</span> {formatDate(selectedWithdrawal.requested_at)}</p>
                  {selectedWithdrawal.processed_at && (
                    <p className="text-sm"><span className="font-medium">Processado em:</span> {formatDate(selectedWithdrawal.processed_at)}</p>
                  )}
                  {selectedWithdrawal.processed_by_name && (
                    <p className="text-sm"><span className="font-medium">Processado por:</span> {selectedWithdrawal.processed_by_name}</p>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Detalhes do Pagamento</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedWithdrawal.payment_details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas do Admin
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Adicione notas sobre esta solicitação..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setAdminNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
                {selectedWithdrawal.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowRejectConfirm(true);
                      }}
                      disabled={processing}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Rejeitar</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedWithdrawal.id, 'approved', true)}
                      disabled={processing}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprovar</span>
                    </button>
                  </>
                )}
                {selectedWithdrawal.status === 'approved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedWithdrawal.id, 'completed', false)}
                    disabled={processing}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Marcar como Completo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Confirmar Rejeição</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Tem certeza que deseja rejeitar o saque de <strong>{formatCurrency(selectedWithdrawal.amount)}</strong> para <strong>{selectedWithdrawal.affiliate_name}</strong>?
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo da Rejeição (opcional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  placeholder="Adicione um motivo para a rejeição..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowRejectConfirm(false);
                  setAdminNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedWithdrawal.id, 'rejected', false, adminNotes)}
                disabled={processing}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Confirmar Rejeição</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

