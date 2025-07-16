import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, FileText, Download, XCircle, CheckCircle, Clock, Check, X, Upload as UploadIcon, Eye } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  user_id: string;
  pages?: number;
  status?: string;
  translated_file_url?: string;
  file_url?: string;
  created_at?: string;
  translation_status?: string;
  total_cost?: number;
  source_language?: string;
  target_language?: string;
  is_bank_statement?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AuthenticatorDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStates, setUploadStates] = useState<{ [docId: string]: { file: File | null, uploading: boolean, success: boolean, error: string | null } }>({});
  const [rejectedRows, setRejectedRows] = useState<{ [docId: string]: boolean }>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

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
        const { data, error } = await supabase
          .from('documents_to_be_verified')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('[AuthenticatorDashboard] Error fetching documents:', error);
          if (error.code === '42501' || error.code === 'PGRST301') {
            setError('You do not have permission to access this area.');
          } else {
            setError(error.message);
          }
        } else {
          setDocuments(data || []);
        }
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
    // Buscar o documento original
    const { data: doc, error: fetchError } = await supabase
      .from('documents_to_be_verified')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !doc) return;
    // Atualizar status para 'completed'
    await supabase.from('documents_to_be_verified').update({ status: 'completed' }).eq('id', id);
    // Inserir em translated_documents
    await supabase.from('translated_documents').insert({
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
      verification_code: doc.verification_code
    });
    setDocuments(docs => docs.filter(d => d.id !== id));
  }

  async function handleReject(id: string) {
    await supabase.from('documents_to_be_verified').update({ status: 'rejected' }).eq('id', id);
    setDocuments(docs => docs.filter(doc => doc.id !== id));
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
      // Inserir na tabela translated_documents
      const { error: insertError } = await supabase.from('translated_documents').insert({
        original_document_id: doc.id,
        user_id: doc.user_id, // ou autenticador logado, se disponível
        filename: state.file.name,
        translated_file_url: publicUrl,
        source_language: doc.source_language,
        target_language: doc.target_language,
        pages: doc.pages,
        status: 'completed', // sempre completed
        total_cost: doc.total_cost,
        is_authenticated: true, // sempre true
        verification_code: originalDoc.verification_code
      });
      if (insertError) throw insertError;
      setUploadStates(prev => ({ ...prev, [doc.id]: { ...state, uploading: false, success: true, error: null } }));
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

  // Summary cards
  const pendingCount = documents.filter(doc => doc.status === 'pending').length;
  const approvedCount = documents.filter(doc => doc.status === 'completed').length;
  const rejectedCount = documents.filter(doc => doc.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
          <ShieldCheck className="w-12 h-12 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Authenticator Dashboard</h1>
            <p className="text-gray-600 mt-1">Approve or reject translated documents submitted for verification. Only authenticators have access to this panel.</p>
          </div>
        </div>
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-900" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-6 h-6 text-green-900" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{approvedCount}</div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <X className="w-6 h-6 text-red-900" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{rejectedCount}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </div>
        </div>
        {/* Documents Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-700" /> Documents to Authenticate
          </h2>
          {loading && <p className="text-blue-700">Loading documents...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          <table className="min-w-full bg-white border rounded-lg shadow">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-2">Original File</th>
                <th className="px-4 py-2">Translated File</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">View User</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Language</th>
                <th className="px-4 py-2">Bank Statement?</th>
                <th className="px-4 py-2">Pages</th>
                <th className="px-4 py-2">Submitted At</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => {
                return (
                  <tr key={doc.id} className="border-t hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2">
                      <a href={doc.file_url || ''} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium">{doc.filename}</a>
                    </td>
                    <td className="px-4 py-2">
                      {doc.translated_file_url ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(doc.translated_file_url || '', '_blank', 'noopener,noreferrer')}
                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors font-medium shadow"
                            title="View PDF"
                          >
                            <FileText className="inline w-4 h-4 mb-1" /> View
                          </button>
                          <button
                            className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700 transition-colors font-medium shadow"
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
                            <Download className="inline w-4 h-4 mb-1" /> Download
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <span className="text-gray-400 mr-2">Not available</span>
                          <button className="flex items-center gap-1 bg-gray-200 text-gray-400 px-3 py-1 rounded cursor-not-allowed" disabled title="No file to download">
                            <Download className="inline w-4 h-4 mb-1" /> Download
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">{doc.user_id}</td>
                    <td className="px-4 py-2">
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        title="View user information"
                        onClick={() => handleViewUser(doc.user_id)}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="px-4 py-2">{doc.translation_status || '-'}</td>
                    <td className="px-4 py-2">{typeof doc.total_cost === 'number' ? `$${doc.total_cost.toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-2">{doc.source_language && doc.target_language ? `${doc.source_language} → ${doc.target_language}` : (doc.source_language || '-')}</td>
                    <td className="px-4 py-2">{doc.is_bank_statement ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{doc.pages}</td>
                    <td className="px-4 py-2">{doc.created_at ? new Date(doc.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {rejectedRows[doc.id] ? (
                        <div className="flex flex-col gap-2 w-56">
                          <label className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded px-2 py-1 bg-gray-50 hover:bg-gray-100">
                            <UploadIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-700">Select PDF</span>
                            <input type="file" accept="application/pdf" className="hidden" onChange={e => {
                              const file = e.target.files?.[0] || null;
                              setUploadStates(prev => ({ ...prev, [doc.id]: { file, uploading: false, success: false, error: null } }));
                            }} />
                          </label>
                          <button
                            className="bg-blue-600 text-white rounded px-3 py-1 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={!uploadStates[doc.id]?.file || uploadStates[doc.id]?.uploading}
                            onClick={() => handleCorrectionUpload(doc)}
                          >
                            {uploadStates[doc.id]?.uploading ? 'Uploading...' : 'Send Correction'}
                          </button>
                          {uploadStates[doc.id]?.success && <span className="text-green-600 text-xs">Correction sent!</span>}
                          {uploadStates[doc.id]?.error && <span className="text-red-600 text-xs">{uploadStates[doc.id]?.error}</span>}
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleApprove(doc.id)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"><CheckCircle className="w-4 h-4" />Approve</button>
                          <button onClick={() => setRejectedRows(prev => ({ ...prev, [doc.id]: true }))} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"><XCircle className="w-4 h-4" />Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {documents.length === 0 && !loading && <p className="mt-6 text-gray-500">No pending documents for authentication.</p>}
        </div>
      </div>
      {/* Modal de informações do usuário */}
      {userModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 min-w-[320px] relative animate-fade-in">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setUserModalOpen(false)}
              aria-label="Close modal"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-gray-900">User Information</h3>
            {userLoading && <p className="text-blue-700">Loading...</p>}
            {userError && <p className="text-red-500">{userError}</p>}
            {selectedUser && (
              <div className="space-y-2">
                <div><span className="font-medium text-gray-700">Name:</span> {selectedUser.name}</div>
                <div><span className="font-medium text-gray-700">Email:</span> {selectedUser.email}</div>
                <div><span className="font-medium text-gray-700">Role:</span> {selectedUser.role}</div>
                <div><span className="font-medium text-gray-700">ID:</span> {selectedUser.id}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 