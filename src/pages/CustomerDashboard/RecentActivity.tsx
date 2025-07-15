import React from 'react';
import { Clock, CheckCircle, FileText, Image as ImageIcon, AlertCircle, Download } from 'lucide-react';
import { Document } from '../../App';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  documents: Document[];
  onViewDocument: (document: Document) => void;
}

export function RecentActivity({ documents, onViewDocument }: RecentActivityProps) {
  // Sort documents by upload date (most recent first) and take the last 5
  const recentDocuments = documents
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getFileIcon = (filename: string) => {
    if (filename.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (filename.match(/\.(jpg|jpeg|png)$/i)) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    } else {
      return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

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
        text = 'Processing';
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
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-600">Latest updates on your documents</p>
      </div>
      <ul>
        {recentDocuments.map((doc) => (
          <li key={doc.id} className="flex items-center px-6 py-4 border-b last:border-b-0 hover:bg-gray-50 transition">
            <div className="flex-shrink-0 mr-4">
              {getFileIcon(doc.filename)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{doc.filename}</div>
              <div className="text-xs text-gray-500">
                {doc.pages} page{doc.pages !== 1 ? 's' : ''} &middot; ${doc.total_cost}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(doc.status)}
              <span className="text-xs text-gray-400 ml-2">
                {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
              </span>
              {doc.file_url && (
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-blue-600 hover:underline text-xs flex items-center"
                  title="Download"
                >
                  <Download className="w-4 h-4 mr-1" />Download
                </a>
              )}
              <button
                onClick={() => onViewDocument(doc)}
                className="ml-2 text-gray-500 hover:text-blue-700 text-xs font-medium"
              >
                View
              </button>
            </div>
          </li>
        ))}
      </ul>
      {documents.length > 5 && (
        <div className="px-6 py-4 bg-gray-50 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}