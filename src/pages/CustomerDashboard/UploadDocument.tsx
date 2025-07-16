import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTranslatedDocuments } from '../../hooks/useDocuments';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import ImagePreviewModal from '../../components/ImagePreviewModal';

export default function UploadDocument() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pages, setPages] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipoTrad, setTipoTrad] = useState<'Certificado' | 'Notorizado'>('Certificado');
  const [isExtrato, setIsExtrato] = useState(false);
  const [idiomaRaiz, setIdiomaRaiz] = useState('Portuguese');
  const translationTypes = [
    { value: 'Certificado', label: 'Certificate ($15/page or $25 if bank statement)' },
    { value: 'Notorizado', label: 'Notarized ($20/page or $35 if bank statement)' },
  ];
  const languages = [
    'Portuguese',
    'Portuguese (Portugal)',
    'Spanish',
    'German',
    'Arabic',
    'Hebrew',
    'Japanese',
    'Korean',
  ];
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  function calcularValor(pages: number, tipo: 'Certificado' | 'Notorizado', extrato: boolean) {
    if (extrato) {
      return tipo === 'Certificado' ? pages * 25 : pages * 35;
    } else {
      return tipo === 'Certificado' ? pages * 15 : pages * 20;
    }
  }
  const valor = calcularValor(pages, tipoTrad, isExtrato);

  // PDF page count
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
    if (file.type.startsWith('image/')) {
      setFileUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`${user.id}/${Date.now()}_${selectedFile.name}`, selectedFile, { upsert: true });
      if (uploadError) throw uploadError;
      const filePath = uploadData?.path;
      const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;
      // 1. Inserir na tabela documents ANTES do webhook
      const docInsertObj = {
        user_id: user.id,
        filename: selectedFile.name,
        file_url: publicUrl,
        pages,
        tipo_trad: tipoTrad,
        valor,
        idioma_raiz: idiomaRaiz,
        is_bank_statement: isExtrato
      };
      const { error: insertError } = await supabase.from('documents').insert(docInsertObj);
      if (insertError) throw insertError;
      // 2. Chamar Edge Function para acionar o n8n
      try {
        const webhookPayload = {
          filename: selectedFile.name,
          url: publicUrl,
          mimetype: selectedFile.type,
          size: selectedFile.size,
          user_id: user.id,
          paginas: pages,
          tipo_trad: tipoTrad,
          valor,
          idioma_raiz: idiomaRaiz,
          is_bank_statement: isExtrato
        };
        await fetch('https://ywpogqwhwscbdhnoqsmv.functions.supabase.co/send-translation-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });
      } catch (err) {
        // Não bloqueia o upload se o webhook falhar
      }
      setSuccess('Upload realizado com sucesso!');
      setSelectedFile(null);
      setFileUrl(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
    } finally {
      setIsUploading(false);
    }
  };

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

  const { documents: translatedDocs, loading: loadingTranslated } = useTranslatedDocuments(user?.id);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-2 flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl p-10 flex flex-col gap-10 border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Upload Document</h1>
          <p className="text-gray-500 text-lg mb-6">Send your document for translation in a few steps.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Upload & Details */}
          <div className="flex flex-col gap-8">
            {/* Upload Area */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Select Document</h2>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{ minHeight: 160 }}
                aria-label="Upload document area"
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
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-blue-500 mb-1" />
                    <span className="text-gray-800 font-medium text-base">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button
                      className="mt-1 text-xs text-red-500 hover:underline"
                      onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                    >Remove file</button>
                    {selectedFile && fileUrl && selectedFile.type.startsWith('image/') && (
                      <img src={fileUrl} alt="Preview" className="max-h-32 rounded shadow mt-2" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-base text-gray-600 font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, JPG, PNG up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </section>
            {/* Pages */}
            <section>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="num-pages">
                2. Number of Pages
              </label>
              <input
                id="num-pages"
                type="number"
                min="1"
                max="50"
                value={pages}
                onChange={e => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                disabled
                placeholder="Number of pages"
                aria-label="Number of pages"
              />
            </section>
            {/* Translation Details */}
            <section className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="translation-type">
                  3. Translation Type
                </label>
                <select
                  id="translation-type"
                  value={tipoTrad}
                  onChange={e => setTipoTrad(e.target.value as 'Certificado' | 'Notorizado')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  aria-label="Translation type"
                >
                  {translationTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="is-bank-statement">
                  4. Is it a bank statement?
                </label>
                <select
                  id="is-bank-statement"
                  value={isExtrato ? 'yes' : 'no'}
                  onChange={e => setIsExtrato(e.target.value === 'yes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  aria-label="Is it a bank statement"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="original-language">
                  5. Original Document Language
                </label>
                <select
                  id="original-language"
                  value={idiomaRaiz}
                  onChange={e => setIdiomaRaiz(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  aria-label="Original document language"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </section>
          </div>
          {/* Right: Summary */}
          <div className="flex flex-col gap-6">
            <section className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Summary</h3>
              <div className="flex justify-between items-center mb-1">
                <span className="text-base text-gray-700">Translation Cost:</span>
                <span className="text-2xl font-bold text-blue-900">${valor}.00</span>
              </div>
              <p className="text-xs text-blue-900/80 mb-2">
                {translationTypes.find(t => t.value === tipoTrad)?.label.split('(')[0].trim()} {isExtrato ? (tipoTrad === 'Certificado' ? '$25' : '$35') : (tipoTrad === 'Certificado' ? '$15' : '$20')} per page × {pages} page{pages !== 1 ? 's' : ''}
              </p>
              <ul className="text-xs text-blue-900/70 list-disc pl-4">
                <li>USCIS accepted translations</li>
                <li>Official certification & authentication</li>
                <li>Digital verification system</li>
                <li>24/7 customer support</li>
              </ul>
            </section>
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
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full md:w-72 bg-gradient-to-r from-blue-900 to-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:from-blue-800 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all"
            style={{ maxWidth: 320 }}
          >
            {isUploading ? 'Uploading...' : `Upload & Pay $${valor}.00`}
          </button>
        </div>
        {/* Seção de documentos traduzidos */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-2">My Translated Documents</h2>
          {loadingTranslated ? (
            <div className="text-gray-500 py-8 text-center">Loading documents...</div>
          ) : translatedDocs && translatedDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {translatedDocs.map(doc => (
                <div key={doc.id} className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-6 h-6 text-blue-500" />
                    <span className="font-medium text-blue-900 truncate" title={doc.filename}>{doc.filename}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-800">
                    <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-semibold">{doc.status || 'completed'}</span>
                    <span className="text-gray-500">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <div className="flex-1" />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-xs"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const response = await fetch(doc.translated_file_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = doc.filename || 'document';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          alert('Failed to download file.');
                        }
                      }}
                      title="Download file"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                    <button
                      onClick={() => {
                        if (doc.translated_file_url && (doc.translated_file_url.endsWith('.pdf') || doc.filename?.toLowerCase().endsWith('.pdf'))) {
                          window.open(doc.translated_file_url, '_blank', 'noopener,noreferrer');
                        } else if (doc.translated_file_url && (doc.translated_file_url.match(/\.(jpg|jpeg|png)$/i) || doc.filename?.toLowerCase().match(/\.(jpg|jpeg|png)$/i))) {
                          setImageModalUrl(doc.translated_file_url);
                        } else {
                          window.open(doc.translated_file_url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors text-xs"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 py-8 text-center">No translated documents yet.</div>
          )}
          <DocumentDetailsModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
          {imageModalUrl && (
            <ImagePreviewModal imageUrl={imageModalUrl} onClose={() => setImageModalUrl(null)} />
          )}
        </section>
      </div>
    </div>
  );
} 