import React from 'react';
import { FileText, Eye, Download, Copy } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';

interface DocumentsListProps {
  documents: Document[];
  onViewDocument: (document: Document) => void;
}

export function DocumentsList({ documents, onViewDocument }: DocumentsListProps) {
  const copyVerificationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // You could add a toast notification here
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Yet</h3>
        <p className="text-gray-600">
          Upload your first document to get started with professional translation services.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Your Documents</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {documents.map((doc) => (
          <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-900" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{doc.filename}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{doc.pages} pages</span>
                    <span>•</span>
                    <span>${doc.totalCost}.00</span>
                    <span>•</span>
                    <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                  {getStatusIcon(doc.status)}
                  <span className="ml-1 capitalize">{doc.status}</span>
                </span>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewDocument(doc)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {doc.status === 'completed' && (
                    <button
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Download Translation"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {doc.verificationCode && (
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Verification Code:</span>
                    <span className="ml-2 font-mono text-sm text-gray-900">{doc.verificationCode}</span>
                  </div>
                  <button
                    onClick={() => copyVerificationCode(doc.verificationCode!)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Copy Code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}