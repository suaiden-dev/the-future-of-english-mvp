import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { Trash2, Shield, CheckCircle, AlertCircle, RefreshCw, FileX } from 'lucide-react';
import { TableSkeleton } from '../../components/Skeleton';

interface DraftDocument {
  id: string;
  filename: string;
  file_url: string;
  user_id: string;
  created_at: string;
  reason: string;
  sessions?: any[];
  payments?: any[];
}

interface CleanupResponse {
  success: boolean;
  documentsToCleanup: DraftDocument[];
  documentsToKeep: DraftDocument[];
  syncResult?: {
    checked: number;
    updated: number;
  };
}

interface RemovalResponse {
  success: boolean;
  deletedCount: number;
  storageDeletedCount: number;
  sessionsDeletedCount: number;
  errors: Array<{ documentId: string; error: string }>;
  totalRequested: number;
}

export function DraftCleanupApproval() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [safeDocuments, setSafeDocuments] = useState<DraftDocument[]>([]);
  const [protectedDocuments, setProtectedDocuments] = useState<DraftDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCheckDocuments = async () => {
    setLoading(true);
    setSafeDocuments([]);
    setProtectedDocuments([]);
    setSelectedDocuments(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/list-drafts-for-cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        let errorMessage = 'Error checking documents';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Se não conseguir parsear JSON, usar o texto da resposta
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: CleanupResponse = await response.json();

      if (data.success) {
        setSafeDocuments(data.documentsToCleanup || []);
        setProtectedDocuments(data.documentsToKeep || []);
        
        if (data.syncResult) {
          showToast(
            `Verification completed: ${data.syncResult.checked} sessions checked, ${data.syncResult.updated} updated`,
            'success'
          );
        } else {
          showToast(
            `Verification completed: ${data.documentsToCleanup?.length || 0} safe to remove, ${data.documentsToKeep?.length || 0} protected`,
            'success'
          );
        }
      } else {
        throw new Error('Invalid server response');
      }
    } catch (error: any) {
      console.error('❌ [DraftCleanup] Erro ao verificar documentos:', error);
      const errorMessage = error.message || error.toString() || 'Error checking documents. Check the console for more details.';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === safeDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(safeDocuments.map(doc => doc.id)));
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedDocuments.size === 0) {
      showToast('Select at least one document to remove', 'warning');
      return;
    }

    const confirmMessage = `Are you sure you want to remove ${selectedDocuments.size} document(s)? This action is irreversible.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setRemoving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/approved-cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocuments)
        })
      });

      if (!response.ok) {
        let errorMessage = 'Error removing documents';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: RemovalResponse = await response.json();

      if (data.success) {
        showToast(
          `Removal completed: ${data.deletedCount} document(s) removed. Files: ${data.storageDeletedCount}, Sessions: ${data.sessionsDeletedCount}`,
          'success'
        );

        // Remover documentos removidos das listas
        setSafeDocuments(prev => prev.filter(doc => !selectedDocuments.has(doc.id)));
        setSelectedDocuments(new Set());

        // Se houver erros, mostrar
        if (data.errors.length > 0) {
          console.warn('Erros durante remoção:', data.errors);
          showToast(
            `${data.errors.length} document(s) could not be removed. Check the console.`,
            'warning'
          );
        }
      } else {
        throw new Error('Invalid server response');
      }
    } catch (error: any) {
      console.error('Erro ao remover documentos:', error);
      showToast(error.message || 'Error removing documents', 'error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileX className="w-6 h-6" />
              Draft Cleanup
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Check and remove draft documents that did not have completed payments
            </p>
          </div>
          <button
            onClick={handleCheckDocuments}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-tfe-blue-600 hover:bg-tfe-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tfe-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Documents
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <>
          {/* Documents Safe for Removal */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Documents Safe for Removal
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    {safeDocuments.length}
                  </span>
                </div>
                {safeDocuments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      {selectedDocuments.size === safeDocuments.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={handleRemoveSelected}
                      disabled={removing || selectedDocuments.size === 0}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {removing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Selected ({selectedDocuments.size})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {safeDocuments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No documents safe for removal found.</p>
                <p className="text-sm mt-1">Click "Check Documents" to verify.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.size === safeDocuments.length && safeDocuments.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-tfe-blue-600 focus:ring-tfe-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {safeDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.has(doc.id)}
                            onChange={() => handleToggleSelect(doc.id)}
                            className="rounded border-gray-300 text-tfe-blue-600 focus:ring-tfe-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {doc.filename}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {doc.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Protected Documents */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-amber-50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Protected Documents
                </h3>
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                  {protectedDocuments.length}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                These documents cannot be removed as they have confirmed payments or active sessions
              </p>
            </div>

            {protectedDocuments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No protected documents found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Protection Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {protectedDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {doc.filename}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            {doc.reason}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}



