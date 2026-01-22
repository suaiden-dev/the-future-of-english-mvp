import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { useDocumentsWithMissingFiles } from '../../hooks/useDocumentsWithMissingFiles';

interface DocumentUploadRetryProps {
  userId?: string;
}

export function DocumentUploadRetry({ userId }: DocumentUploadRetryProps) {
  const navigate = useNavigate();
  const { documents, loading, count } = useDocumentsWithMissingFiles(userId);

  if (loading || count === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-lg">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-amber-800 mb-1">
                Pending Document Re-upload
              </h3>
              <p className="text-sm text-amber-700">
                You have {count} {count === 1 ? 'document' : 'documents'} with confirmed payment 
                that {count === 1 ? 'has' : 'have'} not been uploaded yet. Please re-upload {count === 1 ? 'the file' : 'the files'}.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/retry-upload')}
              className="ml-4 flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              <span>View Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Lista resumida dos documentos */}
          {documents.length > 0 && documents.length <= 3 && (
            <div className="mt-3 space-y-1">
              {documents.slice(0, 3).map((doc) => (
                <div key={doc.document_id} className="text-xs text-amber-700">
                  • {doc.original_filename || doc.filename} ({doc.pages} {doc.pages === 1 ? 'page' : 'pages'})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

