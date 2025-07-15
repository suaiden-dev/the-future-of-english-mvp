import React, { useState, useRef } from 'react';
import { Upload, XCircle, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (documentData: { filename: string; file_url: string; pages: number; folder_id?: string }) => Promise<void>;
  userId: string;
  currentFolderId?: string | null;
}

export function DocumentUploadModal({ isOpen, onClose, onUpload, userId, currentFolderId }: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pages, setPages] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Substituir import dinâmico do pdfjs-dist por função loadPdfJs
  let pdfjsLib: any = null;
  let pdfjsWorkerSrc: string | undefined = undefined;

  async function loadPdfJs() {
    if (!pdfjsLib) {
      pdfjsLib = await import('pdfjs-dist/build/pdf');
      // @ts-ignore
      pdfjsWorkerSrc = (await import('pdfjs-dist/build/pdf.worker?url')).default;
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;
    }
    return pdfjsLib;
  }

  const handleFileChange = async (file: File) => {
    setError(null);
    setSuccess(null);
    setFileUrl(null);
    setPages(1);
    setSelectedFile(file);
    if (file.type === 'application/pdf') {
      try {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPages(pdf.numPages);
      } catch (err) {
        setError('Failed to read PDF pages');
        setPages(1);
      }
    } else {
      setPages(1);
    }
    // Preview for images
    if (file.type.startsWith('image/')) {
      setFileUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    console.log('DEBUG: Iniciando upload do arquivo', selectedFile);
    try {
      console.log('DEBUG: Antes do upload para Supabase Storage');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`${userId}/${Date.now()}_${selectedFile.name}`, selectedFile, { upsert: true });
      console.log('DEBUG: Depois do upload', { uploadData, uploadError });
      if (uploadError) throw uploadError;
      const filePath = uploadData?.path;
      console.log('DEBUG: Antes de obter publicUrl', filePath);
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;
      console.log('DEBUG: Depois de obter publicUrl', publicUrl);

      // 1. Inserir na tabela documents ANTES do webhook
      await onUpload({
        filename: selectedFile.name,
        file_url: publicUrl,
        pages,
        folder_id: currentFolderId || undefined
      });
      console.log('DEBUG: Depois de registrar no banco');

      // 2. Chamar Edge Function para acionar o n8n
      try {
        const webhookPayload = {
          filename: selectedFile.name,
          url: publicUrl,
          mimetype: selectedFile.type,
          size: selectedFile.size,
          user_id: userId // Enviar user_id diretamente
        };
        const webhookRes = await fetch('https://nqhbwpizaizhyijkxkwj.functions.supabase.co/send-translation-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        });
        const webhookData = await webhookRes.json();
        console.log('DEBUG: Webhook enviado para Edge Function', webhookData);
      } catch (webhookErr) {
        console.error('DEBUG: Erro ao enviar webhook para Edge Function', webhookErr);
      }
      setSelectedFile(null);
      setPages(1);
      setFileUrl(null);
      setSuccess('Document uploaded successfully!');
      console.log('DEBUG: Upload finalizado com sucesso, modal será fechado.');
      setTimeout(() => {
        setSuccess(null);
        onClose(); // Fecha o modal, usuário permanece no dashboard
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      console.error('DEBUG: Erro ao fazer upload', err);
    } finally {
      setIsUploading(false);
    }
  };

  const totalCost = pages * 20;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close upload modal"
        >
          <XCircle className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Upload Document</h3>
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                type="file"
                ref={inputRef}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
              />
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <FileText className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-gray-800 font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button
                    className="mt-2 text-xs text-red-500 hover:underline"
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                  >Remove file</button>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm text-gray-600 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, JPG, PNG up to 10MB
                  </p>
                </div>
              )}
            </div>
            {selectedFile && fileUrl && selectedFile.type.startsWith('image/') && (
              <img src={fileUrl} alt="Preview" className="max-h-40 mx-auto my-2 rounded shadow" />
            )}
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>{success}</span>
            </div>
          )}

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
              onChange={e => setPages(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={selectedFile?.type === 'application/pdf'}
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
            className="w-full bg-gradient-to-r from-blue-900 to-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:from-blue-800 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg mt-2"
          >
            {isUploading ? 'Uploading...' : `Upload & Pay $${totalCost}.00`}
          </button>
        </div>
      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.2s ease; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(.4,2,.6,1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}