import React from 'react';
import { Clock, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { Document } from '../../App';

interface RecentActivityProps {
  documents: Document[];
  onViewDocument: (document: Document) => void;
}

export function RecentActivity({ documents, onViewDocument }: RecentActivityProps) {
  // Sort documents by upload date (most recent first) and take the last 5
  const recentDocuments = documents
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    let color = '';
    let text = '';
    switch (status) {
      case 'pending':
        color = 'bg-yellow-100 text-yellow-800';
        text = 'Pending';
        break;
      case 'processing':
        color = 'bg-blue-100 text-blue-800';
        text = 'In Progress'; // Atualizado
        break;
      case 'completed':
        color = 'bg-green-100 text-green-800';
        text = 'Completed';
        break;
      default:
        color = 'bg-gray-100 text-gray-600';
        text = status;
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>{text}</span>;
  };

  if (recentDocuments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
        <p className="text-gray-600">
          Your recent document activity will appear here once you start uploading documents.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="grid grid-cols-1 gap-4">
        {recentDocuments.map((doc) => (
          <div key={doc.id} className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-2 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-blue-900 truncate" title={doc.filename}>{doc.filename}</div>
                <div className="text-xs text-blue-800 flex gap-2 items-center mt-0.5">
                  {getStatusBadge(doc.status)}
                  <span className="text-gray-500">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-xs"
                  download
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
              <button
                onClick={() => onViewDocument(doc)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors text-xs"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}