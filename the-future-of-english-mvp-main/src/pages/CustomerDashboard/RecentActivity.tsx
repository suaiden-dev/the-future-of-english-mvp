import React from 'react';
import { Clock, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { Document } from '../../App';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';

interface RecentActivityProps {
  documents: Document[];
  onViewDocument: (document: Document) => void;
}

export function RecentActivity({ documents, onViewDocument }: RecentActivityProps) {
  // Sort documents by upload date (most recent first) and take the last 5
  const recentDocuments = documents
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 5);

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'processing':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityMessage = (document: Document) => {
    switch (document.status) {
      case 'pending':
        return `Document "${document.filename}" uploaded and waiting for processing`;
      case 'processing':
        return `Document "${document.filename}" is being translated`;
      case 'completed':
        return `Translation of "${document.filename}" completed`;
      default:
        return `Document "${document.filename}" status updated`;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
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
      
      <div className="divide-y divide-gray-100">
        {recentDocuments.map((document) => (
          <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(document.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-900">
                    {getActivityMessage(document)}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {getTimeAgo(document.uploadDate)}
                  </span>
                </div>
                
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                    {getStatusIcon(document.status)}
                    <span className="ml-1 capitalize">{document.status}</span>
                  </span>
                  
                  <span className="text-xs text-gray-500">
                    {document.pages} pages • ${document.totalCost}
                  </span>
                  
                  <button
                    onClick={() => onViewDocument(document)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
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