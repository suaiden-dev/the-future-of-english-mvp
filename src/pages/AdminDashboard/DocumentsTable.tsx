import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Eye, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Document } from '../../App';

// Interface estendida para incluir dados de tabelas relacionadas
interface ExtendedDocument extends Omit<Document, 'client_name' | 'payment_method'> {
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  document_type?: 'regular' | 'verified';
  authenticated_by_name?: string;
  authenticated_by_email?: string;
  authentication_date?: string;
  source_language?: string;
  target_language?: string;
  payment_method?: string | null;
  payment_status?: string | null;
  client_name?: string | null;
}

// Propriedades do componente
interface DocumentsTableProps {
  documents: Document[]; // Mantido para conformidade, embora os dados sejam buscados internamente
  onViewDocument: (document: Document) => void;
}

export function DocumentsTable({ onViewDocument }: DocumentsTableProps) {
  const [extendedDocuments, setExtendedDocuments] = useState<ExtendedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Função para buscar e combinar dados de ambas as tabelas de documentos
  const loadExtendedDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar documentos da tabela principal com perfis de usuário
      const { data: mainDocuments, error: mainError } = await supabase
        .from('documents')
        .select('*, profiles:profiles!documents_user_id_fkey(name, email, phone)')
        .order('created_at', { ascending: false });

      if (mainError) {
        console.error('Error loading documents:', mainError);
      }

      // Buscar documentos da tabela documents_to_be_verified
      const { data: verifiedDocuments, error: verifiedError } = await supabase
        .from('documents_to_be_verified')
        .select('*, profiles:profiles!documents_to_be_verified_user_id_fkey(name, email, phone)')
        .order('created_at', { ascending: false });

      if (verifiedError) {
        console.error('Error loading verified documents:', verifiedError);
      }

      // Buscar dados de pagamentos para obter payment_method e status
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('document_id, payment_method, status, amount, currency, created_at');

      if (paymentsError) {
        console.error('Error loading payments data:', paymentsError);
      }

      // Usar a mesma lógica da StatsCards: priorizar documents_to_be_verified
      const documentsWithCorrectStatus = mainDocuments?.map(doc => {
        const verifiedDoc = verifiedDocuments?.find(vDoc => vDoc.filename === doc.filename);
        const paymentInfo = paymentsData?.find(payment => payment.document_id === doc.id);
        
        // Debug log para verificar client_name
        if (verifiedDoc?.client_name) {
          console.log(`[DocumentsTable] Cliente encontrado: ${verifiedDoc.client_name} para arquivo: ${doc.filename}`, { verifiedDoc });
        }
        
        // Se existe em documents_to_be_verified, usar dados de lá
        if (verifiedDoc) {
          return {
            ...doc,
            status: verifiedDoc.status,
            user_name: verifiedDoc.profiles?.name || doc.profiles?.name || null,
            user_email: verifiedDoc.profiles?.email || doc.profiles?.email || null,
            user_phone: verifiedDoc.profiles?.phone || doc.profiles?.phone || null,
            document_type: 'verified' as const,
            authenticated_by_name: verifiedDoc.authenticated_by_name,
            authenticated_by_email: verifiedDoc.authenticated_by_email,
            authentication_date: verifiedDoc.authentication_date,
            source_language: verifiedDoc.source_language,
            target_language: verifiedDoc.target_language,
            payment_method: paymentInfo?.payment_method || doc.payment_method || null,
            payment_status: paymentInfo?.status || (verifiedDoc.authenticated_by_name ? 'completed' : null),
            client_name: verifiedDoc.client_name || doc.client_name || null,
          };
        } else {
          // Se não existe em documents_to_be_verified, usar dados originais
          return {
            ...doc,
            user_name: doc.profiles?.name || null,
            user_email: doc.profiles?.email || null,
            user_phone: doc.profiles?.phone || null,
            document_type: 'regular' as const,
            payment_method: paymentInfo?.payment_method || doc.payment_method || null,
            payment_status: paymentInfo?.status || null,
            client_name: doc.client_name || null,
          };
        }
      }) || [];

      setExtendedDocuments(documentsWithCorrectStatus);

    } catch (error) {
      console.error('Error loading extended documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExtendedDocuments();
  }, [loadExtendedDocuments]);

  // Aplica os filtros de busca, status e data
  const filteredDocuments = useMemo(() => {
    return extendedDocuments.filter(doc => {
      // Filtro de busca textual
      const matchesSearch = searchTerm === '' ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_id.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

      // Filtro de data
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const docDate = new Date(doc.created_at || '');
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateFilter) {
          case '7d':
            matchesDate = docDate >= new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            matchesDate = docDate >= new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '3m':
            matchesDate = docDate >= new Date(startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '6m':
            matchesDate = docDate >= new Date(startOfToday.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            matchesDate = docDate.getFullYear() === now.getFullYear();
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [extendedDocuments, searchTerm, statusFilter, dateFilter]);

  // Define a cor de fundo e texto com base no status de pagamento
  const getPaymentStatusColor = (paymentStatus: string | null | undefined) => {
    switch (paymentStatus) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_verification': return 'bg-orange-100 text-orange-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Formata o texto do status de pagamento
  const getPaymentStatusText = (paymentStatus: string | null | undefined) => {
    switch (paymentStatus) {
      case 'completed': return 'Paid';
      case 'pending': return 'Pending';
      case 'pending_verification': return 'Pending Verification';
      case 'failed': return 'Failed';
      case 'refunded': return 'Refunded';
      default: return 'Unknown';
    }
  };

  // Define a cor de fundo e texto com base no status do documento
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending_manual_review': return 'bg-orange-100 text-orange-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Gera e inicia o download de um relatório CSV dos documentos filtrados
  const downloadDocumentsReport = useCallback(() => {
    const csvContent = [
      ['Document Name', 'User Name', 'User Email', 'Document Type', 'Status', 'Pages', 'Cost', 'Source Language', 'Target Language', 'Authenticator', 'Created At'],
      ...filteredDocuments.map(doc => [
        doc.filename,
        doc.user_name || '',
        doc.user_email || '',
        doc.document_type || 'regular',
        doc.status || 'pending',
        doc.pages?.toString() || 'N/A',
        doc.total_cost?.toFixed(2) || '0.00',
        doc.source_language || '',
        doc.target_language || '',
        doc.authenticated_by_name || '',
        new Date(doc.created_at || '').toLocaleDateString()
      ])
    ].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [filteredDocuments]);

  // Renderiza um esqueleto de carregamento enquanto os dados são buscados
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow w-full p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow w-full">
      {/* Cabeçalho */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium text-gray-900">All Documents</h3>
            <p className="text-sm text-gray-500">
              Showing {filteredDocuments.length} of {extendedDocuments.length} documents
            </p>
          </div>
          <button
            onClick={downloadDocumentsReport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tfe-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search by name, email, filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
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

      {/* Conteúdo: Tabela para Desktop e Cartões para Mobile */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-8 px-4">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-base font-medium text-gray-700">No documents found</p>
          <p className="text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <>
          {/* Mobile: Cards View */}
          <div className="sm:hidden px-3 py-2 space-y-2">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {doc.authenticated_by_name && doc.client_name && doc.client_name !== 'Cliente Padrão'
                        ? `${doc.client_name} (${doc.authenticated_by_name})`
                        : doc.user_name || doc.user_email || 'Unknown user'
                      }
                    </p>
                  </div>
                  <span className={`ml-2 flex-shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(doc.status || 'pending')}`}>
                    {doc.status || 'pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <p className="font-medium text-gray-900">${doc.total_cost?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Payment Method:</span>
                    <p className="font-medium text-gray-900 truncate">
                      {doc.payment_method ? (
                        doc.payment_method === 'card' ? '💳 Card' :
                          doc.payment_method === 'stripe' ? '💳 Stripe' :
                          doc.payment_method === 'bank_transfer' ? '🏦 Bank' :
                            doc.payment_method === 'paypal' ? '📱 PayPal' :
                              doc.payment_method === 'zelle' ? '💰 Zelle' :
                                doc.payment_method === 'upload' ? '📋 Upload' :
                                  doc.payment_method
                      ) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Translation:</span>
                    <p className="font-medium text-gray-900">
                      {doc.status || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Authenticator:</span>
                    <p className="font-medium text-gray-900 truncate">
                      {doc.authenticated_by_name || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-xs text-gray-500">{new Date(doc.created_at || '').toLocaleDateString('pt-BR')}</p>
                  <button onClick={() => onViewDocument(doc as Document)} className="text-blue-600 hover:text-blue-900">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    USER/CLIENT
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Document
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Payment Method
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Payment Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    TRANSLATIONS
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    AUTHENTICATOR
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    {/* USER/CLIENT */}
                    <td className="px-3 py-3 text-xs">
                      <div>
                        <div className="font-medium text-gray-900 truncate">
                          {doc.authenticated_by_name && doc.client_name && doc.client_name !== 'Cliente Padrão'
                            ? `${doc.client_name} (${doc.authenticated_by_name})`
                            : doc.user_name || 'N/A'
                          }
                        </div>
                        <div className="text-gray-500 truncate">
                          {doc.user_email || 'No email'}
                        </div>
                      </div>
                    </td>
                    
                    {/* Document */}
                    <td className="px-3 py-3 text-xs">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {doc.filename}
                          </div>
                          <div className="text-gray-500">
                            {doc.pages} páginas
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Amount */}
                    <td className="px-3 py-3 text-xs font-medium text-gray-900">
                      ${doc.total_cost?.toFixed(2) || '0.00'}
                    </td>
                    
                    {/* Payment Method */}
                    <td className="px-3 py-3 text-xs">
                      {doc.payment_method ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {doc.payment_method === 'card' ? '💳 Card' :
                            doc.payment_method === 'stripe' ? '💳 Stripe' :
                            doc.payment_method === 'bank_transfer' ? '🏦 Bank' :
                            doc.payment_method === 'paypal' ? '📱 PayPal' :
                            doc.payment_method === 'zelle' ? '💰 Zelle' :
                            doc.payment_method === 'upload' ? '📋 Upload' :
                              doc.payment_method}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    
                    {/* Payment Status */}
                    <td className="px-3 py-3 text-xs">
                      <span className={`inline-flex px-2 py-1 font-medium rounded-full ${getPaymentStatusColor(doc.payment_status)}`}>
                        {getPaymentStatusText(doc.payment_status)}
                      </span>
                    </td>
                    
                    {/* TRANSLATIONS */}
                    <td className="px-3 py-3 text-xs">
                      <span className={`inline-flex px-2 py-1 font-semibold rounded-full ${getStatusColor(doc.status || 'pending')}`}>
                        {doc.status || 'N/A'}
                      </span>
                    </td>
                    
                    {/* AUTHENTICATOR */}
                    <td className="px-3 py-3 text-xs">
                      <div className="truncate">
                        <div className="font-medium text-gray-900">
                          {doc.authenticated_by_name || 'N/A'}
                        </div>
                        <div className="text-gray-500 truncate">
                          {doc.authenticated_by_email || 'No authenticator'}
                        </div>
                      </div>
                    </td>
                    
                    {/* Date */}
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {new Date(doc.created_at || '').toLocaleDateString('pt-BR')}
                    </td>
                    
                    {/* Details */}
                    <td className="px-3 py-3 text-xs text-right">
                      <button
                        onClick={() => onViewDocument(doc as Document)}
                        className="text-blue-600 hover:text-blue-900 font-medium p-1"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}