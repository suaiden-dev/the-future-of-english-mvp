import React from 'react';
import { XCircle, FileText, Calendar, DollarSign, Hash, Shield } from 'lucide-react';
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
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Document Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Document Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <FileText className="w-5 h-5 text-gray-500 mr-2" />
              <span className="font-medium text-gray-900">{document.filename}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Pages:</span>
                <span className="ml-2 font-medium">{document.pages}</span>
              </div>
              <div>
                <span className="text-gray-600">Cost:</span>
                <span className="ml-2 font-medium">${document.totalCost}.00</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
              {getStatusIcon(document.status)}
              <span className="ml-1 capitalize">{document.status}</span>
            </span>
          </div>

          {/* Upload Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Upload Date:</span>
            <div className="flex items-center text-sm text-gray-900">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(document.uploadDate).toLocaleString()}
            </div>
          </div>

          {/* Verification Code */}
          {document.verificationCode && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Hash className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">Verification Code</span>
              </div>
              <p className="font-mono text-lg text-blue-900 mb-2">{document.verificationCode}</p>
              <p className="text-sm text-blue-700">
                Use this code to verify the authenticity of your translated document.
              </p>
            </div>
          )}

          {/* Authentication Status */}
          {document.isAuthenticated && (
            <div className="flex items-center text-green-600">
              <Shield className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Document Authenticated</span>
            </div>
          )}

          {/* Status-specific information */}
          {document.status === 'pending' && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Processing Information</h4>
              <p className="text-sm text-yellow-800">
                Your document is in the queue for translation. Processing typically takes 24-48 hours.
              </p>
            </div>
          )}

          {document.status === 'processing' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Translation in Progress</h4>
              <p className="text-sm text-blue-800">
                Our certified translators are currently working on your document. 
                You'll be notified when it's completed.
              </p>
            </div>
          )}

          {document.status === 'completed' && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Translation Complete</h4>
              <p className="text-sm text-green-800">
                Your certified translation is ready for download. The document includes 
                official authentication and is accepted by USCIS.
              </p>
              <button className="mt-3 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                Download Translation
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
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