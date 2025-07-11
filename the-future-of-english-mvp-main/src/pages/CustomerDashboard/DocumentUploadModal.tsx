import React, { useState } from 'react';
import { Upload, XCircle, FileText } from 'lucide-react';
import { Document } from '../../App';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (document: Document) => void;
  userId: string;
}

export function DocumentUploadModal({ isOpen, onClose, onUpload, userId }: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pages, setPages] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    // Simulate upload process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newDocument: Document = {
      id: Date.now().toString(),
      userId,
      filename: selectedFile.name,
      pages,
      status: 'pending',
      uploadDate: new Date().toISOString(),
      totalCost: pages * 20,
      verificationCode: `TFE${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      isAuthenticated: true
    };

    onUpload(newDocument);
    setIsUploading(false);
    setSelectedFile(null);
    setPages(1);
    onClose();
  };

  const totalCost = pages * 20;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Upload Document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPG, PNG up to 10MB
                </p>
              </label>
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-2" />
                {selectedFile.name}
              </div>
            )}
          </div>

          {/* Page Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Pages
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={pages}
              onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Cost Calculation */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Translation Cost:</span>
              <span className="text-lg font-semibold text-blue-900">
                ${totalCost}.00
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              $20.00 per page × {pages} page{pages !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : `Upload & Pay $${totalCost}.00`}
          </button>
        </div>
      </div>
    </div>
  );
}