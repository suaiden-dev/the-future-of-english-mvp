import React, { useState, useEffect } from 'react';
import { Document } from '../../App';
import { supabase } from '../../lib/supabase';
import { Eye, Download, Filter, Calendar } from 'lucide-react';
import { DateRange } from '../../components/DateRangeFilter';
import { DocumentDetailsModal } from './DocumentDetailsModal';

interface PaymentsTableProps {
  documents?: Document[];
  onStatusUpdate?: (documentId: string, status: Document['status']) => void;
  onViewDocument?: (document: Document) => void;
  dateRange?: DateRange;
}

interface Payment {
  id: string;
  document_id: string;
  user_id: string;
  stripe_session_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_date: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
  document_filename?: string;
}

export function PaymentsTable({ dateRange }: PaymentsTableProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [localDateRange, setLocalDateRange] = useState<DateRange>(dateRange || {
    startDate: null,
    endDate: null,
    preset: 'all'
  });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [localDateRange]);

  const handleDateRangeChange = (preset: string) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let newDateRange: DateRange;
    
    switch (preset) {
      case '7d':
        newDateRange = {
          startDate: new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000),
          endDate: now,
          preset
        };
        break;
      case '30d':
        newDateRange = {
          startDate: new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now,
          preset
        };
        break;
      case '3m':
        newDateRange = {
          startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
          endDate: now,
          preset
        };
        break;
      case '6m':
        newDateRange = {
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now,
          preset
        };
        break;
      case 'year':
        newDateRange = {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: now,
          preset
        };
        break;
      case 'all':
      default:
        newDateRange = {
          startDate: null,
          endDate: null,
          preset: 'all'
        };
    }
    
    setLocalDateRange(newDateRange);
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Carregando pagamentos...', { localDateRange });
      
      // Buscar pagamentos com informações do usuário e documento
      let query = supabase
        .from('payments')
        .select(`
          *,
          profiles!payments_user_id_fkey(email, name),
          documents!payments_document_id_fkey(filename)
        `);

      // Aplicar filtros de data se existirem
      if (localDateRange?.startDate) {
        query = query.gte('created_at', localDateRange.startDate.toISOString());
      }
      if (localDateRange?.endDate) {
        query = query.lte('created_at', localDateRange.endDate.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao carregar pagamentos:', error);
        throw error;
      }
      
      console.log('📊 Dados brutos recebidos:', data);
      
      // Mapear os dados para o formato esperado
      const mappedPayments = data?.map(payment => ({
        ...payment,
        user_email: payment.profiles?.email,
        user_name: payment.profiles?.name,
        document_filename: payment.documents?.filename
      })) || [];
      
      console.log('✅ Pagamentos mapeados:', mappedPayments);
      
      setPayments(mappedPayments);
      
    } catch (error) {
      console.error('💥 Erro ao carregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (payment: Payment) => {
    try {
      console.log('🔍 Buscando documento para payment:', payment);
      
      // Buscar o documento completo pelo ID
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', payment.document_id)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar documento:', error);
        return;
      }

      console.log('📄 Documento encontrado:', document);
      setSelectedDocument(document);
      setShowModal(true);
    } catch (error) {
      console.error('💥 Erro ao abrir documento:', error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.document_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.stripe_session_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadPaymentsReport = () => {
    const csvContent = [
      ['User Name', 'User Email', 'Document ID', 'Amount', 'Currency', 'Payment Method', 'Payment ID', 'Session ID', 'Status', 'Payment Date', 'Created At'],
      ...filteredPayments.map(payment => [
        payment.user_name || '',
        payment.user_email || '',
        payment.document_id,
        payment.amount.toString(),
        payment.currency,
        payment.payment_method || '',
        payment.id,
        payment.stripe_session_id || '',
        payment.status,
        payment.payment_date || '',
        payment.created_at
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow w-full">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Payments</h3>
            <p className="text-sm text-gray-500">Track all payment transactions</p>
          </div>
          <div className="flex items-center">
            <button
              onClick={downloadPaymentsReport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tfe-blue-500"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-2">
            <input
              type="text"
              placeholder="Search by name, email, filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm bg-white"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={localDateRange?.preset || 'all'}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="year">This year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile: Cards View */}
      <div className="block sm:hidden">
        {filteredPayments.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            {loading ? 'Loading payments...' : 'No payments found'}
          </div>
        ) : (
          <div className="space-y-3 p-3 sm:p-4">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {payment.user_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {payment.user_email || 'No email'}
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <div className="font-medium text-gray-900">${payment.amount.toFixed(2)} {payment.currency}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Document:</span>
                    <div className="font-medium text-gray-900 truncate">{payment.document_filename || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Payment Method:</span>
                    <div className="font-medium text-gray-900">
                      {payment.payment_method ? (
                        payment.payment_method === 'card' ? '💳 Card' : 
                        payment.payment_method === 'bank_transfer' ? '🏦 Bank' :
                        payment.payment_method === 'paypal' ? '📱 PayPal' :
                        payment.payment_method
                      ) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <div className="font-medium text-gray-900">
                      {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-300 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    ID: {payment.id.substring(0, 8)}...
                  </div>
                  <button
                    onClick={() => {
                      console.log('View payment details:', payment.id);
                    }}
                    className="text-tfe-blue-600 hover:text-tfe-blue-900"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden sm:block overflow-x-auto w-full">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment ID & Session
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  {loading ? 'Loading payments...' : 'No payments found'}
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.user_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.user_email || 'No email'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.document_filename || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.document_id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.currency}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.payment_method ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {payment.payment_method === 'card' ? '💳 Credit Card' : 
                           payment.payment_method === 'bank_transfer' ? '🏦 Bank Transfer' :
                           payment.payment_method === 'paypal' ? '📱 PayPal' :
                           payment.payment_method}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.id.substring(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.stripe_session_id ? `${payment.stripe_session_id.substring(0, 20)}...` : 'No session ID'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDocument(payment)}
                      className="text-tfe-blue-600 hover:text-tfe-blue-900 flex items-center gap-1"
                      title="View document details"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredPayments.length > 0 && (
        <div className="px-3 sm:px-4 lg:px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
            <span>Showing {filteredPayments.length} of {payments.length} payments</span>
            <span className="font-medium text-green-600">Total: ${filteredPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Documento */}
      {showModal && selectedDocument && (
        <DocumentDetailsModal 
          document={selectedDocument}
          onClose={() => {
            setShowModal(false);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
}
