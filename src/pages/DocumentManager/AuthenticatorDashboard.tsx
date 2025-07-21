import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FileText, Check, X, Clock, ShieldCheck, Download, User, Mail, Calendar, DollarSign, AlertCircle, CheckCircle, XCircle, Eye, Trash2, Upload, RefreshCw, Upload as UploadIcon, Phone } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  user_id: string;
  pages?: number | null;
  status?: string;
  translated_file_url?: string | null;
  file_url?: string | null;
  created_at?: string | null;
  translation_status?: string;
  total_cost?: number | null;
  source_language?: string;
  target_language?: string;
  is_bank_statement?: boolean;
  verification_code?: string;
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
  phone: string | null;
  role: string;
}

export default function AuthenticatorDashboard() {
  const { user: currentUser } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStates, setUploadStates] = useState<{ [docId: string]: { file: File | null, uploading: boolean, success: boolean, error: string | null } }>({});
  const [rejectedRows, setRejectedRows] = useState<{ [docId: string]: boolean }>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  
  // Estatísticas separadas
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 10;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[AuthenticatorDashboard] localStorage:', window.localStorage);
    }
  }, []);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError(null);
      try {
        console.log('[AuthenticatorDashboard] Buscando documentos...');
        
        // Buscar todos os documentos para estatísticas
        const { data: allDocs, error: statsError } = await supabase
          .from('documents_to_be_verified')
          .select(`
            *,
            profiles:user_id (
              name,
              email
            )
          `)
          .order('created_at', { ascending: false });
        
        if (statsError) {
          console.error('[AuthenticatorDashboard] Error fetching all documents:', statsError);
          if (statsError.code === '42501' || statsError.code === 'PGRST301') {
            setError('You do not have permission to access this area.');
          } else {
            setError(statsError.message);
          }
          return;
        }

        // Calcular estatísticas
        const allDocuments = (allDocs as any[] || []).map(doc => ({
          ...doc,
          user_name: doc.profiles?.name || null,
          user_email: doc.profiles?.email || null
        })) as Document[];
        
        // Log para debug do is_bank_statement
        console.log('[AuthenticatorDashboard] Documentos com is_bank_statement:');
        allDocuments.forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.filename}: is_bank_statement = ${doc.is_bank_statement}`);
        });
        
        const pendingCount = allDocuments.filter(doc => doc.status === 'pending').length;
        const approvedCount = allDocuments.filter(doc => doc.status === 'completed').length;
        const rejectedCount = allDocuments.filter(doc => doc.status === 'rejected').length;
        
        setStats({
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount
        });

        // Filtrar apenas documentos pendentes para a lista
        const pendingDocs = allDocuments.filter(doc => doc.status === 'pending');
        setDocuments(pendingDocs);
        
        console.log('[AuthenticatorDashboard] Estatísticas calculadas:', { pendingCount, approvedCount, rejectedCount });
        console.log('[AuthenticatorDashboard] Documentos pendentes:', pendingDocs.length);
        
      } catch (err) {
        console.error('[AuthenticatorDashboard] Unexpected error:', err);
        setError('Unexpected error while fetching documents.');
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  async function handleApprove(id: string) {
    if (!currentUser) return;
    
    console.log('[AuthenticatorDashboard] Aprovando documento:', id);
    
    // Buscar o documento original
    const { data: doc, error: fetchError } = await supabase
      .from('documents_to_be_verified')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !doc) {
      console.error('[AuthenticatorDashboard] Erro ao buscar documento:', fetchError);
      return;
    }
    
    // Dados do autenticador
    const authData = {
      authenticated_by: currentUser.id,
      authenticated_by_name: currentUser.user_metadata?.name || currentUser.email,
      authenticated_by_email: currentUser.email,
      authentication_date: new Date().toISOString()
    };
    
    // Atualizar status para 'completed' com dados do autenticador
    const { error: updateError } = await supabase
      .from('documents_to_be_verified')
      .update({ 
        status: 'completed',
        ...authData
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('[AuthenticatorDashboard] Erro ao atualizar documento:', updateError);
      alert('Erro ao aprovar documento. Tente novamente.');
      return;
    }
    
    // Inserir em translated_documents com dados do autenticador
    const { error: insertError } = await supabase.from('translated_documents').insert({
      original_document_id: doc.id,
      user_id: doc.user_id,
      filename: doc.filename,
      translated_file_url: doc.translated_file_url,
      source_language: doc.source_language,
      target_language: doc.target_language,
      pages: doc.pages,
      status: 'completed',
      total_cost: doc.total_cost,
      is_authenticated: true,
      verification_code: doc.verification_code,
      ...authData
    } as any);
    
    if (insertError) {
      console.error('[AuthenticatorDashboard] Erro ao inserir em translated_documents:', insertError);
    }
    
    // Atualizar estatísticas
    setStats(prev => ({
      ...prev,
      pending: prev.pending - 1,
      approved: prev.approved + 1
    }));
    
    // Remover documento da lista
    setDocuments(docs => docs.filter(d => d.id !== id));
    
    console.log('[AuthenticatorDashboard] Documento aprovado com sucesso');
  }

  async function handleReject(id: string) {
    if (!currentUser) return;
    
    console.log('[AuthenticatorDashboard] Rejeitando documento:', id);
    
    // Dados do autenticador
    const authData = {
      authenticated_by: currentUser.id,
      authenticated_by_name: currentUser.user_metadata?.name || currentUser.email,
      authenticated_by_email: currentUser.email,
      authentication_date: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('documents_to_be_verified')
      .update({ 
        status: 'rejected',
        ...authData
      })
      .eq('id', id);
    
    if (updateError) {
      console.error('[AuthenticatorDashboard] Erro ao rejeitar documento:', updateError);
      alert('Erro ao rejeitar documento. Tente novamente.');
      return;
    }
    
    // Atualizar estatísticas
    setStats(prev => ({
      ...prev,
      pending: prev.pending - 1,
      rejected: prev.rejected + 1
    }));
    
    // Remover documento da lista
    setDocuments(docs => docs.filter(doc => doc.id !== id));
    
    console.log('[AuthenticatorDashboard] Documento rejeitado com sucesso');
  }

  async function handleCorrectionUpload(doc: Document) {
    const state = uploadStates[doc.id];
    if (!state || !state.file) return;
    setUploadStates(prev => ({ ...prev, [doc.id]: { ...state, uploading: true, error: null, success: false } }));
    try {
      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`corrections/${doc.id}_${Date.now()}_${state.file.name}`, state.file, { upsert: true });
      if (uploadError) throw uploadError;
      const filePath = uploadData?.path;
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;
      // Buscar verification_code do documento original
      const { data: originalDoc, error: fetchError } = await supabase
        .from('documents_to_be_verified')
        .select('verification_code')
        .eq('id', doc.id)
        .single();
      if (fetchError || !originalDoc) throw new Error('Não foi possível obter o verification_code do documento original.');
      
      // Dados do autenticador
      const authData = {
        authenticated_by: currentUser?.id,
        authenticated_by_name: currentUser?.user_metadata?.name || currentUser?.email,
        authenticated_by_email: currentUser?.email,
        authentication_date: new Date().toISOString()
      };
      
      // Inserir na tabela translated_documents com dados do autenticador
      const { error: insertError } = await supabase.from('translated_documents').insert({
        original_document_id: doc.id,
        user_id: doc.user_id,
        filename: state.file.name,
        translated_file_url: publicUrl,
        source_language: doc.source_language,
        target_language: doc.target_language,
        pages: doc.pages,
        status: 'completed',
        total_cost: doc.total_cost,
        is_authenticated: true,
        verification_code: originalDoc.verification_code,
        ...authData
      } as any);
      if (insertError) throw insertError;
      
      // Atualizar status do documento original para 'completed' com dados do autenticador
      await supabase
        .from('documents_to_be_verified')
        .update({ 
          status: 'completed',
          ...authData
        })
        .eq('id', doc.id);
      
      // Remover o documento da lista após sucesso
      setDocuments(docs => docs.filter(d => d.id !== doc.id));
      setUploadStates(prev => ({ ...prev, [doc.id]: { file: null, uploading: false, success: false, error: null } }));
      setRejectedRows(prev => ({ ...prev, [doc.id]: false }));
    } catch (err: any) {
      setUploadStates(prev => ({ ...prev, [doc.id]: { ...state, uploading: false, success: false, error: err.message || 'Upload failed' } }));
    }
  }

  async function handleViewUser(userId: string) {
    setUserLoading(true);
    setUserError(null);
    setSelectedUser(null);
    setUserModalOpen(true);
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, role')
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

  // Paginação
  const totalPages = Math.ceil(documents.length / documentsPerPage);
  const startIndex = (currentPage - 1) * documentsPerPage;
  const endIndex = startIndex + documentsPerPage;
  const currentDocuments = documents.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 sm:gap-6">
            <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Authenticator Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Approve or reject translated documents submitted for verification. Only authenticators have access to this panel.</p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.pending}</div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 sm:w-7 sm:h-7 text-green-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.approved}</div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Approved</div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <X className="w-6 h-6 sm:w-7 sm:h-7 text-red-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats.rejected}</div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Rejected</div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center gap-3">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-700" /> Documents to Authenticate
          </h2>
          {loading && <p className="text-blue-700 text-base sm:text-lg">Loading documents...</p>}
          {error && <p className="text-red-500 text-base sm:text-lg">Error: {error}</p>}
          
          {/* Mobile Cards View */}
          <div className="block sm:hidden space-y-4">
            {currentDocuments.map(doc => (
              <div key={doc.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  {/* Document Name */}
                  <div>
                    <a href={doc.file_url || ''} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium hover:text-blue-900 transition-colors text-sm">
                      {doc.filename}
                    </a>
                  </div>

                  {/* Document Actions */}
                  {doc.translated_file_url && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(doc.translated_file_url || '', '_blank', 'noopener,noreferrer')}
                        className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors font-medium"
                        title="View PDF"
                      >
                        <FileText className="w-3 h-3" /> View
                      </button>
                      <button
                        className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition-colors font-medium"
                        onClick={async e => {
                          e.preventDefault();
                          try {
                            const response = await fetch(doc.translated_file_url || '');
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = (doc.filename ? String(doc.filename) : 'document.pdf');
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                          } catch (err) {
                            alert('Failed to download file.');
                          }
                        }}
                        title="Download PDF"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  )}

                  {/* Document Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Value:</span>
                      <span className="ml-1">{typeof doc.total_cost === 'number' ? `$${doc.total_cost.toFixed(2)}` : '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Pages:</span>
                      <span className="ml-1">{doc.pages}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Language:</span>
                      <span className="ml-1">{doc.source_language && doc.target_language ? `${doc.source_language} → ${doc.target_language}` : (doc.source_language || '-')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Bank:</span>
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_bank_statement ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {doc.is_bank_statement ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 truncate max-w-32" title={doc.user_name || doc.user_id}>
                        {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                      </span>
                      <button
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="View user information"
                        onClick={() => handleViewUser(doc.user_id)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-gray-200">
                    {rejectedRows[doc.id] ? (
                      <div className="space-y-3">
                        {/* File Upload Area */}
                        <div className="relative">
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <UploadIcon className="w-6 h-6 mb-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                              <p className="mb-1 text-sm text-gray-600">
                                <span className="font-medium text-blue-600 hover:text-blue-500">Click to select</span> or drag file
                              </p>
                              <p className="text-xs text-gray-500">PDF only</p>
                            </div>
                            <input 
                              type="file" 
                              accept="application/pdf" 
                              className="hidden" 
                              onChange={e => {
                                const file = e.target.files?.[0] || null;
                                setUploadStates(prev => ({ ...prev, [doc.id]: { file, uploading: false, success: false, error: null } }));
                              }} 
                            />
                          </label>
                          
                          {/* Selected File Display */}
                          {uploadStates[doc.id]?.file && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-xs text-blue-800 font-medium truncate">
                                  {uploadStates[doc.id]?.file?.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Send Button */}
                        <button
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-4 py-3 font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                          disabled={!uploadStates[doc.id]?.file || uploadStates[doc.id]?.uploading}
                          onClick={() => handleCorrectionUpload(doc)}
                        >
                          {uploadStates[doc.id]?.uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Sending correction...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <UploadIcon className="w-4 h-4" />
                              Send Correction
                            </div>
                          )}
                        </button>

                        {/* Status Messages */}
                        {uploadStates[doc.id]?.success && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 text-xs font-medium">Correction sent successfully!</span>
                          </div>
                        )}
                        {uploadStates[doc.id]?.error && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-700 text-xs">{uploadStates[doc.id]?.error}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(doc.id)} className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 transition-colors font-medium">
                          <CheckCircle className="w-3 h-3" />Approve
                        </button>
                        <button onClick={() => setRejectedRows(prev => ({ ...prev, [doc.id]: true }))} className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 transition-colors font-medium">
                          <XCircle className="w-3 h-3" />Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full bg-white border rounded-lg shadow">
            <thead className="bg-blue-50">
              <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Document</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Value</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Language</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Details</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
                {currentDocuments.map(doc => {
                return (
                  <tr key={doc.id} className="border-t hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div>
                            <a href={doc.file_url || ''} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium hover:text-blue-900 transition-colors text-sm">
                              {doc.filename}
                            </a>
                          </div>
                          {doc.translated_file_url && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(doc.translated_file_url || '', '_blank', 'noopener,noreferrer')}
                                className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors font-medium"
                            title="View PDF"
                          >
                                <FileText className="w-3 h-3" /> View
                          </button>
                          <button
                                className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition-colors font-medium"
                            onClick={async e => {
                              e.preventDefault();
                              try {
                                const response = await fetch(doc.translated_file_url || '');
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = (doc.filename ? String(doc.filename) : 'document.pdf');
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                              } catch (err) {
                                alert('Failed to download file.');
                              }
                            }}
                            title="Download PDF"
                          >
                                <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                          )}
                        </div>
                    </td>
                      <td className="px-4 py-3">
                      {rejectedRows[doc.id] ? (
                          <div className="flex flex-col gap-3 w-64">
                            {/* File Upload Area */}
                            <div className="relative">
                              <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                                <div className="flex items-center justify-center">
                                  <UploadIcon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                  <span className="text-sm text-gray-600 group-hover:text-blue-600">
                                    Select PDF
                                  </span>
                                </div>
                                <input 
                                  type="file" 
                                  accept="application/pdf" 
                                  className="hidden" 
                                  onChange={e => {
                                    const file = e.target.files?.[0] || null;
                                    setUploadStates(prev => ({ ...prev, [doc.id]: { file, uploading: false, success: false, error: null } }));
                                  }} 
                                />
                              </label>
                              
                              {/* Selected File Display */}
                              {uploadStates[doc.id]?.file && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-blue-600" />
                                    <span className="text-xs text-blue-800 font-medium truncate">
                                      {uploadStates[doc.id]?.file?.name}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Send Button */}
                            <button
                              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-3 py-2 font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm hover:shadow-md"
                              disabled={!uploadStates[doc.id]?.file || uploadStates[doc.id]?.uploading}
                              onClick={() => handleCorrectionUpload(doc)}
                            >
                              {uploadStates[doc.id]?.uploading ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Sending...
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <UploadIcon className="w-3 h-3" />
                                  Send Correction
                                </div>
                              )}
                            </button>

                            {/* Status Messages */}
                            {uploadStates[doc.id]?.success && (
                              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                <span className="text-green-700 text-xs font-medium">Sent!</span>
                              </div>
                            )}
                            {uploadStates[doc.id]?.error && (
                              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                                <XCircle className="w-3 h-3 text-red-600" />
                                <span className="text-red-700 text-xs">{uploadStates[doc.id]?.error}</span>
                              </div>
                            )}
                          </div>
                      ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(doc.id)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors font-medium">
                              <CheckCircle className="w-3 h-3" />Approve
                            </button>
                            <button onClick={() => setRejectedRows(prev => ({ ...prev, [doc.id]: true }))} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors font-medium">
                              <XCircle className="w-3 h-3" />Reject
                            </button>
                          </div>
                      )}
                    </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 truncate max-w-32" title={doc.user_name || doc.user_id}>
                            {doc.user_name || `${doc.user_id.slice(0, 8)}...`}
                          </span>
                          <button
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="View user information"
                            onClick={() => handleViewUser(doc.user_id)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-sm">
                        {typeof doc.total_cost === 'number' ? `$${doc.total_cost.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {doc.source_language && doc.target_language ? `${doc.source_language} → ${doc.target_language}` : (doc.source_language || '-')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Pages:</span>
                            <span>{doc.pages}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Type:</span>
                            <span>{doc.translation_status || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Bank:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_bank_statement ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {doc.is_bank_statement ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                      </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {documents.length === 0 && !loading && <p className="mt-8 text-gray-500 text-center text-base sm:text-lg">No pending documents for authentication.</p>}
          
          {/* Controles de Paginação */}
          {documents.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-700 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, documents.length)} of {documents.length} documents
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de informações do usuário */}
      {userModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-md sm:min-w-[400px] relative animate-fade-in">
            <button
              className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setUserModalOpen(false)}
              aria-label="Close modal"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h3 className="text-xl font-bold mb-6 text-gray-900">User Information</h3>
            {userLoading && <p className="text-blue-700 text-lg">Loading...</p>}
            {userError && <p className="text-red-500 text-lg">{userError}</p>}
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="text-gray-900">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="text-gray-900">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone:
                  </span>
                  <span className="text-gray-900">{selectedUser.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Role:</span>
                  <span className="text-gray-900">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">ID:</span>
                  <span className="text-gray-900 font-mono text-sm">{selectedUser.id}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 