import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useOverview } from '../../contexts/OverviewContext';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentsWithMissingFiles } from '../../hooks/useDocumentsWithMissingFiles';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  BarChart3,
  Upload,
  XCircle
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';


interface AuthenticatorOverviewProps {
  onNavigate?: (page: 'authenticate' | 'translated' | 'upload') => void;
}

export default function AuthenticatorOverview() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { stats, loading, error } = useOverview();
  const { count: missingFileCount } = useDocumentsWithMissingFiles();
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'activity'>('pending');
  const [actionDoc, setActionDoc] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [modalDocumentName, setModalDocumentName] = useState('');
  const [modalDocumentId, setModalDocumentId] = useState('');

  // Estados para rejeição/correção (simplificado para Overview - enviando usuario para Dashboard para correções complexas se necessario, 
  // mas o user pediu "aprovar ja ou recusar" - vamos tentar implementar o modal de correção tambem?)
  // Para manter consistencia e simplicidade visual na Overview, o approve é facil e direto. 
  // O Reject precisa de upload. Se eu colocar o upload no modal de confirmação fica ok.
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [uploadState, setUploadState] = useState<{file: File | null; uploading: boolean; error: string | null}>({
    file: null,
    uploading: false,
    error: null
  });

  const handleApprove = async (docId: string) => { /* Removed legacy logic - use performApproval instead */ };


  const showApproveConfirmation = (doc: any) => {
    setModalDocumentName(doc.filename);
    setModalDocumentId(doc.id);
    setActionDoc(doc);
    setShowApprovalModal(true);
  };

  const showRejectModal = (doc: any) => {
    setModalDocumentName(doc.filename);
    setModalDocumentId(doc.id);
    setActionDoc(doc);
    setUploadState({ file: null, uploading: false, error: null });
    setShowCorrectionModal(true);
  };

  // Logica simplificada de Aprovação
  const performApproval = async () => {
    if (!actionDoc) return;
    
    try {
      // 1. Atualizar documents_to_be_verified
      const { error: updateError } = await supabase
        .from('documents_to_be_verified')
        .update({
             status: 'completed',
             updated_at: new Date().toISOString()
             // Adicionar dados de quem aprovou se tiver colunas pra isso
        })
        .eq('id', actionDoc.id);

      if (updateError) throw updateError;
      
      // 2. Atualizar UI
      setPendingDocs(prev => prev.filter(d => d.id !== actionDoc.id));
      setShowApprovalModal(false);
      setActionDoc(null);
      
      // Opcional: Atualizar stats context
      // refreshStats();
      
    } catch (error) {
       console.error("Error evaluating document:", error);
       alert("Failed to approve document. Please try again or use the main dashboard.");
    }
  };

  // Logica simplificada de Rejeição (Correction)
  const performRejection = async () => {
     if (!actionDoc || !uploadState.file) return;
     
     setUploadState(prev => ({ ...prev, uploading: true }));
     
     try {
       // 1. Upload do Arquivo
       const fileExt = uploadState.file.name.split('.').pop();
       const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
       const filePath = `corrections/${fileName}`;

       const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadState.file);

       if (uploadError) throw uploadError;

       const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);

        // 2. Atualizar DB (documents_to_be_verified status = rejected/completed? 
        // No dashboard, 'Rejeitar' envia correcao e marca como completed (aprovou a correcao) ou mantem pending?
        // Dashboard logic: handleCorrectionUpload calls update with status='completed' normally implies the Correction IS the approved version.
        // Vamos marcar como 'completed' e salvar a URL da correcao.
        
        await supabase.from('documents_to_be_verified').update({
             status: 'completed',
             translated_file_url: publicUrlData.publicUrl,
             updated_at: new Date().toISOString()
        }).eq('id', actionDoc.id);
        
        setPendingDocs(prev => prev.filter(d => d.id !== actionDoc.id));
        setShowCorrectionModal(false);
        setActionDoc(null);

     } catch (error: any) {
        console.error("Correction error:", error);
        setUploadState(prev => ({ ...prev, uploading: false, error: error.message }));
     }
  };

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const { data, error } = await supabase
          .from('documents_to_be_verified')
          .select('id, filename, created_at, client_name, status')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setPendingDocs(data || []);
      } catch (err) {
        console.error('Error fetching pending docs for overview:', err);
      } finally {
        setLoadingPending(false);
      }
    };

    fetchPending();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative text-center">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-[#163353]/20 blur-3xl rounded-full animate-pulse" />
            <LoadingSpinner size="lg" color="blue" />
          </div>
          <p className="text-[#163353] font-black uppercase tracking-[0.3em] text-xs">Loading Overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative text-center bg-white/80 backdrop-blur-xl p-12 rounded-[40px] border border-gray-200 shadow-2xl max-w-md">
          <div className="w-20 h-20 bg-[#C71B2D]/10 backdrop-blur-sm rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-[#C71B2D]/20">
            <XCircle className="w-10 h-10 text-[#C71B2D]" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">System Error</h3>
          <p className="text-[#C71B2D] font-medium leading-relaxed">{error}</p>
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

      <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 relative z-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight uppercase">
            AUTHENTICATOR OVERVIEW
          </h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">
            Monitor and manage your authentication ecosystem
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${
          currentUser?.role !== 'admin' && missingFileCount > 0
            ? 'lg:grid-cols-5'
            : 'lg:grid-cols-4'
        } gap-6 mb-8`}>
          {/* My Authenticated Card */}
          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-[#163353]/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#163353]/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  {currentUser?.role === 'admin' ? 'Total Documents' : 'My Authenticated'}
                </p>
                <p className="text-3xl sm:text-4xl font-black text-[#163353]">
                  {currentUser?.role === 'admin' ? stats.totalDocuments : stats.myAuthentications}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Card */}
          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-[#C71B2D]/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C71B2D]/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pending</p>
                <p className="text-3xl sm:text-4xl font-black text-[#C71B2D]">{stats.pendingDocuments}</p>
              </div>
            </div>
          </div>

          {/* Completed Card */}
          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-[#163353]/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#163353]/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  {currentUser?.role === 'admin' ? 'Approved' : 'Completed'}
                </p>
                <p className="text-3xl sm:text-4xl font-black text-[#163353]">{stats.approvedDocuments}</p>
              </div>
            </div>
          </div>

          {/* My Value Card */}
          <div className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-[#C71B2D]/40 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C71B2D]/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  {currentUser?.role === 'admin' ? 'Total Value' : 'My Value'}
                </p>
                <p className="text-3xl sm:text-4xl font-black text-[#C71B2D]">${stats.totalValue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Pending Reupload Card (Condicional) */}
          {currentUser?.role !== 'admin' && missingFileCount > 0 && (
            <div
              onClick={() => navigate('/authenticator/failed-uploads')}
              className="relative group bg-white/80 backdrop-blur-xl rounded-[24px] p-6 border border-gray-200 hover:border-[#C71B2D]/40 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pending Reupload</p>
                  <p className="text-3xl sm:text-4xl font-black text-[#C71B2D]">{missingFileCount}</p>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Tabs Section */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 pb-4 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'pending'
                  ? 'text-[#163353] border-[#163353]'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              <Clock className={`w-4 h-4 ${activeTab === 'pending' ? 'text-[#163353]' : 'text-gray-400'}`} />
              Pending Approval
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 pb-4 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
                activeTab === 'activity'
                  ? 'text-[#163353] border-[#163353]'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${activeTab === 'activity' ? 'text-[#163353]' : 'text-gray-400'}`} />
              Recent Activity
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[30px] p-8 border border-gray-200 shadow-lg overflow-hidden min-h-[400px]">
          {activeTab === 'pending' && (
            <div className="relative animate-in fade-in slide-in-from-left-4 duration-300">
               <div className="absolute top-0 right-0 w-48 h-48 bg-[#163353]/5 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#163353]/10 backdrop-blur-sm rounded-[18px] flex items-center justify-center border border-[#163353]/20">
                    <Clock className="w-6 h-6 text-[#163353]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                      Pending Approval
                    </h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Documents waiting for review</p>
                  </div>
                </div>
                <button 
                  onClick={() => fetchPending()} 
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-[12px] text-xs font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 hover:text-[#163353] transition-all"
                >
                  <Upload className="w-3.5 h-3.5 rotate-180" /> Refresh
                </button>
              </div>

              <div className="relative space-y-3">
                {loadingPending ? (
                   <div className="flex justify-center p-12"><LoadingSpinner size="lg" color="blue" /></div>
                ) : pendingDocs.length > 0 ? (
                  pendingDocs.map((doc) => (
                    <div key={doc.id} className="relative group flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-[20px] hover:border-[#163353]/40 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/authenticator/authenticate')}>
                      <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-[#163353]/10 rounded-[12px] flex items-center justify-center shrink-0">
                             <FileText className="w-5 h-5 text-[#163353]" />
                          </div>
                          <div className="min-w-0">
                               <p className="text-sm font-black text-gray-900 truncate">{doc.filename}</p>
                               <p className="text-xs font-bold text-gray-500">{doc.client_name || 'No Client'}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="hidden sm:inline-block px-3 py-1 bg-yellow-100/50 text-yellow-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                          Pending
                        </span>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); showApproveConfirmation(doc); }}
                             className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                             title="Approve"
                           >
                              <CheckCircle className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); showRejectModal(doc); }}
                             className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-colors"
                             title="Reject / Upload Correction"
                           >
                              <XCircle className="w-4 h-4" />
                           </button>
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                            {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[24px] border border-gray-200 border-dashed">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-1">All Caught Up!</h3>
                    <p className="text-sm text-gray-500 font-medium">No pending documents to review right now.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="relative animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="absolute top-0 right-0 w-48 h-48 bg-[#C71B2D]/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="relative flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#C71B2D]/10 backdrop-blur-sm rounded-[18px] flex items-center justify-center border border-[#C71B2D]/20">
                  <TrendingUp className="w-6 h-6 text-[#C71B2D]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                    {currentUser?.role === 'admin' ? 'Recent Activity' : 'My Recent Activity'}
                  </h2>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Latest actions performed</p>
                </div>
              </div>

              <div className="relative space-y-3">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity, index) => (
                    <div key={index} className="relative group flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-[20px] hover:border-[#C71B2D]/40 hover:shadow-lg transition-all">
                      <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 border backdrop-blur-sm ${
                        activity.action.toLowerCase().includes('reject') 
                        ? 'bg-[#C71B2D]/10 border-[#C71B2D]/20 text-[#C71B2D]' 
                        : 'bg-[#163353]/10 border-[#163353]/20 text-[#163353]'
                      }`}>
                         {activity.action.toLowerCase().includes('reject') ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{activity.filename}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                             activity.action.toLowerCase().includes('reject') 
                             ? 'bg-[#C71B2D]/10 text-[#C71B2D]' 
                             : 'bg-[#163353]/10 text-[#163353]'
                          }`}>
                            {activity.action} 
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">• {new Date(activity.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-[24px] border border-gray-200 border-dashed">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

       {/* Approve Modal */}
       {showApprovalModal && (
        <div className="fixed inset-0 bg-[#0A1A2F]/95 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 max-w-md w-full text-center border border-white/20">
            <div className="mx-auto mb-6 w-16 h-16 bg-green-100/80 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-green-200">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">
              Confirm Approval
            </h3>

            <p className="text-sm text-gray-600 font-medium mb-8">
              Are you sure you want to approve "<span className="font-black text-gray-900">{modalDocumentName}</span>"?
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-6 py-3 text-sm font-black text-gray-700 bg-white border border-gray-300 rounded-[16px] hover:bg-gray-50 transition-all uppercase tracking-wider"
              >
                Cancel
              </button>

              <button
                onClick={performApproval}
                className="px-6 py-3 text-sm font-black text-white bg-green-600 rounded-[16px] hover:bg-green-700 transition-all uppercase tracking-wider shadow-lg"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject/Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-[#0A1A2F]/95 backdrop-blur-2xl flex items-center justify-center z-[9999] p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8 max-w-md w-full text-center border border-white/20">
            <div className="mx-auto mb-6 w-16 h-16 bg-[#C71B2D]/10 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-[#C71B2D]/20">
              <Upload className="w-8 h-8 text-[#C71B2D]" />
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
              Upload Correction
            </h3>
             <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-6">REJECTING: {modalDocumentName}</p>

             <div className="mb-6">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#163353]/30 rounded-[16px] cursor-pointer bg-[#163353]/5 hover:bg-[#163353]/10 transition-all group">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 mb-2 text-[#163353]/60 group-hover:text-[#163353] transition-colors" />
                    <span className="text-xs text-gray-700 font-medium group-hover:font-bold group-hover:text-[#163353]">
                      Click to select PDF
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={e => {
                       const file = e.target.files?.[0] || null;
                       setUploadState(prev => ({ ...prev, file, error: null }));
                    }}
                  />
                </label>
                {uploadState.file && (
                    <div className="mt-2 p-2 bg-[#163353]/10 rounded-[8px] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#163353]" />
                        <span className="text-xs font-bold text-[#163353] truncate">{uploadState.file.name}</span>
                    </div>
                )}
                 {uploadState.error && (
                    <p className="mt-2 text-xs font-bold text-[#C71B2D]">{uploadState.error}</p>
                )}
             </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-6 py-3 text-sm font-black text-gray-700 bg-white border border-gray-300 rounded-[16px] hover:bg-gray-50 transition-all uppercase tracking-wider"
                disabled={uploadState.uploading}
              >
                Cancel
              </button>

              <button
                onClick={performRejection}
                disabled={!uploadState.file || uploadState.uploading}
                className="px-6 py-3 text-sm font-black text-white bg-[#C71B2D] rounded-[16px] hover:bg-[#A01624] transition-all uppercase tracking-wider shadow-lg disabled:opacity-50"
              >
                {uploadState.uploading ? 'Sending...' : 'Send Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 