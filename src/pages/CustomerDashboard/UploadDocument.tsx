                                              import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Info, Shield, DollarSign, Globe, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { fileStorage } from '../../utils/fileStorage';
import { generateUniqueFileName } from '../../utils/fileUtils';

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
  const [tipoTrad, setTipoTrad] = useState<'Notorizado'>('Notorizado');
  const [isExtrato, setIsExtrato] = useState(false);
  const [idiomaRaiz, setIdiomaRaiz] = useState('Portuguese');
  
  // Detecta se é mobile (iOS/Android)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const translationTypes = [
    { value: 'Notorizado', label: 'Certified / Notarized' },
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
  
  function calcularValor(pages: number, extrato: boolean) {
    return extrato ? pages * 25 : pages * 20; // $20 base + $5 bank statement fee
  }
  const valor = calcularValor(pages, isExtrato);

  // PDF page count
  let pdfjsLib: any = null;
  let pdfjsWorkerSrc: string | undefined = undefined;
  async function loadPdfJs() {
    if (!pdfjsLib) {
      // @ts-ignore
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
    
    console.log('DEBUG: File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    if (file.type === 'application/pdf') {
      try {
        console.log('DEBUG: Attempting to read PDF file...');
        const pdfjsLib = await loadPdfJs();
        console.log('DEBUG: PDF.js library loaded successfully');
        
        const arrayBuffer = await file.arrayBuffer();
        console.log('DEBUG: File converted to ArrayBuffer, size:', arrayBuffer.byteLength);
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log('DEBUG: PDF loaded successfully, pages:', pdf.numPages);
        setPages(pdf.numPages);
      } catch (err) {
        console.error('DEBUG: Error reading PDF:', err);
        setError(`Failed to read PDF pages: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setPages(1);
      }
    } else {
      console.log('DEBUG: File is not a PDF, type:', file.type);
      setPages(1);
    }
    
    if (file.type.startsWith('image/')) {
      setFileUrl(URL.createObjectURL(file));
    }
  };

  // Função para processar pagamento direto com Stripe
  const handleDirectPayment = async (fileId: string, customPayload?: any) => {
    try {
      console.log('DEBUG: Iniciando pagamento direto com Stripe');
      
      // Verificar se o arquivo foi selecionado
      if (!selectedFile) {
        throw new Error('Nenhum arquivo selecionado');
      }

      // Verificar se o documentId foi fornecido
      if (!customPayload?.documentId) {
        throw new Error('Document ID não fornecido');
      }

      console.log('DEBUG: Usando documentId fornecido:', customPayload.documentId);
      
      // Criar payload completo igual ao DocumentUploadModal
      const payload = {
        pages,
        isCertified: true, // Always certified/notarized now
        isNotarized: tipoTrad === 'Notorizado',
        isBankStatement: isExtrato,
        fileId: fileId || '', // Usar o ID do arquivo no IndexedDB
        userId: user?.id,
        userEmail: user?.email, // Adicionar email do usuário
        filename: selectedFile?.name,
        documentId: customPayload.documentId // Adicionar o documentId
      };

      console.log('DEBUG: Payload completo criado:', payload);
      console.log('DEBUG: pages:', pages);
      console.log('DEBUG: tipoTrad:', tipoTrad);
      console.log('DEBUG: isExtrato:', isExtrato);
      console.log('DEBUG: fileId:', fileId);
      console.log('DEBUG: userId:', user?.id);
      console.log('DEBUG: userEmail:', user?.email);
      console.log('DEBUG: filename:', selectedFile?.name);
      console.log('DEBUG: documentId:', customPayload.documentId);

      console.log('Payload enviado para checkout:', payload);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(payload)
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

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    
    try {
      // CRIAR DOCUMENTO NO BANCO ANTES DO PAGAMENTO
      console.log('DEBUG: Criando documento no banco antes do pagamento');
      const { data: newDocument, error: createError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          pages: pages,
          status: 'draft', // Começa como draft até o pagamento ser confirmado
          total_cost: calcularValor(pages, isExtrato),
          verification_code: 'TFE' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          is_authenticated: true,
          upload_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tipo_trad: tipoTrad,
          idioma_raiz: idiomaRaiz,
          is_bank_statement: isExtrato
        })
        .select()
        .single();

      if (createError) {
        console.error('ERROR: Erro ao criar documento no banco:', createError);
        throw new Error('Erro ao criar documento no banco de dados');
      }

      console.log('DEBUG: Documento criado no banco:', newDocument.id);

      if (isMobile) {
        // Mobile: Tentar usar IndexedDB primeiro, se falhar usar upload direto
        try {
          console.log('DEBUG: Mobile - tentando usar IndexedDB');
          const fileId = await fileStorage.storeFile(selectedFile, {
            documentType: tipoTrad,
            certification: true, // Always certified/notarized now
            notarization: tipoTrad === 'Notorizado',
            pageCount: pages,
            isBankStatement: isExtrato,
            originalLanguage: idiomaRaiz,
            userId: user.id
          });
          
          console.log('DEBUG: Mobile - IndexedDB funcionou, usando fileId:', fileId);
          await handleDirectPayment(fileId, { documentId: newDocument.id });
        } catch (indexedDBError) {
          console.log('DEBUG: Mobile - IndexedDB falhou, usando upload direto:', indexedDBError);
          
          // Fallback: Upload direto para Supabase Storage
          const filePath = generateUniqueFileName(selectedFile.name, user.id);
          console.log('DEBUG: Mobile - Upload path sanitizado:', filePath);
          const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, selectedFile);
          if (uploadError) throw uploadError;
          
          // Payload para mobile com upload direto
          const payload = {
            pages,
            isCertified: true, // Always certified/notarized now
            isNotarized: tipoTrad === 'Notorizado',
            isBankStatement: isExtrato,
            filePath, // Caminho do arquivo no Supabase Storage
            userId: user.id,
            userEmail: user.email, // Adicionar email do usuário
            filename: selectedFile?.name,
            isMobile: true, // Mobile
            documentId: newDocument.id // Adicionar documentId
          };
          console.log('Payload mobile com upload direto enviado para checkout:', payload);
          
          // Chama o pagamento direto com payload customizado
          await handleDirectPayment('', payload);
        }
      } else {
        // Desktop: Salvar arquivo no IndexedDB primeiro
        console.log('DEBUG: Desktop - salvando arquivo no IndexedDB');
        const fileId = await fileStorage.storeFile(selectedFile, {
          documentType: tipoTrad,
          certification: true, // Always certified/notarized now
          notarization: tipoTrad === 'Notorizado',
          pageCount: pages,
          isBankStatement: isExtrato,
          originalLanguage: idiomaRaiz,
          userId: user.id
        });
        
        console.log('DEBUG: Arquivo salvo no IndexedDB com ID:', fileId);
        
        // Ir direto para o pagamento com Stripe
        await handleDirectPayment(fileId, { documentId: newDocument.id });
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
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">Document Translation</h1>
          <p className="text-gray-600 text-lg">Get your documents professionally translated with our secure and reliable service.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Upload Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              {/* Instructions Section */}
              <div className="bg-tfe-blue-50 border border-tfe-blue-200 rounded-xl p-6 mb-8">
                <h2 className="text-2xl font-bold text-tfe-blue-950 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  How It Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-tfe-blue-800">
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
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">1. Select Document</h2>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${dragActive ? 'border-tfe-blue-500 bg-tfe-blue-50' : 'border-gray-300 hover:border-tfe-blue-400'}`}
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
                      aria-label="Upload document file input"
                      title="Select a document to upload"
                    />
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-tfe-blue-500 mb-1" />
                        <span className="text-gray-800 font-medium text-base">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        <button
                          className="mt-1 text-xs text-tfe-red-500 hover:underline"
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
                      onChange={e => setTipoTrad(e.target.value as 'Notorizado')}
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
                    {isUploading ? 'Uploading...' : `Upload & Pay $${valor}.00`}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Information Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Summary Card */}
              <div className="bg-tfe-blue-50 rounded-2xl p-6 border border-tfe-blue-100">
                <h3 className="text-2xl font-bold text-tfe-blue-950 mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Summary
                </h3>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-base text-gray-700">Translation Cost:</span>
                  <span className="text-2xl font-bold text-tfe-blue-950">${valor}.00</span>
                </div>
                <p className="text-xs text-tfe-blue-950/80 mb-2">
                  {translationTypes.find(t => t.value === tipoTrad)?.label} {isExtrato ? '$25' : '$20'} per page × {pages} page{pages !== 1 ? 's' : ''}
                </p>
                <ul className="text-xs text-tfe-blue-950/70 list-disc pl-4 space-y-1">
                  <li>USCIS accepted translations</li>
                  <li>Official certification & authentication</li>
                  <li>Digital verification system</li>
                  <li>24/7 customer support</li>
                </ul>
              </div>

              {/* Information Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-tfe-blue-600" />
                  Service Information
                </h3>
                
                <div className="space-y-6">
                  {/* Translation Types */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-tfe-blue-600" />
                      Translation Types
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-800">Certified / Notarized</span>
                          <span className="text-sm font-bold text-tfe-blue-600">$20/page</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Official certified and notarized translation with complete legal authentication for all purposes including court documents, legal proceedings, immigration, and USCIS applications.
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• Official certification stamp</li>
                          <li>• Notary public certification</li>
                          <li>• USCIS accepted</li>
                          <li>• Digital verification code</li>
                          <li>• Legal document authentication</li>
                          <li>• Court-accepted format</li>
                          <li>• Enhanced verification</li>
                          <li>• 24-48 hour turnaround</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Document Types */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-tfe-blue-600" />
                      Document Types
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-800">Regular Documents</span>
                          <span className="text-sm text-gray-600">Standard rate</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Birth certificates, marriage certificates, diplomas, transcripts, and other official documents.
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-800">Bank Statements</span>
                          <span className="text-sm font-bold text-orange-600">+$5/page</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Additional verification and formatting required for financial documents.
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• Enhanced verification process</li>
                          <li>• Financial document formatting</li>
                          <li>• Additional security measures</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-tfe-blue-600" />
                      Supported Languages
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {languages.map(lang => (
                        <div key={lang} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">{lang}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      All documents are translated to English for USCIS and US authority requirements.
                    </p>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-tfe-blue-600" />
                      Service Features
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">USCIS & Government Accepted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">Official Certification</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">Digital Verification System</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">24-48 Hour Turnaround</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">Secure File Handling</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
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
  );
} 