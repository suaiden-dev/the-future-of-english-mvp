import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Eye, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
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
  .select('*')
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

      // LOG DE DEPURAÇÃO DETALHADA
      console.log('[DEBUG] 📊 Quantidade de documentos em documents:', mainDocuments?.length || 0);
      console.log('[DEBUG] 📊 Quantidade de documentos em documents_to_be_verified:', verifiedDocuments?.length || 0);
      
      if (verifiedDocuments && verifiedDocuments.length > 0) {
        console.log('[DEBUG] 📄 Exemplo de documento verificado:', verifiedDocuments[0]);
      } else {
        console.log('[DEBUG] ⚠️ Nenhum documento retornado de documents_to_be_verified');
      }

      // NOVA LÓGICA: Usar documents como base e verificar status nas outras tabelas
      // 1. Todos os documentos começam com status da tabela documents
      // 2. Se existir em documents_to_be_verified, usar esse status (mais atual)
      // 3. Se não existir em documents_to_be_verified, manter como 'processing'
      
      console.log('[DEBUG] 📊 Implementando nova lógica de status...');
      console.log('[DEBUG] 📊 Documents principais:', mainDocuments?.length || 0);
      console.log('[DEBUG] 📊 Documents to be verified:', verifiedDocuments?.length || 0);

      // Criar mapa dos documentos verificados para lookup rápido
      const verifiedDocsMap = new Map();
      (verifiedDocuments || []).forEach((verifiedDoc: any) => {
        // Primeira prioridade: relacionar por original_document_id
        if (verifiedDoc.original_document_id) {
          verifiedDocsMap.set(verifiedDoc.original_document_id, {
            ...verifiedDoc,
            matchType: 'direct_id'
          });
        } else {
          // Segunda prioridade: relacionar por user_id + filename
          const key = `${verifiedDoc.user_id}_${verifiedDoc.filename}`;
          verifiedDocsMap.set(key, {
            ...verifiedDoc,
            matchType: 'filename_fallback'
          });
        }
      });

      // Processar TODOS os documentos da tabela documents como base
      const allDocuments = (mainDocuments || []).map(mainDoc => {
        // Verificar se existe em documents_to_be_verified
        let verifiedDoc = null;
        let matchType = 'no_match';

        // Primeira tentativa: buscar por ID direto
        if (verifiedDocsMap.has(mainDoc.id)) {
          verifiedDoc = verifiedDocsMap.get(mainDoc.id);
          matchType = 'direct_id';
        } else {
          // Segunda tentativa: buscar por user_id + filename
          const key = `${mainDoc.user_id}_${mainDoc.filename}`;
          if (verifiedDocsMap.has(key)) {
            verifiedDoc = verifiedDocsMap.get(key);
            matchType = 'filename_fallback';
          }
        }

        // Determinar status final
        let finalStatus = 'processing'; // Default: se não está em documents_to_be_verified
        let verificationData = {};

        if (verifiedDoc) {
          // Se existe em documents_to_be_verified, usar esse status
          finalStatus = verifiedDoc.status;
          verificationData = {
            verification_id: verifiedDoc.id,
            source_language: verifiedDoc.source_language,
            target_language: verifiedDoc.target_language,
            authenticated_by_name: verifiedDoc.authenticated_by_name,
            authenticated_by_email: verifiedDoc.authenticated_by_email,
            authentication_date: verifiedDoc.authentication_date,
            rejection_reason: verifiedDoc.rejection_reason,
            rejection_comment: verifiedDoc.rejection_comment,
            rejected_by: verifiedDoc.rejected_by,
            rejected_at: verifiedDoc.rejected_at
          };
        }

        return {
          ...mainDoc,
          source: 'documents',
          status: finalStatus, // Status final determinado pela lógica acima
          matchType,
          hasVerificationRecord: !!verifiedDoc,
          ...verificationData
        };
      });
      
      console.log('[DEBUG] � Documentos processados:', allDocuments.length);
      console.log('[DEBUG] 📊 Com registro de verificação:', allDocuments.filter(d => d.hasVerificationRecord).length);
      console.log('[DEBUG] 📊 Sem registro (processing):', allDocuments.filter(d => !d.hasVerificationRecord).length);

      // Buscar dados de pagamentos para obter payment_method e status
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('document_id, payment_method, status, amount, currency, created_at');

      if (paymentsError) {
        console.error('Error loading payments data:', paymentsError);
      }

      // Buscar dados de traduções para obter status correto de tradução e autenticador
      // OBS: Relacionamento via original_document_id (referencia documents_to_be_verified.id)
      const { data: translationsData, error: translationsError } = await supabase
        .from('translated_documents')
        .select(`
          original_document_id,
          status,
          authenticated_by_name,
          authenticated_by_email,
          authentication_date,
          user_id,
          filename
        `);

      if (translationsError) {
        console.error('Error loading translations data:', translationsError);
      }

      // Buscar perfis de usuários para verificar roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, role, name, email, phone');

      if (profilesError) {
        console.error('Error loading profiles data:', profilesError);
      }

      console.log('🔍 Profiles data loaded:', profilesData?.length || 0);
      console.log('🔍 Sample profiles:', profilesData?.slice(0, 5));
      console.log('🔍 Payments data loaded:', paymentsData?.length || 0);
      console.log('🔍 Sample payments:', paymentsData?.slice(0, 5));
      console.log('🔍 Translations data loaded:', translationsData?.length || 0);
      console.log('🔍 Sample translations:', translationsData?.slice(0, 5));

      // Criar lista combinada usando a nova lógica baseada em documents
      const documentsWithCorrectStatus = allDocuments.map(doc => {
        // Verificar se existe tradução para este documento
        let translationStatus = 'pending';
        let translationInfo = translationsData?.find(translation => 
          translation.original_document_id === doc.verification_id || // Se tem verification_id, usar ele
          (translation.user_id === doc.user_id && translation.filename === doc.filename) // Fallback por user_id + filename
        );
        if (translationInfo) {
          translationStatus = 'completed';
        }
        
        // Dados de pagamento - usar ID do documento principal
        const paymentInfo = paymentsData?.find(payment => payment.document_id === doc.id);
        
        // Perfil do usuário
        const userProfile = profilesData?.find(profile => profile.id === doc.user_id);
        const userRole = userProfile?.role || 'user';
        const isAuthenticator = userRole === 'authenticator';
        
        return {
          ...doc,
          user_name: userProfile?.name || null,
          user_email: userProfile?.email || null,
          user_phone: userProfile?.phone || null,
          document_type: doc.hasVerificationRecord ? 'verified' : 'regular',
          translation_status: translationStatus,
          payment_method: paymentInfo?.payment_method || doc.payment_method || 'card',
          payment_status: paymentInfo?.status || 'completed',
          client_name: doc.client_name || null,
          display_name: isAuthenticator && doc.client_name && doc.client_name !== 'Cliente Padrão'
            ? `${doc.client_name} (${userProfile?.name || 'N/A'})`
            : doc.authenticated_by_name && doc.client_name && doc.client_name !== 'Cliente Padrão'
            ? `${doc.client_name} (${doc.authenticated_by_name})`
            : userProfile?.name || null,
          user_role: userRole,
          // Adicionar informações de debug
          _debug_match_type: doc.matchType,
          _debug_has_verification_record: doc.hasVerificationRecord,
          _debug_final_status: doc.status
        };
      });

      setExtendedDocuments(documentsWithCorrectStatus);
      
      // Debug log para verificar a nova lógica de status
      console.log('🔍 [NOVA LÓGICA] Total documents loaded:', documentsWithCorrectStatus.length);
      
      const statusCounts = documentsWithCorrectStatus.reduce((acc, doc) => {
        acc[doc.status || 'pending'] = (acc[doc.status || 'pending'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🔍 [NOVA LÓGICA] Status distribution (final):', statusCounts);
      
      const matchTypeCounts = documentsWithCorrectStatus.reduce((acc, doc) => {
        acc[doc._debug_match_type || 'unknown'] = (acc[doc._debug_match_type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🔍 [NOVA LÓGICA] Match type distribution:', matchTypeCounts);
      
      const verificationCounts = {
        with_verification: documentsWithCorrectStatus.filter(d => d._debug_has_verification_record).length,
        without_verification: documentsWithCorrectStatus.filter(d => !d._debug_has_verification_record).length
      };
      console.log('🔍 [NOVA LÓGICA] Verification record distribution:', verificationCounts);

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
    
    // Debug: mostrar todos os status únicos dos documentos (usar status da tabela documents_to_be_verified)
    const uniqueStatuses = [...new Set(extendedDocuments.map(doc => doc.status))];
    const uniqueTranslationStatuses = [...new Set(extendedDocuments.map(doc => doc.translation_status))];
    console.log(`🔍 [Filter Debug] Unique status (documents_to_be_verified):`, uniqueStatuses);
    console.log(`🔍 [Filter Debug] Unique translation_status (computed):`, uniqueTranslationStatuses);
    
    const filtered = extendedDocuments.filter(doc => {
      // Filtro de busca textual
      const matchesSearch = searchTerm === '' ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.display_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status - usar STATUS da tabela documents_to_be_verified (não translation_status)
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

      // Debug log para status filter
      if (statusFilter !== 'all') {
        console.log(`[Status Filter Debug] Document: ${doc.filename}, status: "${doc.status}", filter: "${statusFilter}", matches: ${matchesStatus}`);
        if (doc.status === statusFilter) {
          console.log(`  ✅ MATCH FOUND: ${doc.filename} has status "${doc.status}"`);
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
      const statusMatches = filtered.filter(doc => doc.status === statusFilter);
      console.log(`[Status Filter Result] Found ${statusMatches.length} documents with status "${statusFilter}"`);
      statusMatches.forEach(doc => {
        console.log(`  - ${doc.filename} (${doc.user_name})`);
      });
      
      // Debug: verificar se há documentos com o status correto mas que não estão sendo filtrados
      const allStatusMatches = extendedDocuments.filter(doc => doc.status === statusFilter);
      console.log(`[Status Filter Debug] Total documents with status "${statusFilter}" in extendedDocuments: ${allStatusMatches.length}`);
      if (allStatusMatches.length !== statusMatches.length) {
        console.log(`[Status Filter Debug] WARNING: Some documents with status "${statusFilter}" are not being filtered correctly!`);
        allStatusMatches.forEach(doc => {
          const isInFiltered = filtered.some(fDoc => fDoc.id === doc.id);
          console.log(`  - ${doc.filename}: in filtered=${isInFiltered}`);
        });
      }
    }
    
    return filtered;
  }, [extendedDocuments, searchTerm, statusFilter, roleFilter]);

  // Lógica de paginação
  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Cálculo do valor total dos documentos filtrados
  const totalValue = filteredDocuments.reduce((sum, doc) => {
    return sum + (doc.total_cost || 0);
  }, 0);

  // Reset para primeira página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

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
    const csvRows = [
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
      ]),
      // Adicionar linha vazia e totais
      [],
      ['TOTALS', '', '', '', '', '', totalValue.toFixed(2), '', '', '', `${filteredDocuments.length} documents`]
    ];

    const csvContent = csvRows.map(row => 
      row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [filteredDocuments, totalValue]);

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-1">
              <p className="text-sm text-gray-500">
                Showing {filteredDocuments.length} of {extendedDocuments.length} documents
              </p>
              <p className="text-sm font-medium text-green-600">
                Total Value: ${totalValue.toFixed(2)}
              </p>
            </div>
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
          <div className="w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    USER/CLIENT
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TRANSLATIONS
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AUTHENTICATOR
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    {/* USER/CLIENT */}
                    <td className="px-3 py-3 text-xs align-top">
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-[180px]" title={doc.display_name || doc.user_name || 'N/A'}>
                          {doc.display_name || doc.user_name || 'N/A'}
                        </div>
                        <div className="text-gray-500 truncate max-w-[180px]" title={doc.user_email || 'No email'}>
                          {doc.user_email || 'No email'}
                        </div>
                      </div>
                    </td>
                    {/* Document */}
                    <td className="px-3 py-3 text-xs align-top">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate max-w-[220px]" title={doc.filename}>
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
                    
                    {/* TRANSLATIONS - Status da tabela documents_to_be_verified */}
                    <td className="px-3 py-3 text-xs">
                      <span className={`inline-flex px-2 py-1 font-semibold rounded-full ${getStatusColor(doc.status || 'pending')}`}>
                        {doc.status || 'pending'}
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
          
          {/* Controles de Paginação */}
          {totalItems > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              {/* Informações de itens - versão mobile */}
              <div className="flex-1 flex flex-col sm:hidden">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-700">
                    {totalItems} resultados • <span className="font-medium text-green-600">${totalValue.toFixed(2)}</span>
                  </p>
                </div>
              </div>
              
              {/* Controles completos para telas maiores */}
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-700">
                    <p>
                      Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(endIndex, totalItems)}</span> de{' '}
                      <span className="font-medium">{totalItems}</span> resultados
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Valor total: <span className="font-medium text-green-600">${totalValue.toFixed(2)}</span>
                    </p>
                  </div>
                  
                  {/* Seletor de itens por página */}
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="ml-4 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                  </select>
                </div>
                
                {/* Navegação de páginas */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <ChevronLeft className="h-5 w-5 -ml-1" />
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Números de página */}
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const pages = [];
                      const maxVisiblePages = 5;
                      
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setCurrentPage(1)}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            1
                          </button>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <span key="start-ellipsis" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          );
                        }
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              i === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span key="end-ellipsis" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          );
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {totalPages}
                          </button>
                        );
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                    <ChevronRight className="h-5 w-5 -ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}