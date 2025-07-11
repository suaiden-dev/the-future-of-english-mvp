import React from 'react';
import { XCircle } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../../utils/documentUtils';
import { Document } from '../../App';

interface DocumentDetailsModalProps {
  document: Document | null;
  onClose: () => void;
}

export function DocumentDetailsModal({ document, onClose }: DocumentDetailsModalProps) {
  if (!document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Document Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Filename</label>
            <p className="text-gray-900">{document.filename}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">User ID</label>
            <p className="text-gray-900 font-mono">{document.userId}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Pages</label>
            <p className="text-gray-900">{document.pages}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Total Cost</label>
            <p className="text-gray-900">${document.totalCost}.00</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Upload Date</label>
            <p className="text-gray-900">{new Date(document.uploadDate).toLocaleString()}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Verification Code</label>
            <p className="text-gray-900 font-mono">{document.verificationCode}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                {getStatusIcon(document.status)}
                <span className="ml-1 capitalize">{document.status}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}