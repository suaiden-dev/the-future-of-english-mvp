import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { DocumentWithMissingFile } from '../../hooks/useDocumentsWithMissingFiles';
import { retryDocumentUpload, validateFile, validatePageCount } from '../../utils/retryUpload';

interface RetryUploadModalProps {
  document: DocumentWithMissingFile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RetryUploadModal({ document, isOpen, onClose, onSuccess }: RetryUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pageValidation, setPageValidation] = useState<{
    validating: boolean;
    valid: boolean | null;
    actualPages?: number;
    error?: string;
  }>({ validating: false, valid: null });
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setSuccess(false);
    setSelectedFile(file);
    setPageValidation({ validating: false, valid: null });

    // Validar arquivo
    const fileValidation = await validateFile(file);
    if (!fileValidation.valid) {
      setError(fileValidation.error || 'Invalid file');
      setSelectedFile(null);
      return;
    }

    // Validar páginas em tempo real
    setPageValidation({ validating: true, valid: null });
    try {
      const validation = await validatePageCount(file, document.pages);
      setPageValidation({
        validating: false,
        valid: validation.valid,
        actualPages: validation.actualPages,
        error: validation.error
      });

      if (!validation.valid) {
        setError(validation.error || 'Page count does not match');
      }
    } catch (err: any) {
      setPageValidation({
        validating: false,
        valid: false,
        error: err.message || 'Error validating pages'
      });
      setError(err.message || 'Error validating pages');
    }
  }, [document.pages]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleRetryUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (pageValidation.valid === false) {
      setError('Please select a file with the correct number of pages');
      return;
    }

    if (pageValidation.valid === null || pageValidation.validating) {
      setError('Please wait for file validation');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await retryDocumentUpload(
        document.document_id, 
        selectedFile,
        document.payment_status, // Passar payment_status para evitar problemas de RLS
        document.payment_id // Passar payment_id também
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Error re-uploading document');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error re-uploading document');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-tfe-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Re-upload Document</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isUploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Document Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <p className="font-medium text-gray-900">{document.original_filename || document.filename}</p>
              </div>
              <div>
                <span className="text-gray-600">Pages:</span>
                <p className="font-medium text-gray-900">{document.pages}</p>
              </div>
              <div>
                <span className="text-gray-600">Amount Paid:</span>
                <p className="font-medium text-green-600">
                  {formatCurrency(document.payment_gross_amount || document.payment_amount)}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Payment Date:</span>
                <p className="font-medium text-gray-900">{formatDate(document.payment_date)}</p>
              </div>
              {document.upload_retry_count > 0 && (
                <div className="col-span-2">
                  <span className="text-gray-600">Previous Attempts:</span>
                  <p className="font-medium text-gray-900">{document.upload_retry_count}</p>
                </div>
              )}
            </div>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF file for re-upload
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-tfe-blue-500 bg-tfe-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !isUploading && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploading}
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-tfe-blue-600 mx-auto" />
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600">
                    Click here or drag the PDF file
                  </p>
                  <p className="text-xs text-gray-500">Maximum size: 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Page Validation Status */}
          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {pageValidation.validating ? (
                <div className="flex items-center space-x-2 text-blue-700">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Validating page count...</span>
                </div>
              ) : pageValidation.valid === true ? (
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Page count valid ({pageValidation.actualPages} {pageValidation.actualPages === 1 ? 'page' : 'pages'})
                  </span>
                </div>
              ) : pageValidation.valid === false ? (
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {pageValidation.error || 'Page count does not match'}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <p className="text-sm">Document re-uploaded successfully! Redirecting...</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-tfe-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleRetryUpload}
            disabled={
              !selectedFile ||
              isUploading ||
              pageValidation.valid !== true ||
              success
            }
            className="px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Re-upload Document</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

