import { useState, useEffect, useCallback, useMemo } from 'react';
// Assuming `Document` is defined as a type/interface in App.ts or a shared types file
// For this example, I'll define a minimal Document interface here.
import { supabase } from '../../lib/supabase';
import { Eye, Download, Filter, Calendar } from 'lucide-react';
import { DateRange } from '../../components/DateRangeFilter'; // Assuming this path is correct
import { DocumentDetailsModal } from './DocumentDetailsModal'; // Assuming this path is correct

  // Extended Document interface for the modal
  export interface Document {
    id: string;
    filename: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'deleted';
    file_path?: string;
    user_id?: string;
    created_at?: string;
    // Campos adicionais para o modal
    total_cost?: number;
    pages?: number;
    source_language?: string;
    target_language?: string;
    translation_type?: string;
    bank_statement?: boolean;
    authenticated?: boolean;
    // Informações do usuário
    user_name?: string;
    user_email?: string;
    user_phone?: string;
    // Tipo de documento
    document_type?: 'authenticator' | 'payment';
    // URL do arquivo traduzido
    translated_file_url?: string;
  }

// Define the structure of the data directly from Supabase join
interface PaymentWithRelations {
  id: string;
  document_id: string;
  user_id: string;
  stripe_session_id: string | null;
  amount: number;
  currency: string;
  status: string; // payment status
  payment_method: string | null;
  payment_date: string | null;
  created_at: string;
  profiles: { email: string | null; name: string | null } | null;
  documents: { 
    filename: string | null; 
    status: Document['status'] | null;
    client_name: string | null;
    idioma_raiz: string | null;
    tipo_trad: string | null;
  } | null; // document info from documents table
}

// Define the mapped Payment interface used in the component's state
interface MappedPayment extends PaymentWithRelations {
  user_email: string | null;
  user_name: string | null;
  client_name: string | null;
  document_filename: string | null;
  document_status: Document['status'] | null; // Adding document status here
  idioma_raiz: string | null;
  tipo_trad: string | null;
  // Authentication info from documents_to_be_verified
  authenticated_by_name: string | null;
  authenticated_by_email: string | null;
  authentication_date: string | null;
  source_language: string | null; // From documents_to_be_verified
  target_language: string | null; // From documents_to_be_verified

}

interface PaymentsTableProps {
  // `documents` prop is removed as it's not directly used here.
  // `onStatusUpdate` and `onViewDocument` props are removed as internal logic handles these.
  initialDateRange?: DateRange; // Renamed to avoid confusion with internal state
}

export function PaymentsTable({ initialDateRange }: PaymentsTableProps) {
  const [payments, setPayments] = useState<MappedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all'); // payment status filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateRange>(initialDateRange || {
    startDate: null,
    endDate: null,
    preset: 'all'
  });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Memoized function for date range presets
  const updateDateFilter = useCallback((preset: string) => {
    const now = new Date();
    // Reset time to start of day for consistent range calculations
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let newStartDate: Date | null = null;
    let newEndDate: Date | null = now; // Default end date to now

    switch (preset) {
      case '7d':
        newStartDate = new Date(startOfToday);
        newStartDate.setDate(startOfToday.getDate() - 7);
        break;
      case '30d':
        newStartDate = new Date(startOfToday);
        newStartDate.setDate(startOfToday.getDate() - 30);
        break;
      case '3m':
        newStartDate = new Date(startOfToday);
        newStartDate.setMonth(startOfToday.getMonth() - 3);
        break;
      case '6m':
        newStartDate = new Date(startOfToday);
        newStartDate.setMonth(startOfToday.getMonth() - 6);
        break;
      case 'year':
        newStartDate = new Date(now.getFullYear(), 0, 1); // Start of current year
        break;
      case 'all':
      default:
        newStartDate = null;
        newEndDate = null;
        preset = 'all'; // Ensure preset is 'all' if default
    }

    setDateFilter({
      startDate: newStartDate,
      endDate: newEndDate,
      preset
    });
  }, []);

  // Função para carregar documentos dos autenticadores
  const loadAuthenticatorDocuments = async (startDate: string | null, endDate: string | null): Promise<MappedPayment[]> => {
    try {
      console.log('🔍 Carregando documentos de autenticadores (incluindo não aprovados)...');
      
      // Buscar documentos da tabela documents_to_be_verified (uploads iniciais dos autenticadores)
      let documentsQuery = supabase
        .from('documents_to_be_verified')
        .select(`
          id,
          filename,
          total_cost,
          created_at,
          user_id,
          source_language,
          target_language,
          status,
          authenticated_by_name,
          authenticated_by_email,
          authentication_date
        `);

      // Aplicar filtros de data se existirem
      if (startDate) {
        documentsQuery = documentsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        documentsQuery = documentsQuery.lte('created_at', endDate);
      }

      const { data: allDocs, error: docsError } = await documentsQuery.order('created_at', { ascending: false });

      if (docsError) {
        console.error('❌ Erro ao buscar documentos:', docsError);
        return [];
      }

      if (!allDocs || allDocs.length === 0) {
        return [];
      }

      console.log('📋 Documentos encontrados:', allDocs.length);

      // Para cada documento, buscar informações adicionais
      const documentPromises = allDocs.map(async (doc: any) => {
        try {
          // Buscar dados do uploader para verificar se é autenticador
          const { data: uploaderProfile } = await supabase
            .from('profiles')
            .select('id, name, email, role')
            .eq('id', doc.user_id)
            .single();

          // Verificar se é um upload de authenticator
          if (!uploaderProfile || uploaderProfile.role !== 'authenticator') {
            return null;
          }

          // Buscar dados do cliente (user_id do documento)
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', doc.user_id)
            .single();

          // Verificar se já existe na tabela translated_documents (documento aprovado)
          const { data: translatedDoc } = await supabase
            .from('translated_documents')
            .select('id, user_id')
            .eq('original_document_id', doc.id)
            .single();

          // Buscar payment_method na tabela documents - simplificar a busca
          let paymentMethod = 'upload';
          try {
            const { data: documentsInfo } = await supabase
              .from('documents')
              .select('payment_method')
              .eq('user_id', doc.user_id)
              .eq('filename', doc.filename)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (documentsInfo?.payment_method) {
              paymentMethod = documentsInfo.payment_method;
            }
          } catch (err) {
            // Se não encontrar, manter como 'upload'
            console.log('📝 Documento não encontrado na tabela documents, usando payment_method padrão');
          }

          // Determinar o status baseado se foi aprovado ou não
          const isApproved = !!translatedDoc;
          const paymentStatus = isApproved ? 'completed' : 'pending';
          const clientUserId = translatedDoc?.user_id || doc.user_id;

          // Criar um objeto similar ao MappedPayment
          return {
            // Campos obrigatórios do PaymentWithRelations
            id: translatedDoc?.id || doc.id, // Usar ID do documento traduzido se existir, senão do original
            user_id: clientUserId,
            document_id: doc.id,
            amount: doc.total_cost || 0,
            currency: 'USD',
            status: paymentStatus, // 'completed' se aprovado, 'pending' se não
            payment_method: paymentMethod,
            payment_date: translatedDoc ? doc.created_at : null, // Data de pagamento só se aprovado
            stripe_session_id: null,
            created_at: doc.created_at,
            profiles: userProfile,
            documents: null,
            // Campos específicos do MappedPayment
            user_email: userProfile?.email || null,
            user_name: userProfile?.name || null,
            client_name: uploaderProfile.name || null, // Nome do autenticador
            document_filename: doc.filename,
            document_status: doc.status || null,
            idioma_raiz: null,
            tipo_trad: null,
            authenticated_by_name: doc.authenticated_by_name,
            authenticated_by_email: doc.authenticated_by_email,
            authentication_date: doc.authentication_date,
            source_language: doc.source_language,
            target_language: doc.target_language,
          } as MappedPayment;
        } catch (err) {
          console.error('❌ Erro ao processar documento:', doc.id, err);
          return null;
        }
      });

      // Aguardar todas as promises e filtrar nulls
      const documentsWithData = (await Promise.all(documentPromises)).filter(Boolean);
      console.log('✅ Documentos de autenticadores processados:', documentsWithData.length);
      return documentsWithData as MappedPayment[];

    } catch (error) {
      console.error('❌ Erro ao carregar documentos de autenticadores:', error);
      return [];
    }
  };

  // Effect to load payments whenever dateFilter, filterStatus, or searchTerm changes
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPayments([]); // Clear payments on new load

    const startDateParam = dateFilter?.startDate ? dateFilter.startDate.toISOString() : null;
    const endDateParam = dateFilter?.endDate ? dateFilter.endDate.toISOString() : null;

    try {
      console.log('🔍 Loading payments...', { dateFilter, filterStatus, searchTerm });

      let query = supabase
        .from('payments')
        .select(`
          *,
          profiles:profiles!payments_user_id_fkey(email, name),
          documents:documents!payments_document_id_fkey(filename, status, client_name, idioma_raiz, tipo_trad)
        `)
        .order('created_at', { ascending: false });

      // Apply date filters
      if (startDateParam) {
        query = query.gte('created_at', startDateParam);
      }
      if (endDateParam) {
        query = query.lte('created_at', endDateParam);
      }
      // Apply payment status filter - only for payments table, not for authenticator documents
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading payments:', error);
        setError('Failed to load payments.');
        return;
      }

      // Buscar dados da tabela documents_to_be_verified para status atualizados e informações de autenticação
      let verifiedQuery = supabase
        .from('documents_to_be_verified')
        .select('id, filename, status, authenticated_by_name, authenticated_by_email, authentication_date, source_language, target_language');
      
      const { data: verifiedData, error: verifiedError } = await verifiedQuery;
      
      if (verifiedError) {
        console.error('❌ Error loading verified documents:', verifiedError);
      }

      console.log('📊 Raw data received:', data);

      const mappedPayments: MappedPayment[] = data?.map(payment => {
        // Buscar status atualizado e informações de autenticação da tabela documents_to_be_verified usando filename
        const verifiedDoc = verifiedData?.find(v => v.filename === payment.documents?.filename);
        const actualDocumentStatus = verifiedDoc ? verifiedDoc.status : payment.documents?.status;

        return {
          ...payment,
          user_email: payment.profiles?.email || null,
          user_name: payment.profiles?.name || null,
          client_name: payment.documents?.client_name || null,
          document_filename: payment.documents?.filename || null,
          document_status: actualDocumentStatus || null,
          idioma_raiz: payment.documents?.idioma_raiz || null,
          tipo_trad: payment.documents?.tipo_trad || null,
          // Informações de autenticação
          authenticated_by_name: verifiedDoc?.authenticated_by_name || null,
          authenticated_by_email: verifiedDoc?.authenticated_by_email || null,
          authentication_date: verifiedDoc?.authentication_date || null,
          // Translation info from documents_to_be_verified
          source_language: verifiedDoc?.source_language || null,
          target_language: verifiedDoc?.target_language || null,
        };
      }) || [];

      // Buscar também documentos dos autenticadores (translated_documents)
      const authenticatorDocuments = await loadAuthenticatorDocuments(startDateParam, endDateParam);
      
      // Combinar os dados
      const allPayments = [...mappedPayments, ...authenticatorDocuments];
      
      console.log('✅ Payments mapped:', mappedPayments.length);
      console.log('✅ Authenticator documents:', authenticatorDocuments.length);
      console.log('✅ Total combined:', allPayments.length);

      setPayments(allPayments);

    } catch (err) {
      console.error('💥 Error loading payments:', err);
      setError('An unexpected error occurred while loading payments.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, filterStatus]); // Removed searchTerm from here, as filtering is done client-side

  useEffect(() => {
    loadPayments();
  }, [loadPayments]); // Rerun effect when `loadPayments` (memoized) changes

  // Client-side filtering for search term and status
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter(payment => {
      // Filter by status first
      const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
      
      // Then filter by search term
      const matchesSearch = searchTerm === '' ||
        payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.document_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.stripe_session_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase()); // Allow searching payment ID

      return matchesStatus && matchesSearch;
    });
  }, [payments, searchTerm, filterStatus]);


  const handleViewDocument = useCallback(async (payment: MappedPayment) => {
    try {
      console.log('🔍 Fetching document for payment:', payment);
      console.log('🔍 Payment method:', payment.payment_method);
      console.log('🔍 Document ID:', payment.document_id);
      console.log('🔍 Is authenticator document?', payment.payment_method === 'upload');

      // Buscar dados reais do documento
      let documentData: any = null;
      let documentType: 'authenticator' | 'payment' = 'payment';

      // Para documentos de autenticadores, buscar na tabela documents_to_be_verified
      if (payment.payment_method === 'upload') {
        console.log('📋 Buscando documento de autenticador na tabela documents_to_be_verified...');
        documentType = 'authenticator';
        
        const { data: document, error } = await supabase
          .from('documents_to_be_verified')
          .select('*')
          .eq('id', payment.document_id)
          .single();

        if (error) {
          console.error('❌ Error fetching authenticator document:', error);
          // Tentar buscar por filename se falhar por ID
          console.log('🔄 Tentando buscar por filename...');
          const { data: docByFilename, error: filenameError } = await supabase
            .from('documents_to_be_verified')
            .select('*')
            .eq('filename', payment.document_filename)
            .single();
          
          if (filenameError) {
            console.error('❌ Error fetching by filename too:', filenameError);
            return;
          }
          
          documentData = docByFilename;
        } else {
          documentData = document;
        }
      } else {
        // Para pagamentos tradicionais, buscar na tabela documents
        console.log('💳 Buscando documento de pagamento na tabela documents...');
        const { data: document, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', payment.document_id)
          .single();

        if (error) {
          console.error('❌ Error fetching payment document:', error);
          return;
        }

        documentData = document;
      }

      if (!documentData) {
        console.error('❌ No document data found');
        return;
      }

      // Buscar informações adicionais do usuário
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', payment.user_id)
        .single();

      // Buscar URL do arquivo traduzido da tabela documents_to_be_verified
      let translatedFileUrl: string | null = null;
      
      // Verificar se o documento existe na tabela documents_to_be_verified (independente do método de pagamento)
      console.log('🔍 Verificando se documento existe na tabela documents_to_be_verified...');
      console.log('🔍 User ID:', payment.user_id);
      console.log('🔍 Filename:', payment.document_filename);
      console.log('🔍 Payment method:', payment.payment_method);
      
      // Buscar por user_id na tabela documents_to_be_verified
      console.log('🔍 Buscando por user_id:', payment.user_id);
      let { data: translatedDoc, error } = await supabase
        .from('documents_to_be_verified')
        .select('*')
        .eq('user_id', payment.user_id)
        .eq('filename', payment.document_filename)
        .single();
      
      if (error) {
        console.log('🔄 Tentando buscar apenas por user_id...');
        const { data: docsByUserId, error: userIdError } = await supabase
          .from('documents_to_be_verified')
          .select('*')
          .eq('user_id', payment.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!userIdError && docsByUserId) {
          translatedDoc = docsByUserId;
          error = null;
          console.log('✅ Documento encontrado por user_id:', docsByUserId);
        }
      }
      
      if (error) {
        console.log('ℹ️ Documento não encontrado na tabela documents_to_be_verified');
      } else {
        console.log('✅ Dados encontrados na documents_to_be_verified:', translatedDoc);
        console.log('✅ Todas as colunas disponíveis:', Object.keys(translatedDoc || {}));
        console.log('✅ translated_file_url encontrado:', translatedDoc?.translated_file_url);
        console.log('✅ file_url encontrado:', translatedDoc?.file_url);
        console.log('✅ file_path encontrado:', translatedDoc?.file_path);
        
        // Tentar diferentes campos possíveis para a URL do arquivo traduzido
        translatedFileUrl = translatedDoc?.translated_file_url || 
                           translatedDoc?.file_url || 
                           translatedDoc?.file_path || 
                           null;
      }

      // Criar um objeto Document completo com todos os dados
      const completeDocument: Document = {
        id: documentData.id,
        filename: documentData.filename || payment.document_filename,
        status: documentData.status || 'pending',
        file_path: documentData.file_path || documentData.file_url,
        user_id: documentData.user_id || payment.user_id,
        created_at: documentData.created_at || payment.created_at,
        // Campos adicionais para o modal
        total_cost: payment.amount,
        pages: documentData.pages,
        source_language: documentData.source_language || payment.source_language,
        target_language: documentData.target_language || payment.target_language,
        translation_type: payment.payment_method === 'upload' ? documentData.translation_type : payment.tipo_trad,
        bank_statement: documentData.bank_statement,
        authenticated: documentData.authenticated,
        // Informações do usuário
        user_name: userProfile?.name,
        user_email: userProfile?.email,
        user_phone: userProfile?.phone,
        // Tipo de documento para o modal
        document_type: documentType,
        // URL do arquivo traduzido
        translated_file_url: translatedFileUrl || undefined
      };

      console.log('📄 Complete document prepared for modal:', completeDocument);
      console.log('🔍 Campos importantes:', {
        file_path: completeDocument.file_path,
        translated_file_url: completeDocument.translated_file_url,
        filename: completeDocument.filename
      });
      setSelectedDocument(completeDocument);
      setShowModal(true);
      console.log('✅ Modal opened with complete document data');

    } catch (err) {
      console.error('💥 Error opening document:', err);
      console.error('💥 Error details:', err);
    }
  }, []); // Empty dependency array because supabase and useState setters are stable

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-200 text-gray-800'; // Changed from gray-100 for more contrast
      case 'processing': // For document status
      case 'draft': // For document status
        return 'bg-blue-100 text-blue-800';
      case 'deleted': // For document status
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadPaymentsReport = useCallback(() => {
    const csvContent = [
      ['User/Client Name', 'User Email', 'Document ID', 'Document Filename', 'Amount', 'Currency', 'Payment Method', 'Payment ID', 'Session ID', 'Payment Status', 'Document Status', 'Authenticator Name', 'Authenticator Email', 'Authentication Date', 'Payment Date', 'Created At'],
      ...filteredPayments.map(payment => [
        payment.client_name || payment.user_name || '',
        payment.user_email || '',
        payment.document_id,
        payment.document_filename || '',
        payment.amount.toFixed(2), // Format amount directly
        payment.currency,
        payment.payment_method || '',
        payment.id,
        payment.stripe_session_id || '',
        payment.status, // payment status
        payment.document_status || '', // document status
        payment.authenticated_by_name || '',
        payment.authenticated_by_email || '',

        payment.authentication_date ? new Date(payment.authentication_date).toLocaleDateString() : '',
        payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '',
        new Date(payment.created_at).toLocaleDateString() // Assuming created_at is always present
      ])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n'); // Proper CSV escaping

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); // Append to body to ensure it's visible in DOM for click
    a.click();
    document.body.removeChild(a); // Clean up
    window.URL.revokeObjectURL(url);
  }, [filteredPayments]); // Depend on filteredPayments to export current view

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
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" // Changed ring color
              aria-label="Export Payments to CSV"
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
              placeholder="Search by name, email, filename, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white" // Changed ring color
              aria-label="Search payments"
            />
          </div>

          {/* Status Filter (Payment Status) */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" // Changed ring color
              aria-label="Filter by payment status"
            >
              <option value="all">All Payment Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
            <select
              value={dateFilter?.preset || 'all'}
              onChange={(e) => updateDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" // Changed ring color
              aria-label="Filter by date range"
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

      {loading ? (
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => ( // More rows for better loading UX
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-6" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : (
        <>
          {/* Mobile: Cards View */}
          <div className="block sm:hidden">
            {filteredPayments.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                No payments found matching your criteria.
              </div>
            ) : (
              <div className="space-y-3 p-3 sm:p-4">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {payment.client_name || payment.user_name || 'Unknown'}
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
                        <span className="text-gray-500">Doc Status:</span> {/* Added document status */}
                        <div className="font-medium text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.document_status)}`}>
                            {payment.document_status || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Payment Method:</span>
                        <div className="font-medium text-gray-900">
                          {payment.payment_method ? (
                            payment.payment_method === 'card' ? '💳 Card' :
                              payment.payment_method === 'bank_transfer' ? '🏦 Bank' :
                                payment.payment_method === 'paypal' ? '📱 PayPal' :
                                payment.payment_method === 'upload' ? '📋 Upload' :
                                  payment.payment_method
                          ) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Authenticator:</span>
                        <div className="font-medium text-gray-900 truncate">
                          {payment.authenticated_by_name || 'N/A'}
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
                        onClick={() => handleViewDocument(payment)}
                        className="text-blue-600 hover:text-blue-900" // Changed color
                        aria-label={`Details for document ${payment.document_filename}`}
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
            <table className="min-w-full divide-y divide-gray-200"> {/* Added min-w-full */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    USER/CLIENT
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
                    Payment Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TRANSLATIONS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AUTHENTICATOR
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No payments found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.client_name || payment.user_name || 'Unknown'}
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
                                payment.payment_method === 'upload' ? '📋 Upload' :
                                  payment.payment_method}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.document_status)}`}>
                          {payment.document_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {payment.authenticated_by_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.authenticated_by_email || 'No authenticator'}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDocument(payment)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1" // Changed color
                          title={`Details for document ${payment.document_filename}`}
                          aria-label={`Details for document ${payment.document_filename}`}
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Details</span>
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
        </>
      )}

      {/* Document Details Modal */}
      {showModal && selectedDocument && (
        <DocumentDetailsModal
          document={selectedDocument as any}
          onClose={() => {
            setShowModal(false);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
}