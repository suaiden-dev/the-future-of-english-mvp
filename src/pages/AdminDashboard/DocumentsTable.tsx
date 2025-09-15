import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Eye, Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Document } from '../../App';
import { DateRange } from '../../components/DateRangeFilter';
import { GoogleStyleDatePicker } from '../../components/GoogleStyleDatePicker';

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
  translation_status?: string | null; // Status de tradução da tabela translated_documents
  client_name?: string | null;
  display_name?: string | null; // Nome formatado para exibição na coluna USER/CLIENT
  user_role?: string | null; // Role do usuário para filtros
}

// Propriedades do componente
interface DocumentsTableProps {
  documents: Document[]; // Mantido para conformidade, embora os dados sejam buscados internamente
  onViewDocument: (document: Document) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange) => void;
}

export function DocumentsTable({ onViewDocument, dateRange, onDateRangeChange }: DocumentsTableProps) {
  const [extendedDocuments, setExtendedDocuments] = useState<ExtendedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Debug log para verificar mudanças no statusFilter
  useEffect(() => {
    console.log(`🔍 [Status Filter State] Current statusFilter: "${statusFilter}"`);
  }, [statusFilter]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [internalDateRange, setInternalDateRange] = useState<DateRange>(dateRange || {
    startDate: null,
    endDate: null,
    preset: 'all'
  });

  // Função para buscar e combinar dados de ambas as tabelas de documentos
  const loadExtendedDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Aplicar filtros de data se fornecidos
      let startDateParam = null;
      let endDateParam = null;
      
      if (internalDateRange?.startDate) {
        // Para data de início, usar início do dia (00:00:00)
        const startDate = new Date(internalDateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        startDateParam = startDate.toISOString();
      }
      
      if (internalDateRange?.endDate) {
        // Para data de fim, usar fim do dia (23:59:59)
        const endDate = new Date(internalDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        endDateParam = endDate.toISOString();
      }

      // Buscar documentos da tabela principal com perfis de usuário
      let mainDocumentsQuery = supabase
        .from('documents')
        .select('*, profiles:profiles!documents_user_id_fkey(name, email, phone)')
        .order('created_at', { ascending: false });

      // Aplicar filtros de data
      if (startDateParam) {
        mainDocumentsQuery = mainDocumentsQuery.gte('created_at', startDateParam);
      }
      if (endDateParam) {
        mainDocumentsQuery = mainDocumentsQuery.lte('created_at', endDateParam);
      }

      const { data: mainDocuments, error: mainError } = await mainDocumentsQuery;

      if (mainError) {
        console.error('Error loading documents:', mainError);
      }

      // Buscar documentos da tabela documents_to_be_verified
      let verifiedDocumentsQuery = supabase
        .from('documents_to_be_verified')
        .select('*, profiles:profiles!documents_to_be_verified_user_id_fkey(name, email, phone)')
        .order('created_at', { ascending: false });

      // Aplicar filtros de data
      if (startDateParam) {
        verifiedDocumentsQuery = verifiedDocumentsQuery.gte('created_at', startDateParam);
      }
      if (endDateParam) {
        verifiedDocumentsQuery = verifiedDocumentsQuery.lte('created_at', endDateParam);
      }

      const { data: verifiedDocuments, error: verifiedError } = await verifiedDocumentsQuery;

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

      // Buscar dados de traduções para obter status correto de tradução e autenticador
      const { data: translationsData, error: translationsError } = await supabase
        .from('translated_documents')
        .select(`
          original_document_id,
          status,
          authenticated_by_name,
          authenticated_by_email,
          authentication_date,
          documents_to_be_verified!inner(filename)
        `);

      if (translationsError) {
        console.error('Error loading translations data:', translationsError);
      }

      // Buscar perfis de usuários para verificar roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role');

      if (profilesError) {
        console.error('Error loading profiles data:', profilesError);
      }

      console.log('🔍 Profiles data loaded:', profilesData?.length || 0);
      console.log('🔍 Sample profiles:', profilesData?.slice(0, 5));
      console.log('🔍 Payments data loaded:', paymentsData?.length || 0);
      console.log('🔍 Sample payments:', paymentsData?.slice(0, 5));
      console.log('🔍 Translations data loaded:', translationsData?.length || 0);
      console.log('🔍 Sample translations:', translationsData?.slice(0, 5));

      // Criar lista combinada de todos os documentos
      const allDocuments = [];
      
      // Adicionar documentos da tabela documents
      if (mainDocuments) {
        allDocuments.push(...mainDocuments.map(doc => ({ ...doc, source: 'documents' })));
      }
      
      // Adicionar documentos da tabela documents_to_be_verified que não estão em documents
      if (verifiedDocuments) {
        const verifiedOnly = verifiedDocuments.filter(verifiedDoc => 
          !mainDocuments?.some(mainDoc => 
            mainDoc.filename === verifiedDoc.filename && mainDoc.user_id === verifiedDoc.user_id
          )
        );
        allDocuments.push(...verifiedOnly.map(doc => ({ ...doc, source: 'documents_to_be_verified' })));
      }
      
      // Processar todos os documentos
      const documentsWithCorrectStatus = allDocuments.map(doc => {
        const isFromVerified = doc.source === 'documents_to_be_verified';
        const verifiedDoc = isFromVerified ? doc : verifiedDocuments?.find(vDoc => vDoc.filename === doc.filename && vDoc.user_id === doc.user_id);
        
        const paymentInfo = paymentsData?.find(payment => payment.document_id === doc.id);
        
        // Buscar dados de tradução baseado no filename
        const translationInfo = translationsData?.find(translation => 
          (translation.documents_to_be_verified as any)?.filename === doc.filename
        );
        
        // Verificar se o usuário tem role 'authenticator'
        const userProfile = profilesData?.find(profile => profile.id === doc.user_id);
        const userRole = userProfile?.role || 'user'; // Default para 'user' se não encontrar
        const isAuthenticator = userRole === 'authenticator';
        
        // Se é da tabela documents_to_be_verified ou existe em documents_to_be_verified, usar dados de lá
        if (isFromVerified || verifiedDoc) {
          return {
            ...doc,
            status: verifiedDoc?.status || doc.status,
            user_name: verifiedDoc?.profiles?.name || doc.profiles?.name || null,
            user_email: verifiedDoc?.profiles?.email || doc.profiles?.email || null,
            user_phone: verifiedDoc?.profiles?.phone || doc.profiles?.phone || null,
            document_type: 'verified' as const,
            // Usar dados de tradução se disponível, senão usar dados de verificação
            authenticated_by_name: translationInfo?.authenticated_by_name || verifiedDoc?.authenticated_by_name,
            authenticated_by_email: translationInfo?.authenticated_by_email || verifiedDoc?.authenticated_by_email,
            authentication_date: translationInfo?.authentication_date || verifiedDoc?.authentication_date,
            source_language: verifiedDoc?.source_language,
            target_language: verifiedDoc?.target_language,
            // Status de tradução: primeiro translated_documents, depois documents_to_be_verified, depois 'pending'
            translation_status: translationInfo?.status || verifiedDoc?.status || 'pending',
            payment_method: paymentInfo?.payment_method || doc.payment_method || 'card',
            // Status de pagamento baseado apenas no pagamento realizado, não na autenticação
            payment_status: paymentInfo?.status || 'completed',
            client_name: verifiedDoc?.client_name || doc.client_name || null,
            // Para exibição na coluna USER/CLIENT: se for autenticador, usar client_name + (user_name)
            display_name: isAuthenticator && verifiedDoc?.client_name && verifiedDoc.client_name !== 'Cliente Padrão'
              ? `${verifiedDoc.client_name} (${verifiedDoc?.profiles?.name || doc.profiles?.name || 'N/A'})`
              : verifiedDoc?.authenticated_by_name && verifiedDoc?.client_name && verifiedDoc.client_name !== 'Cliente Padrão'
              ? `${verifiedDoc.client_name} (${verifiedDoc.authenticated_by_name})`
              : verifiedDoc?.profiles?.name || doc.profiles?.name || null,
            // Adicionar role do usuário para filtros
            user_role: userRole,
          };
        } else {
          // Se não existe em documents_to_be_verified, usar dados originais
          return {
            ...doc,
            user_name: doc.profiles?.name || null,
            user_email: doc.profiles?.email || null,
            user_phone: doc.profiles?.phone || null,
            document_type: 'regular' as const,
            // Usar dados de tradução se disponível
            authenticated_by_name: translationInfo?.authenticated_by_name || null,
            authenticated_by_email: translationInfo?.authenticated_by_email || null,
            authentication_date: translationInfo?.authentication_date || null,
            // Status de tradução: primeiro translated_documents, depois documents_to_be_verified, depois 'pending'
            translation_status: translationInfo?.status || verifiedDoc?.status || 'pending',
            payment_method: paymentInfo?.payment_method || doc.payment_method || 'card',
            // Status de pagamento baseado apenas no pagamento realizado, não na autenticação
            payment_status: paymentInfo?.status || 'completed',
            client_name: doc.client_name || null,
            // Para exibição na coluna USER/CLIENT: se for autenticador, usar client_name + (user_name)
            display_name: isAuthenticator && doc.client_name && doc.client_name !== 'Cliente Padrão'
              ? `${doc.client_name} (${doc.profiles?.name || 'N/A'})`
              : doc.profiles?.name || null,
            // Adicionar role do usuário para filtros
            user_role: userRole,
          };
        }
      });

      setExtendedDocuments(documentsWithCorrectStatus);
      
      // Debug log para verificar status dos documentos carregados
      console.log('🔍 [Load Debug] Total documents loaded:', documentsWithCorrectStatus.length);
      const statusCounts = documentsWithCorrectStatus.reduce((acc, doc) => {
        acc[doc.translation_status || 'pending'] = (acc[doc.translation_status || 'pending'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🔍 [Load Debug] Translation status distribution:', statusCounts);

    } catch (error) {
      console.error('Error loading extended documents:', error);
    } finally {
      setLoading(false);
    }
  }, [internalDateRange]);

  // Sincronizar dateRange externo com interno
  useEffect(() => {
    if (dateRange) {
      setInternalDateRange(dateRange);
    }
  }, [dateRange]);

  useEffect(() => {
    loadExtendedDocuments();
  }, [loadExtendedDocuments]);

  // Aplica os filtros de busca, status e role
  const filteredDocuments = useMemo(() => {
    console.log(`🔍 [Filter Debug] Starting filter with statusFilter: "${statusFilter}", roleFilter: "${roleFilter}", searchTerm: "${searchTerm}"`);
    console.log(`🔍 [Filter Debug] Total documents to filter: ${extendedDocuments.length}`);
    
    // Debug: mostrar todos os status únicos dos documentos (translation_status)
    const uniqueStatuses = [...new Set(extendedDocuments.map(doc => doc.translation_status))];
    console.log(`🔍 [Filter Debug] Unique translation_statuses in data:`, uniqueStatuses);
    
    const filtered = extendedDocuments.filter(doc => {
      // Filtro de busca textual
      const matchesSearch = searchTerm === '' ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.display_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status - usar translation_status (coluna TRANSLATIONS)
      const matchesStatus = statusFilter === 'all' || doc.translation_status === statusFilter;

      // Debug log para status filter
      if (statusFilter !== 'all') {
        console.log(`[Status Filter Debug] Document: ${doc.filename}, translation_status: "${doc.translation_status}", filter: "${statusFilter}", matches: ${matchesStatus}`);
        if (doc.translation_status === statusFilter) {
          console.log(`  ✅ MATCH FOUND: ${doc.filename} has translation_status "${doc.translation_status}"`);
        }
      }

      // Filtro de role - usar o role real do usuário
      let matchesRole = true;
      if (roleFilter !== 'all') {
        const userRole = doc.user_role || 'user'; // Default para 'user' se não tiver role
        
        // Debug log detalhado para todos os documentos quando filtro user está ativo
        if (roleFilter === 'user') {
          console.log(`[Role Filter Debug - USER] Document: ${doc.filename}, user_role: ${userRole}, matchesRole: ${userRole === 'user'}`);
          console.log(`  - user_name: ${doc.user_name}`);
          console.log(`  - user_email: ${doc.user_email}`);
        }
        
        if (roleFilter === 'authenticator') {
          matchesRole = userRole === 'authenticator';
        } else if (roleFilter === 'user') {
          matchesRole = userRole === 'user';
        }
      }

      return matchesSearch && matchesStatus && matchesRole;
    });
    
    // Debug log para mostrar quantos documentos foram filtrados
    console.log(`[Filter Debug] Total documents: ${extendedDocuments.length}, Status filter: "${statusFilter}", Role filter: "${roleFilter}", Filtered: ${filtered.length}`);
    
    // Log específico para status filter
    if (statusFilter !== 'all') {
      const statusMatches = filtered.filter(doc => doc.translation_status === statusFilter);
      console.log(`[Status Filter Result] Found ${statusMatches.length} documents with translation_status "${statusFilter}"`);
      statusMatches.forEach(doc => {
        console.log(`  - ${doc.filename} (${doc.user_name})`);
      });
      
      // Debug: verificar se há documentos com o status correto mas que não estão sendo filtrados
      const allStatusMatches = extendedDocuments.filter(doc => doc.translation_status === statusFilter);
      console.log(`[Status Filter Debug] Total documents with translation_status "${statusFilter}" in extendedDocuments: ${allStatusMatches.length}`);
      if (allStatusMatches.length !== statusMatches.length) {
        console.log(`[Status Filter Debug] WARNING: Some documents with translation_status "${statusFilter}" are not being filtered correctly!`);
        allStatusMatches.forEach(doc => {
          const isInFiltered = filtered.some(fDoc => fDoc.id === doc.id);
          console.log(`  - ${doc.filename}: in filtered=${isInFiltered}`);
        });
      }
    }
    
    return filtered;
  }, [extendedDocuments, searchTerm, statusFilter, roleFilter]);

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
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {/* Search */}
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search by name, email, filename, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              aria-label="Search documents"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
            <select
              value={statusFilter}
              onChange={(e) => {
                console.log(`🔍 [Status Filter Change] Changing from "${statusFilter}" to "${e.target.value}"`);
                setStatusFilter(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by translation status"
            >
              <option value="all">All Translation Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              aria-label="Filter by user role"
            >
              <option value="all">All User Roles</option>
              <option value="user">User</option>
              <option value="authenticator">Authenticator</option>
            </select>
          </div>

          {/* Google Style Date Range Filter */}
          <GoogleStyleDatePicker
            dateRange={internalDateRange}
            onDateRangeChange={(newDateRange) => {
              setInternalDateRange(newDateRange);
              if (onDateRangeChange) {
                onDateRangeChange(newDateRange);
              }
            }}
            className="w-full"
          />
        </div>
      </div>

      {/* Conteúdo: Tabela para Desktop e Cartões para Mobile */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-8 px-4">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-base font-medium text-gray-700">No documents found</p>
          <p className="text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
          <p className="text-xs text-gray-400 mt-2">Debug: statusFilter="{statusFilter}", total docs={extendedDocuments.length}</p>
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
                      {doc.display_name || doc.user_name || doc.user_email || 'Unknown user'}
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
                          {doc.display_name || doc.user_name || 'N/A'}
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
                      <span className={`inline-flex px-2 py-1 font-semibold rounded-full ${getStatusColor(doc.translation_status || 'pending')}`}>
                        {doc.translation_status || 'pending'}
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