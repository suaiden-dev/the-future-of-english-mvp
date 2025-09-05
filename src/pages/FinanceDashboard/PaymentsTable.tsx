import { useState, useEffect, useCallback, useMemo } from 'react';
// Assuming `Document` is defined as a type/interface in App.ts or a shared types file
// For this example, I'll define a minimal Document interface here.
import { supabase } from '../../lib/supabase';
import { Eye, Download, Filter } from 'lucide-react';
import { DateRange } from '../../components/DateRangeFilter'; // Assuming this path is correct
import { GoogleStyleDatePicker } from '../../components/GoogleStyleDatePicker';
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
    verification_code?: string;
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
  profiles: { email: string | null; name: string | null; role: string | null } | null;
  documents: { 
    filename: string | null; 
    status: Document['status'] | null;
    client_name: string | null;
    idioma_raiz: string | null;
    tipo_trad: string | null;
    verification_code: string | null;
  } | null; // document info from documents table
}

// Define the mapped Payment interface used in the component's state
interface MappedPayment extends PaymentWithRelations {
  user_email: string | null;
  user_name: string | null;
  user_role: string | null; // Role do usuário (user, authenticator, admin, finance)
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
  const [filterRole, setFilterRole] = useState<string>('all'); // user role filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateRange>(initialDateRange || {
    startDate: null,
    endDate: null,
    preset: 'all'
  });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Date filter is now managed by parent component (FinanceDashboard)

  // Effect to load payments whenever dateFilter, filterStatus, or searchTerm changes
  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPayments([]); // Clear payments on new load

    try {
      console.log('� Loading payments with correct logic...', { dateFilter, filterStatus, searchTerm });

      // Aplicar filtros de data se fornecidos
      let startDateParam = null;
      let endDateParam = null;
      
      if (dateFilter?.startDate) {
        // Para data de início, usar início do dia (00:00:00)
        const startDate = new Date(dateFilter.startDate);
        startDate.setHours(0, 0, 0, 0);
        startDateParam = startDate.toISOString();
      }
      
      if (dateFilter?.endDate) {
        // Para data de fim, usar fim do dia (23:59:59)
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);
        endDateParam = endDate.toISOString();
      }
      
      console.log('🔍 Date filter params:', { startDateParam, endDateParam });

      // Buscar todos os documentos da tabela principal (como no Admin Dashboard)
      let mainDocumentsQuery = supabase
        .from('documents')
        .select('*, profiles:profiles!documents_user_id_fkey(name, email, phone, role)')
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
        return;
      }

      // Buscar documentos da tabela documents_to_be_verified
      let verifiedDocumentsQuery = supabase
        .from('documents_to_be_verified')
        .select('*, profiles:profiles!documents_to_be_verified_user_id_fkey(name, email, phone, role)')
        .order('created_at', { ascending: false });

      // Aplicar filtros de data
      if (startDateParam) {
        verifiedDocumentsQuery = verifiedDocumentsQuery.gte('created_at', startDateParam);
      }
      if (endDateParam) {
        verifiedDocumentsQuery = verifiedDocumentsQuery.lte('created_at', endDateParam);
      }

      const { data: verifiedDocuments, error: verifiedDocError } = await verifiedDocumentsQuery;

      if (verifiedDocError) {
        console.error('Error loading verified documents:', verifiedDocError);
      }

      // Buscar dados de pagamentos
      let paymentsQuery = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros de data
      if (startDateParam) {
        paymentsQuery = paymentsQuery.gte('created_at', startDateParam);
      }
      if (endDateParam) {
        paymentsQuery = paymentsQuery.lte('created_at', endDateParam);
      }

      const { data: paymentsData, error: paymentsError } = await paymentsQuery;

      if (paymentsError) {
        console.error('Error loading payments data:', paymentsError);
      }

      console.log('🔍 Debug - Payments data loaded:', paymentsData?.length || 0);
      console.log('🔍 Debug - Sample payments:', paymentsData?.slice(0, 3));
      console.log('🔍 Debug - Main documents sample:', mainDocuments?.slice(0, 3).map(doc => ({
        id: doc.id,
        filename: doc.filename,
        payment_method: doc.payment_method,
        total_cost: doc.total_cost,
        status: doc.status
      })));
      console.log('🔍 Debug - Verified documents sample:', verifiedDocuments?.slice(0, 3).map(doc => ({
        id: doc.id,
        filename: doc.filename,
        payment_method: doc.payment_method,
        total_cost: doc.total_cost,
        status: doc.status
      })));

      // Processar documentos de autenticadores (documents_to_be_verified)
      // Para autenticadores, o payment_method está na tabela documents
      const authenticatorPayments: MappedPayment[] = verifiedDocuments?.map(verifiedDoc => {
        const mainDoc = mainDocuments?.find(doc => doc.filename === verifiedDoc.filename);
        
        return {
          id: `auth-${verifiedDoc.id}`,
          user_id: verifiedDoc.user_id,
          document_id: verifiedDoc.id,
          stripe_session_id: null,
          amount: verifiedDoc.total_cost || 0,
          currency: 'usd',
          status: 'completed', // Para autenticadores, status sempre é completed
          payment_method: mainDoc?.payment_method || null, // Para autenticadores, buscar na tabela documents
          payment_date: verifiedDoc.authentication_date || verifiedDoc.created_at,
          created_at: verifiedDoc.created_at,
          
          // Dados do usuário
          user_email: verifiedDoc.profiles?.email || null,
          user_name: verifiedDoc.profiles?.name || null,
          user_role: verifiedDoc.profiles?.role || null,
          
          // Dados do documento
          document_filename: verifiedDoc.filename,
          document_status: verifiedDoc.status,
          client_name: verifiedDoc.client_name,
          idioma_raiz: verifiedDoc.source_language,
          tipo_trad: verifiedDoc.target_language,
          
          // Dados de autenticação
          authenticated_by_name: verifiedDoc.authenticated_by_name,
          authenticated_by_email: verifiedDoc.authenticated_by_email,
          authentication_date: verifiedDoc.authentication_date,
          source_language: verifiedDoc.source_language,
          target_language: verifiedDoc.target_language,
          
          // Campos obrigatórios da interface
          profiles: verifiedDoc.profiles,
          documents: {
            filename: verifiedDoc.filename,
            status: verifiedDoc.status,
            client_name: verifiedDoc.client_name,
            idioma_raiz: verifiedDoc.source_language,
            tipo_trad: verifiedDoc.target_language,
            verification_code: verifiedDoc.verification_code
          }
        };
      }) || [];

      // Processar documentos de usuários regulares (role: user)
      // Para usuários regulares, o payment_method está na tabela payments
      const regularPayments: MappedPayment[] = [];
      
      if (mainDocuments) {
        for (const doc of mainDocuments) {
          // Verificar se já foi processado como autenticador
          const alreadyProcessed = authenticatorPayments.some(auth => auth.document_filename === doc.filename);
          if (alreadyProcessed) {
            continue;
          }

          // Buscar pagamento na tabela payments para usuários regulares
          const paymentInfo = paymentsData?.find(payment => payment.user_id === doc.user_id);
          
          // Só incluir se tem informação financeira
          if (!paymentInfo && !doc.total_cost) {
            continue;
          }

          regularPayments.push({
            id: paymentInfo?.id || `doc-${doc.id}`,
            user_id: doc.user_id,
            document_id: doc.id,
            stripe_session_id: paymentInfo?.stripe_session_id || null,
            amount: paymentInfo?.amount || doc.total_cost || 0,
            currency: paymentInfo?.currency || 'usd',
            status: paymentInfo?.status || 'pending', // Para usuários regulares, buscar na tabela payments
            payment_method: paymentInfo?.payment_method || null, // Para usuários regulares, buscar na tabela payments
            payment_date: paymentInfo?.payment_date || doc.created_at,
            created_at: paymentInfo?.created_at || doc.created_at,
            
            // Dados do usuário
            user_email: doc.profiles?.email || null,
            user_name: doc.profiles?.name || null,
            user_role: doc.profiles?.role || null,
            
            // Dados do documento
            document_filename: doc.filename,
            document_status: doc.status,
            client_name: doc.client_name,
            idioma_raiz: doc.idioma_raiz,
            tipo_trad: doc.tipo_trad,
            
            // Dados de autenticação (não aplicável para documentos regulares)
            authenticated_by_name: null,
            authenticated_by_email: null,
            authentication_date: null,
            source_language: doc.idioma_raiz,
            target_language: doc.tipo_trad,
            
            // Campos obrigatórios da interface
            profiles: doc.profiles,
            documents: {
              filename: doc.filename,
              status: doc.status,
              client_name: doc.client_name,
              idioma_raiz: doc.idioma_raiz,
              tipo_trad: doc.tipo_trad,
              verification_code: doc.verification_code
            }
          });
        }
      }

      // Combinar ambos os tipos de pagamentos
      const documentsWithFinancialData: MappedPayment[] = [...authenticatorPayments, ...regularPayments];

      console.log('✅ Documents with financial data:', documentsWithFinancialData.length);
      console.log('🔍 Debug - Sample payment data:', documentsWithFinancialData.slice(0, 3).map(p => ({
        user_name: p.user_name,
        payment_method: p.payment_method,
        amount: p.amount,
        id: p.id
      })));
      
      // Debug: Calcular total para comparar com StatsCards
      const totalAmount = documentsWithFinancialData.reduce((sum, p) => sum + p.amount, 0);
      console.log('🔍 Debug - Total amount in PaymentsTable:', totalAmount);
      console.log('🔍 Debug - All amounts:', documentsWithFinancialData.map(p => ({ 
        user: p.user_name, 
        amount: p.amount, 
        type: p.id.startsWith('auth-') ? 'authenticator' : 'regular' 
      })));
      
      setPayments(documentsWithFinancialData);

    } catch (err) {
      console.error('💥 Error loading payments:', err);
      setError('An unexpected error occurred while loading payments.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, filterStatus, filterRole]); // Removed searchTerm from here, as filtering is done client-side

  useEffect(() => {
    loadPayments();
  }, [loadPayments]); // Rerun effect when `loadPayments` (memoized) changes

  // Client-side filtering for search term, status, and role
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter(payment => {
      // Filter by status first
      const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
      
      // Filter by role
      const matchesRole = filterRole === 'all' || payment.user_role === filterRole;
      
      // Then filter by search term
      const matchesSearch = searchTerm === '' ||
        payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.document_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.stripe_session_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase()); // Allow searching payment ID

      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [payments, searchTerm, filterStatus, filterRole]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterRole, dateFilter]);


  const handleViewDocument = useCallback(async (payment: MappedPayment) => {
    try {
      console.log('🔍 Fetching document for payment:', payment);
      console.log('🔍 Payment method:', payment.payment_method);
      console.log('🔍 Document ID:', payment.document_id);

      // Buscar dados reais do documento
      let documentData: any = null;
      let documentType: 'authenticator' | 'payment' = 'payment';

      // Primeiro tentar buscar na tabela documents para ver se existe
      console.log('💳 Tentando buscar documento na tabela documents primeiro...');
      const { data: documentCheck, error: docCheckError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', payment.document_id)
        .single();

      // Se não encontrou na tabela documents, é documento de autenticador
      if (docCheckError || !documentCheck) {
        console.log('📋 Documento não encontrado na tabela documents, buscando na documents_to_be_verified...');
        documentType = 'authenticator';
        console.log('🔍 Document type detected:', documentType);
        
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
        // Para pagamentos tradicionais, usar documento já encontrado
        console.log('💳 Usando documento já encontrado na tabela documents');
        console.log('🔍 Document type detected:', documentType);
        documentData = documentCheck;
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
        verification_code: documentData.verification_code || payment.documents?.verification_code,
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
        payment.user_role === 'authenticator' && payment.client_name && payment.client_name !== 'Cliente Padrão'
          ? `${payment.client_name} (${payment.user_name})`
          : payment.authenticated_by_name && payment.client_name && payment.client_name !== 'Cliente Padrão'
          ? `${payment.client_name} (${payment.authenticated_by_name})`
          : payment.user_name || '',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {/* Search */}
          <div className="sm:col-span-2">
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

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" aria-hidden="true" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
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
            dateRange={dateFilter}
            onDateRangeChange={setDateFilter}
            className="w-full"
          />
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
            {paginatedPayments.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                No payments found matching your criteria.
              </div>
            ) : (
              <div className="space-y-3 p-3 sm:p-4">
                {paginatedPayments.map((payment) => (
                  <div key={payment.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {payment.user_role === 'authenticator' && payment.client_name && payment.client_name !== 'Cliente Padrão'
                            ? `${payment.client_name} (${payment.user_name})`
                            : payment.authenticated_by_name && payment.client_name && payment.client_name !== 'Cliente Padrão'
                            ? `${payment.client_name} (${payment.authenticated_by_name})`
                            : payment.user_name || 'Unknown'
                          }
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
                              payment.payment_method === 'stripe' ? '💳 Stripe' :
                              payment.payment_method === 'bank_transfer' ? '🏦 Bank' :
                              payment.payment_method === 'transfer' ? '🏦 Bank' :
                              payment.payment_method === 'zelle' ? '💰 Zelle' :
                              payment.payment_method === 'cash' ? '💵 Cash' :
                              payment.payment_method === 'paypal' ? '📱 PayPal' :
                              payment.payment_method === 'upload' ? '📋 Upload' :
                              payment.payment_method === 'other' ? '🔧 Other' :
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
          <div className="hidden sm:block overflow-x-auto w-full relative">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-white to-transparent w-8 h-full pointer-events-none z-10"></div>
            <table 
              className="min-w-full divide-y divide-gray-200" 
              style={{ 
                minWidth: '100%', 
                tableLayout: 'fixed',
                width: '100%'
              }}
            >
              <colgroup>
                <col style={{ width: '25%', minWidth: '25%', maxWidth: '25%' }} />
                <col style={{ width: '23%', minWidth: '23%', maxWidth: '23%' }} />
                <col style={{ width: '6%', minWidth: '6%', maxWidth: '6%' }} />
                <col style={{ width: '7%', minWidth: '7%', maxWidth: '7%' }} />
                <col style={{ width: '6%', minWidth: '6%', maxWidth: '6%' }} />
                <col style={{ width: '7%', minWidth: '7%', maxWidth: '7%' }} />
                <col style={{ width: '16%', minWidth: '16%', maxWidth: '16%' }} />
                <col style={{ width: '5%', minWidth: '5%', maxWidth: '5%' }} />
                <col style={{ width: '5%', minWidth: '5%', maxWidth: '5%' }} />
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    USER/CLIENT
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Translations
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Authenticator
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      No payments found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-2 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate" title={payment.user_role === 'authenticator' && payment.client_name && payment.client_name !== 'Cliente Padrão'
                            ? `${payment.client_name} (${payment.user_name})`
                            : payment.authenticated_by_name && payment.client_name && payment.client_name !== 'Cliente Padrão'
                            ? `${payment.client_name} (${payment.authenticated_by_name})`
                            : payment.user_name || 'Unknown'}>
                          {payment.user_role === 'authenticator' && payment.client_name && payment.client_name !== 'Cliente Padrão'
                            ? `${payment.client_name} (${payment.user_name})`
                            : payment.authenticated_by_name && payment.client_name && payment.client_name !== 'Cliente Padrão'
                            ? `${payment.client_name} (${payment.authenticated_by_name})`
                            : payment.user_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 truncate" title={payment.user_email || 'No email'}>
                          {payment.user_email || 'No email'}
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="text-sm text-gray-900 truncate" title={payment.document_filename || 'Unknown'}>
                          {payment.document_filename || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {payment.document_id ? `${payment.document_id.substring(0, 8)}...` : 'No ID'}
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          ${payment.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.currency}
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="text-xs text-gray-900">
                          {payment.payment_method ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {payment.payment_method === 'card' ? '💳 Card' :
                                payment.payment_method === 'stripe' ? '💳 Stripe' :
                                payment.payment_method === 'bank_transfer' ? '🏦 Bank' :
                                payment.payment_method === 'transfer' ? '🏦 Bank' :
                                payment.payment_method === 'zelle' ? '💰 Zelle' :
                                payment.payment_method === 'cash' ? '💵 Cash' :
                                payment.payment_method === 'paypal' ? '📱 PayPal' :
                                payment.payment_method === 'upload' ? '📋 Upload' :
                                payment.payment_method === 'other' ? '🔧 Other' :
                                  payment.payment_method}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(payment.document_status)}`}>
                          {payment.document_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <div className="text-sm text-gray-900 truncate" title={payment.authenticated_by_name || 'N/A'}>
                          {payment.authenticated_by_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {payment.authenticated_by_email || 'No auth'}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-sm text-gray-900">
                        {(() => {
                          // Tentar diferentes campos de data em ordem de prioridade
                          const dateToShow = payment.payment_date || 
                                           payment.authentication_date || 
                                           payment.created_at;
                          
                          if (dateToShow) {
                            try {
                              return new Date(dateToShow).toLocaleDateString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit' 
                              });
                            } catch (error) {
                              console.error('Error formatting date:', error);
                              return '-';
                            }
                          }
                          return '-';
                        })()}
                      </td>
                      <td className="px-2 py-4 text-sm font-medium">
                        <button
                          onClick={() => handleViewDocument(payment)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          title={`Details for document ${payment.document_filename}`}
                          aria-label={`Details for document ${payment.document_filename}`}
                        >
                          <Eye className="w-4 h-4" />
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
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
                  {filteredPayments.length !== payments.length && ` (filtered from ${payments.length} total)`}
                </span>
                <span className="font-medium text-green-600">Total: ${filteredPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm border rounded-md ${
                              currentPage === pageNum
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
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