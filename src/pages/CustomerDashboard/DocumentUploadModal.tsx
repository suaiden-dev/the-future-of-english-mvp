import React, { useState, useRef } from 'react';
import { Upload, XCircle, FileText, CheckCircle, AlertCircle, Info, Shield, Clock, DollarSign, Globe, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fileStorage } from '../../utils/fileStorage';
import { generateUniqueFileName } from '../../utils/fileUtils';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (documentData: { filename: string; file_url: string; pages: number; folder_id?: string }) => Promise<void>;
  userId: string;
  userEmail: string; // Adicionar email do usuário
  userName?: string; // Adicionar nome do usuário
  currentFolderId?: string | null;
}

export function DocumentUploadModal({ isOpen, onClose, onUpload, userId, userEmail, userName, currentFolderId }: DocumentUploadModalProps) {
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
    { value: 'Certificado', label: 'Certified Translation' },
    { value: 'Notorizado', label: 'Notarized Translation' },
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

  // Function to calculate the value
  function calculateValue(pages: number, type: 'Certificado' | 'Notorizado', isBankStatement: boolean) {
    if (isBankStatement) {
      return type === 'Certificado' ? pages * 25 : pages * 35;
    } else {
      return type === 'Certificado' ? pages * 15 : pages * 20;
    }
  }
  const value = calculateValue(pages, tipoTrad, isExtrato);

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

  // Função para processar pagamento direto com Stripe
  const handleDirectPayment = async (fileId: string, customPayload?: any) => {
    try {
      console.log('DEBUG: Iniciando processamento do pagamento');
      
      // Salvar arquivo no IndexedDB antes do pagamento
      if (!selectedFile) {
        throw new Error('Nenhum arquivo selecionado');
      }

      // Usar payload customizado se fornecido, senão usar o padrão
      const payload = customPayload || {
        pages,
        isCertified: tipoTrad === 'Certificado',
        isNotarized: tipoTrad === 'Notorizado',
        isBankStatement: isExtrato,
        fileId, // Usar o ID do arquivo no IndexedDB
        userId,
        userEmail, // Adicionar email do usuário
        filename: selectedFile?.name,
        isMobile: false // Desktop
      };
      console.log('Payload enviado para checkout:', payload);

      // CRIAR DOCUMENTO NO BANCO ANTES DO PAGAMENTO
      console.log('DEBUG: Criando documento no banco antes do pagamento');
      const { data: newDocument, error: createError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          filename: selectedFile.name,
          pages: pages,
          status: 'pending',
          total_cost: calculateValue(pages, tipoTrad, isExtrato),
          verification_code: 'TFE' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          is_authenticated: true,
          upload_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('ERROR: Erro ao criar documento no banco:', createError);
        throw new Error('Erro ao criar documento no banco de dados');
      }

      console.log('DEBUG: Documento criado no banco:', newDocument.id);

      // Adicionar o documentId ao payload
      const payloadWithDocumentId = {
        ...payload,
        documentId: newDocument.id
      };

      console.log('Payload com documentId enviado para checkout:', payloadWithDocumentId);

      const response = await fetch('https://ywpogqwhwscbdhnoqsmv.supabase.co/functions/v1/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cG9ncXdod3NjYmRobm9xc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTYxMzksImV4cCI6MjA2ODE3MjEzOX0.CsbI1OiT2i3EL31kvexrstIsaC48MD4fEHg6BSE6LZ4'
        },
        body: JSON.stringify(payloadWithDocumentId)
      });

      console.log('DEBUG: Resposta da Edge Function:', response.status);

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: 'Resposta não é JSON', raw: await response.text() };
        }
        console.error('Erro detalhado da Edge Function:', errorData);
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await response.json();
      console.log('DEBUG: URL do Stripe Checkout:', url);

      // Redirecionar para o Stripe Checkout
      window.location.href = url;

    } catch (err: any) {
      console.error('ERROR: Erro no pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento');
    }
  };

  // Detecta se é mobile (iOS/Android)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    
    try {
      if (isMobile) {
        // Mobile: SEMPRE tentar usar IndexedDB primeiro (igual ao desktop)
        try {
          console.log('DEBUG: Mobile - tentando usar IndexedDB (igual ao desktop)');
          const fileId = await fileStorage.storeFile(selectedFile, {
            documentType: tipoTrad,
            certification: tipoTrad === 'Certificado',
            notarization: tipoTrad === 'Notorizado',
            pageCount: pages,
            isBankStatement: isExtrato,
            originalLanguage: idiomaRaiz,
            userId,
            currentFolderId
          });
          
          console.log('DEBUG: Mobile - IndexedDB funcionou, usando fileId:', fileId);
          await handleDirectPayment(fileId);
        } catch (indexedDBError) {
          console.log('DEBUG: Mobile - IndexedDB falhou, tentando abordagem alternativa:', indexedDBError);
          
          // Fallback: Tentar usar localStorage ou sessionStorage como alternativa
          try {
            console.log('DEBUG: Mobile - Tentando usar localStorage como fallback');
            
            // Criar um ID único para o arquivo
            const fallbackFileId = 'mobile_fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Salvar informações básicas do arquivo no localStorage
            const fileInfo = {
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              lastModified: selectedFile.lastModified,
              documentType: tipoTrad,
              certification: tipoTrad === 'Certificado',
              notarization: tipoTrad === 'Notorizado',
              pageCount: pages,
              isBankStatement: isExtrato,
              originalLanguage: idiomaRaiz,
              userId,
              currentFolderId
            };
            
            localStorage.setItem(fallbackFileId, JSON.stringify(fileInfo));
            console.log('DEBUG: Mobile - Arquivo salvo no localStorage como fallback:', fallbackFileId);
            
            // Usar o fallbackFileId como se fosse um fileId normal
            await handleDirectPayment(fallbackFileId);
            
          } catch (fallbackError) {
            console.error('ERROR: Mobile - Todas as opções de armazenamento falharam:', fallbackError);
            throw new Error('Não foi possível salvar o arquivo no dispositivo. Tente novamente ou use um dispositivo diferente.');
          }
        }
      } else {
        // Desktop: Usar IndexedDB
        console.log('DEBUG: Desktop - usando IndexedDB');
        const fileId = await fileStorage.storeFile(selectedFile, {
          documentType: tipoTrad,
          certification: tipoTrad === 'Certificado',
          notarization: tipoTrad === 'Notorizado',
          pageCount: pages,
          isBankStatement: isExtrato,
          originalLanguage: idiomaRaiz,
          userId,
          currentFolderId
        });
        
        console.log('DEBUG: Desktop - IndexedDB funcionou, usando fileId:', fileId);
        await handleDirectPayment(fileId);
      }
    } catch (err: any) {
      console.error('ERROR: Erro ao processar pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Document Translation</h2>
              <p className="text-gray-600 mt-1">Get your documents professionally translated</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              aria-label="Close upload modal"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Upload Form */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-xl p-6">
                {/* Instructions Section */}
                <div className="bg-tfe-blue-50 border border-tfe-blue-200 rounded-xl p-4 mb-6">
                  <h3 className="text-lg font-semibold text-tfe-blue-950 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    How It Works
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-tfe-blue-800">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-8 h-8 bg-tfe-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">1</div>
                      <p className="font-medium">Upload Document</p>
                      <p className="text-tfe-blue-700">Select your PDF or image file</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-8 h-8 bg-tfe-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">2</div>
                      <p className="font-medium">Choose Service</p>
                      <p className="text-tfe-blue-700">Select translation type and language</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-8 h-8 bg-tfe-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">3</div>
                      <p className="font-medium">Get Translation</p>
                      <p className="text-tfe-blue-700">Receive your translated document</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Upload Area */}
                  <section>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">1. Select Document</h3>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${dragActive ? 'border-tfe-blue-500 bg-tfe-blue-50' : 'border-gray-300 hover:border-tfe-blue-400'}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => inputRef.current?.click()}
                      style={{ minHeight: 140 }}
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
                        aria-label="Upload document file input"
                        title="Select a document to upload"
                      />
                      {selectedFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-10 h-10 text-tfe-blue-500 mb-1" />
                          <span className="text-gray-800 font-medium text-sm">{selectedFile.name}</span>
                          <span className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          <button
                            className="mt-1 text-xs text-tfe-red-500 hover:underline"
                            onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                          >Remove file</button>
                          {selectedFile && fileUrl && selectedFile.type.startsWith('image/') && (
                            <img src={fileUrl} alt="Preview" className="max-h-24 rounded shadow mt-2" />
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-12 h-12 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 font-medium">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                      disabled
                      placeholder="Number of pages"
                      aria-label="Number of pages"
                    />
                  </section>

                  {/* Translation Details */}
                  <section className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="translation-type">
                        3. Translation Type
                      </label>
                      <select
                        id="translation-type"
                        value={tipoTrad}
                        onChange={e => setTipoTrad(e.target.value as 'Certificado' | 'Notorizado')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                        aria-label="Original document language"
                      >
                        {languages.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  </section>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="flex items-center bg-tfe-red-50 border border-tfe-red-200 rounded-lg p-3 text-tfe-red-700">
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

                  {/* Upload Button */}
                  <div className="pt-4">
                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || isUploading}
                      className="w-full bg-gradient-to-r from-tfe-blue-950 to-tfe-red-950 text-white py-4 rounded-xl font-bold shadow-lg hover:from-blue-800 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all"
                    >
                      {isUploading ? 'Uploading...' : `Upload & Pay $${value}.00`}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Information Cards */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-tfe-blue-50 rounded-xl p-6 border border-tfe-blue-100">
                  <h3 className="text-lg font-semibold text-tfe-blue-950 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Summary
                  </h3>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-base text-gray-700">Translation Cost:</span>
                    <span className="text-2xl font-bold text-tfe-blue-950">${value}.00</span>
                  </div>
                  <p className="text-xs text-tfe-blue-950/80 mb-2">
                    {translationTypes.find(t => t.value === tipoTrad)?.label} {isExtrato ? (tipoTrad === 'Certificado' ? '$25' : '$35') : (tipoTrad === 'Certificado' ? '$15' : '$20')} per page × {pages} page{pages !== 1 ? 's' : ''}
                  </p>
                  <ul className="text-xs text-tfe-blue-950/70 list-disc pl-4 space-y-1">
                    <li>USCIS accepted translations</li>
                    <li>Official certification & authentication</li>
                    <li>Digital verification system</li>
                    <li>24/7 customer support</li>
                  </ul>
                </div>

                {/* Service Information */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-tfe-blue-600" />
                    Service Information
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Translation Types */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-tfe-blue-600" />
                        Translation Types
                      </h4>
                      <div className="space-y-2">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-800 text-sm">Certified Translation</span>
                            <span className="text-xs font-bold text-tfe-blue-600">$15/page</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Standard translation with official certification for general use, immigration, and legal purposes.
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-800 text-sm">Notarized Translation</span>
                            <span className="text-xs font-bold text-tfe-blue-600">$20/page</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Official notarized translation with additional legal authentication for court documents and legal proceedings.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Document Types */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-tfe-blue-600" />
                        Document Types
                      </h4>
                      <div className="space-y-2">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-800 text-sm">Regular Documents</span>
                            <span className="text-xs text-gray-600">Standard rate</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Birth certificates, marriage certificates, diplomas, transcripts, and other official documents.
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-800 text-sm">Bank Statements</span>
                            <span className="text-xs font-bold text-orange-600">+$10/page</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Additional verification and formatting required for financial documents.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-tfe-blue-600" />
                        Service Features
                      </h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">USCIS & Government Accepted</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">Official Certification</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">Digital Verification System</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">24-48 Hour Turnaround</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">Secure File Handling</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">24/7 Customer Support</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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