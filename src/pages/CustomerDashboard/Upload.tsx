// OBSOLETO: Esta página foi substituída por UploadDocument.tsx. Não usar mais.
import React, { useRef, useState } from 'react';
import { UploadCloud, X, CheckCircle, RefreshCw, Eye, Download } from 'lucide-react';
import type { User, Document } from '../../App';

interface UploadProps {
  user: User | null;
  documents: Document[];
  onDocumentUpload: (document: any) => void;
}

interface FileWithMeta {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  url?: string;
}

export const Upload: React.FC<UploadProps> = ({ user, documents, onDocumentUpload }) => {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: FileWithMeta[] = Array.from(fileList).map(file => ({
      file,
      status: 'pending',
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const retryFile = (idx: number) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'pending', error: undefined, progress: 0 } : f));
  };

  const uploadFile = async (fileMeta: FileWithMeta, idx: number) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'uploading', progress: 0 } : f));
    try {
      // Simulação de upload (substitua pela lógica real de upload/Supabase)
      await new Promise(res => setTimeout(res, 1200));
      setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'success', progress: 100, url: URL.createObjectURL(f.file) } : f));
      // Chame a lógica real de upload aqui:
      // await onDocumentUpload({ ... });
    } catch (err) {
      setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status: 'error', error: 'Upload failed' } : f));
    }
  };

  const startUpload = () => {
    files.forEach((f, idx) => {
      if (f.status === 'pending') uploadFile(f, idx);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Upload Documents</h1>
        <div
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          style={{ cursor: 'pointer' }}
        >
          <UploadCloud className="w-12 h-12 text-blue-500 mb-2" />
          <p className="text-gray-700 font-medium">Drag & drop files here, or <span className="text-blue-600 underline">browse</span></p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
        {files.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Files to Upload</h2>
            <ul className="space-y-3">
              {files.map((f, idx) => (
                <li key={idx} className="bg-white rounded-lg shadow flex items-center p-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{f.file.name}</span>
                      {f.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {f.status === 'error' && <X className="w-5 h-5 text-red-500" />}
                      {f.status === 'uploading' && <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />}
                    </div>
                    <div className="text-xs text-gray-500">{(f.file.size / 1024).toFixed(1)} KB</div>
                    <div className="w-full bg-gray-100 rounded h-2 mt-2">
                      <div
                        className={`h-2 rounded ${f.status === 'success' ? 'bg-green-400' : f.status === 'error' ? 'bg-red-400' : 'bg-blue-400'}`}
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                    {f.error && <div className="text-xs text-red-500 mt-1">{f.error}</div>}
                  </div>
                  <div className="flex flex-col items-end ml-4 space-y-1">
                    <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500" title="Remove"><X className="w-5 h-5" /></button>
                    {f.status === 'error' && <button onClick={() => retryFile(idx)} className="text-blue-500 hover:underline text-xs">Retry</button>}
                    {f.status === 'success' && f.url && (
                      <a href={f.url} download={f.file.name} className="text-green-600 hover:underline text-xs flex items-center"><Download className="w-4 h-4 mr-1" />Download</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <button
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              onClick={startUpload}
              disabled={files.every(f => f.status !== 'pending')}
            >
              Start Upload
            </button>
          </div>
        )}
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-2">Recent Uploads</h2>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">File Name</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(0, 10).map((doc, idx) => (
                  <tr key={doc.id || idx} className="border-b last:border-0">
                    <td className="px-4 py-2">{doc.filename || 'Untitled'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${doc.status === 'completed' ? 'bg-green-100 text-green-800' : doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{doc.status}</span>
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button className="text-blue-500 hover:underline flex items-center text-xs"><Eye className="w-4 h-4 mr-1" />View</button>
                      {/* Download link pode ser implementado se houver URL no futuro */}
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">No uploads yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload; 