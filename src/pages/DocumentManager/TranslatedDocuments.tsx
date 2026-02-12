import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Download, Calendar, DollarSign, User, CheckCircle, XCircle, Eye } from 'lucide-react';
import { getValidFileUrl } from '../../utils/fileUtils';
import { DocumentViewerModal } from '../../components/DocumentViewerModal';
import { TranslatedDocumentsFilters } from '../../components/TranslatedDocumentsFilters';
import { DateRange } from '../../components/DateRangeFilter';

interface TranslatedDocument {
  id: string;
  original_document_id: string;
  user_id: string;
  filename: string;
  translated_file_url: string;
  source_language: string;
  target_language: string;
  pages: number | null;
  status: string;
  total_cost: number | null;
  verification_code: string;
  is_authenticated: boolean;
  upload_date: string;
  created_at: string | null;
  updated_at: string | null;
  // Campos de auditoria
  authenticated_by?: string | null;
  authenticated_by_name?: string | null;
  authenticated_by_email?: string | null;
  authentication_date?: string | null;
  // Dados do usuário
  user_name?: string | null;
  user_email?: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TranslatedDocuments() {
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<TranslatedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [docToView, setDocToView] = useState<{ url: string; filename: string } | null>(null);
  const [actionDoc, setActionDoc] = useState<TranslatedDocument | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
    preset: 'all'
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 10;

  useEffect(() => {
    async function fetchTranslatedDocuments() {
      if (!user) return;

      setLoading(true);
      setError(null);
      try {
        console.log('[TranslatedDocuments] Fetching documents for authenticator:', user.id);

        // Se for admin, mostra todos os documentos. Se for authenticator, mostra apenas os que ele autenticou
        let query = supabase
          .from('translated_documents')
          .select(`
            *,
            profiles:user_id (
              name,
              email
            )
          `);

        // Se não for admin, filtra apenas os documentos autenticados pelo usuário atual
        if (user.role !== 'admin') {
          query = query.eq('authenticated_by', user.id);
        }

        // Aplicar filtros de data se fornecidos
        if (dateRange.startDate) {
          const startDate = new Date(dateRange.startDate);
          startDate.setHours(0, 0, 0, 0);
          query = query.gte('created_at', startDate.toISOString());
        }

        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endDate.toISOString());
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('[TranslatedDocuments] Error fetching documents:', error);
          setError(error.message);
        } else {
          const documentsWithUserData = (data as any[] || []).map(doc => ({
            ...doc,
            user_name: doc.profiles?.name || null,
            user_email: doc.profiles?.email || null
          })) as TranslatedDocument[];
          setDocuments(documentsWithUserData);
          console.log('[TranslatedDocuments] Found documents:', documentsWithUserData.length);
        }
      } catch (err) {
        console.error('[TranslatedDocuments] Unexpected error:', err);
        setError('Unexpected error while fetching documents.');
      } finally {
        setLoading(false);
      }
    }
    fetchTranslatedDocuments();
  }, [user, dateRange]);

  // Aplicar filtros locais (busca e status)
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Filtro de busca textual
      const matchesSearch = searchTerm === '' ||
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'authenticated' && doc.is_authenticated) ||
        (statusFilter === 'pending' && !doc.is_authenticated);

      return matchesSearch && matchesStatus;
    });
  }, [documents, searchTerm, statusFilter]);

  // Reset página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateRange]);


  async function handleViewUser(userId: string) {
    setUserLoading(true);
    setUserError(null);
    setSelectedUser(null);
    setUserModalOpen(true);
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', userId)
        .single();
      if (error || !user) {
        setUserError('Erro ao buscar informações do usuário.');
      } else {
        setSelectedUser(user);
      }
    } catch (err) {
      setUserError('Erro inesperado ao buscar usuário.');
    } finally {
      setUserLoading(false);
    }
  }

  // Summary cards - usar documentos filtrados
  const totalDocuments = filteredDocuments.length;
  const totalValue = filteredDocuments.reduce((sum, doc) => sum + (doc.total_cost || 0), 0);
  const totalPages = filteredDocuments.reduce((sum, doc) => sum + (doc.pages || 0), 0);

  // Paginação - usar documentos filtrados
  const totalPagesForPagination = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const endIndex = startIndex + documentsPerPage;
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Verificar se está carregando ou se não há usuário
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-tfe-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-tfe-red-600">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight uppercase">
            Translated Documents
          </h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">
            {user?.role === 'admin'
              ? 'View all documents that have been translated and sent to clients'
              : 'View documents that you have authenticated and sent to clients'
            }
          </p>
        </div>

        {/* Filters */}
        <TranslatedDocumentsFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          totalDocuments={documents.length}
          filteredDocuments={filteredDocuments.length}
        />

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 pt-8">
          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-[#163353]/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#163353]/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Documents</p>
                <p className="text-3xl sm:text-4xl font-black text-[#163353]">{totalDocuments}</p>
              </div>
              <div className="w-14 h-14 bg-[#163353]/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-[#163353]/20 group-hover:bg-[#163353]/20 transition-colors">
                <FileText className="w-7 h-7 text-[#163353]" />
              </div>
            </div>
          </div>

          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-green-500/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Value</p>
                <p className="text-3xl sm:text-4xl font-black text-green-700">${totalValue.toFixed(2)}</p>
              </div>
              <div className="w-14 h-14 bg-green-500/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                <DollarSign className="w-7 h-7 text-green-700" />
              </div>
            </div>
          </div>

          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-purple-500/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Pages</p>
                <p className="text-3xl sm:text-4xl font-black text-purple-700">{totalPages}</p>
              </div>
              <div className="w-14 h-14 bg-purple-500/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                <Calendar className="w-7 h-7 text-purple-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg border border-gray-200 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#163353]/5 rounded-full blur-[100px] pointer-events-none" />

          {loading && (
            <div className="relative flex flex-col items-center justify-center py-12">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-[#163353]/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-12 h-12 border-4 border-[#163353] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-[#163353] font-black uppercase tracking-[0.3em] text-xs">Loading Documents...</p>
            </div>
          )}
          {error && (
            <div className="relative text-center py-12 bg-[#C71B2D]/5 rounded-[24px] border border-[#C71B2D]/20">
              <p className="text-[#C71B2D] font-bold text-lg">Error: {error}</p>
            </div>
          )}

          {/* Mobile Cards View */}
          <div className="relative block sm:hidden space-y-4">
            {currentDocuments.map(doc => (
              <div key={doc.id} className="relative group bg-white/60 backdrop-blur-sm rounded-[24px] p-5 border border-gray-200 hover:border-[#163353]/40 hover:shadow-lg transition-all">
                <div className="space-y-3">
                  {/* Document Name */}
                  <div>
                    <span className="text-[#163353] font-black text-sm">
                      {doc.filename}
                    </span>
                  </div>

                  {/* Document Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/50 rounded-[16px] p-3 border border-gray-100">
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Value</span>
                      <span className="font-bold text-[#C71B2D]">${doc.total_cost?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Pages</span>
                      <span className="font-bold text-gray-900">{doc.pages}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Language</span>
                      <span className="font-bold text-gray-900">{doc.source_language} → {doc.target_language}</span>
                    </div>
                    <div>
                      <span className="font-black text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${doc.is_authenticated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {doc.is_authenticated ? 'Authenticated' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900 truncate max-w-32" title={doc.user_name || doc.user_id}>
                        {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                      </span>
                    </div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-[12px] text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
                      title="Open details"
                      onClick={() => {
                        setActionDoc(doc);
                        setActionModalOpen(true);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                  </div>

                  {/* Authentication Info */}
                  {doc.authenticated_by_name && (
                    <div className="pt-2 border-t border-gray-200 bg-green-50/50 -mx-5 -mb-5 px-5 pb-5 mt-3 rounded-b-[24px]">
                      <div className="flex items-center gap-2 text-xs font-bold text-green-800">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>Authenticated by {doc.authenticated_by_name}</span>
                      </div>
                      {doc.authentication_date && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          {new Date(doc.authentication_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="relative hidden sm:block overflow-x-auto scrollbar-standard">
            <table className="w-full bg-white/50 backdrop-blur-sm border border-gray-200 rounded-[20px] shadow-sm overflow-hidden">
              <thead className="bg-[#163353]/10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Document</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Client</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Value</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Language</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Authenticated By</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Sent Date</th>
                  <th className="px-4 py-3 text-left font-black text-xs uppercase tracking-widest text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentDocuments.map(doc => {
                  return (
                    <tr key={doc.id} className="border-t border-gray-200 hover:bg-[#163353]/5 transition-all group">
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-[#163353] font-black text-sm">
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 truncate max-w-32" title={doc.user_name || doc.user_id}>
                            {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-black text-sm text-[#C71B2D]">
                        ${doc.total_cost?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {doc.source_language} → {doc.target_language}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {doc.authenticated_by_name ? (
                          <div>
                            <div className="font-black text-gray-900">{doc.authenticated_by_name}</div>
                            <div className="text-xs text-gray-500 font-medium">{doc.authenticated_by_email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">Not authenticated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setActionDoc(doc);
                            setActionModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-[12px] text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all hover:scale-105"
                          title="Open details"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!loading && !error && filteredDocuments.length === 0 && (
            <div className="relative text-center py-16">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gray-300/20 blur-2xl rounded-full" />
                <FileText className="relative w-16 h-16 mx-auto text-gray-300" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">No Documents Found</h3>
              <p className="text-gray-500 font-medium">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Controles de Paginação */}
          {filteredDocuments.length > 0 && (
            <div className="relative px-6 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-[30px] mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm font-bold text-gray-700 text-center sm:text-left">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length} documents
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-black uppercase tracking-wider text-gray-700 bg-white border border-gray-300 rounded-[12px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPagesForPagination }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-black rounded-[12px] transition-all hover:scale-105 ${currentPage === page
                          ? 'bg-[#163353] text-white shadow-md'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPagesForPagination}
                    className="px-4 py-2 text-sm font-black uppercase tracking-wider text-gray-700 bg-white border border-gray-300 rounded-[12px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de informações do usuário */}
      {userModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-md z-50 p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 w-full max-w-md border border-white/20">
            <button
              className="absolute top-4 right-4 p-3 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-[16px] transition-all hover:scale-105 active:scale-95 shadow-lg"
              onClick={() => setUserModalOpen(false)}
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#163353]/10 backdrop-blur-sm rounded-[20px] flex items-center justify-center border border-[#163353]/20">
                <User className="w-7 h-7 text-[#163353]" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Client Information</h3>
            </div>
            {userLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#163353] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {userError && (
              <div className="bg-[#C71B2D]/5 border border-[#C71B2D]/20 rounded-[16px] p-4">
                <p className="text-[#C71B2D] font-bold text-lg">{userError}</p>
              </div>
            )}
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Name</span>
                  <span className="font-bold text-gray-900">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Email</span>
                  <span className="font-bold text-gray-900 break-all">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Role</span>
                  <span className="font-bold text-gray-900 uppercase">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-xs">ID</span>
                  <span className="text-gray-900 font-mono text-xs font-bold break-all">{selectedUser.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      {showDocViewer && docToView && (
        <DocumentViewerModal
          url={docToView.url}
          filename={docToView.filename}
          onClose={() => {
            setShowDocViewer(false);
            setDocToView(null);
          }}
        />
      )}
      {actionModalOpen && actionDoc && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-md z-50 p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 w-full max-w-lg border border-white/20">
            <button
              className="absolute top-4 right-4 p-3 bg-[#C71B2D] hover:bg-[#A01624] text-white rounded-[16px] transition-all hover:scale-105 active:scale-95 shadow-lg"
              onClick={() => {
                setActionModalOpen(false);
                setActionDoc(null);
              }}
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Document Details</h3>
                <p
                  className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] truncate max-w-[360px]"
                  title={actionDoc.filename}
                >
                  {actionDoc.filename}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Client</div>
                <div className="font-bold text-gray-900">{actionDoc.user_name || actionDoc.user_email || actionDoc.user_id}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Value</div>
                <div className="font-black text-[#C71B2D]">${actionDoc.total_cost?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Language</div>
                <div className="font-bold text-gray-900">{actionDoc.source_language} → {actionDoc.target_language}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Pages</div>
                <div className="font-bold text-gray-900">{actionDoc.pages}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Status</div>
                <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black uppercase ${actionDoc.is_authenticated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {actionDoc.is_authenticated ? 'Authenticated' : 'Pending'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Code</div>
                <div className="font-mono font-bold text-gray-900">{actionDoc.verification_code}</div>
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Authenticated By</div>
                <div className="font-bold text-gray-900">
                  {actionDoc.authenticated_by_name || 'Not authenticated'}
                </div>
                {actionDoc.authenticated_by_email && (
                  <div className="text-xs text-gray-500 font-medium">{actionDoc.authenticated_by_email}</div>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-gray-400 font-black uppercase tracking-widest text-xs">Sent Date</div>
                <div className="font-bold text-gray-900">
                  {actionDoc.created_at ? new Date(actionDoc.created_at).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={async () => {
                  try {
                    if (!actionDoc.translated_file_url) {
                      alert('No PDF file available to view.');
                      return;
                    }

                    const validUrl = await getValidFileUrl(actionDoc.translated_file_url);
                    setDocToView({ url: validUrl, filename: actionDoc.filename });
                    setShowDocViewer(true);
                  } catch (error) {
                    console.error('Error opening PDF:', error);
                    alert((error as Error).message || 'Failed to open PDF.');
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-[14px] text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
                title="View PDF"
              >
                <FileText className="w-4 h-4" /> View PDF
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-[14px] text-xs font-black uppercase tracking-wider hover:bg-green-700 transition-all"
                onClick={async e => {
                  e.preventDefault();
                  try {
                    const validUrl = await getValidFileUrl(actionDoc.translated_file_url || '');
                    const response = await fetch(validUrl);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = actionDoc.filename || 'translated_document.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Error downloading file:', err);
                    alert((err as Error).message || 'Failed to download file.');
                  }
                }}
                title="Download PDF"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 