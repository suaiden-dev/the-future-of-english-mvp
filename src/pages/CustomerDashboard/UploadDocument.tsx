import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Info, Shield, DollarSign, Globe, Award, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { fileStorage } from '../../utils/fileStorage';
import { generateUniqueFileName } from '../../utils/fileUtils';
import { useI18n } from '../../contexts/I18nContext';
import { PaymentMethodModal } from '../../components/PaymentMethodModal';
import { ZellePaymentModal } from '../../components/ZellePaymentModal';
import { useNavigate } from 'react-router-dom';
import { useDocumentCleanup } from '../../hooks/useDocumentCleanup';

interface DocumentConfig {
  id: string;
  file: File;
  fileUrl?: string;
  pages: number;
  tipoTrad: 'Certified' | 'Notarized';
  isExtrato: boolean;
  idiomaRaiz: string;
  idiomaDestino: string;
  sourceCurrency: string;
  targetCurrency: string;
  documentId?: string;
  isUploading?: boolean;
  error?: string;
}

export default function UploadDocument() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentConfig[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Estados para os modais de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showZelleModal, setShowZelleModal] = useState(false);
  const [currentDocumentIds, setCurrentDocumentIds] = useState<string[]>([]);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  // Hook para limpeza de documentos (usado para documentos individuais)
  const { cleanupDocument, navigateWithCleanup } = useDocumentCleanup({
    documentId: currentDocumentIds[0] || undefined,
    isPaymentCompleted,
    shouldCleanup: !isPaymentCompleted && currentDocumentIds.length > 0,
    onCleanupComplete: () => {
      console.log('✅ Limpeza de documento concluída');
      setCurrentDocumentIds([]);
    }
  });
  
  // Detecta se é mobile (iOS/Android)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const translationTypes = [
    { value: 'Certified', label: 'Certified' },
    { value: 'Notarized', label: 'Notarized' },
  ];
  
  
  const targetLanguages = [
    'Portuguese',
    'Spanish',
    'English',
    'German',
    'Arabic',
    'Hebrew',
    'Japanese',
    'Korean',
  ];

  const currencies = [
    'USD',
    'BRL',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'JPY',
    'KRW',
    'CNY',
    'INR',
    'MXN',
    'CHF',
  ];
  
  function calcularValor(pages: number, extrato: boolean, tipoTrad: string) {
    let basePrice = tipoTrad === 'Notarized' ? 20 : 15; // $20 for Notarized, $15 for Certified
    let bankFee = extrato ? 10 : 0; // $10 additional fee for bank statements
    return pages * (basePrice + bankFee);
  }

  // Função para mapear o tipo de tradução para o valor correto no banco
  function mapTipoTradToDatabase(tipoTrad: 'Certified' | 'Notarized'): string {
    return tipoTrad === 'Certified' ? 'Certificado' : 'Notorizado';
  }
  // Calcular valor total de todos os documentos
  const totalValue = documents.reduce((sum, doc) => {
    return sum + calcularValor(doc.pages, doc.isExtrato, doc.tipoTrad);
  }, 0);

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

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    setError(null);
    setSuccess(null);
    
    const newDocuments: DocumentConfig[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      let pages = 1;
      let fileUrl: string | undefined;
      
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
          pages = pdf.numPages;
        } catch (err) {
          console.error('DEBUG: Error reading PDF:', err);
          pages = 1;
        }
      }
      
      if (file.type.startsWith('image/')) {
        fileUrl = URL.createObjectURL(file);
      }
      
      const newDoc: DocumentConfig = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        fileUrl,
        pages,
        tipoTrad: 'Certified',
        isExtrato: false,
        idiomaRaiz: 'Portuguese',
        idiomaDestino: 'English',
        sourceCurrency: 'USD',
        targetCurrency: 'BRL',
      };
      
      newDocuments.push(newDoc);
    }
    
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => {
      const doc = prev.find(d => d.id === id);
      if (doc?.fileUrl) {
        URL.revokeObjectURL(doc.fileUrl);
      }
      return prev.filter(d => d.id !== id);
    });
  };

  const updateDocument = (id: string, updates: Partial<DocumentConfig>) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, ...updates } : doc
    ));
  };

  // Função para gerar nome único do arquivo (igual ao autenticador)
  function generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    const fileExtension = originalFilename.split('.').pop();
    const baseName = originalFilename.replace(/\.[^/.]+$/, ""); // Remove extensão
    
    return `${baseName}_${timestamp}_${randomCode}.${fileExtension}`;
  }

  const handleUpload = async () => {
    if (documents.length === 0 || !user) {
      setError('Por favor, adicione pelo menos um documento');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    
    try {
      const documentIds: string[] = [];
      
      // Criar documentos no banco para cada arquivo
      for (const doc of documents) {
        // Gerar nome único para o arquivo
        const uniqueFilename = generateUniqueFilename(doc.file.name);
        console.log('DEBUG: Criando documento no banco:', doc.file.name);
        
        const { data: newDocument, error: createError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            filename: uniqueFilename,
            original_filename: doc.file.name,
            pages: doc.pages,
            status: 'pending',
            total_cost: calcularValor(doc.pages, doc.isExtrato, doc.tipoTrad),
            verification_code: 'TFE' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            is_authenticated: true,
            upload_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tipo_trad: mapTipoTradToDatabase(doc.tipoTrad),
            idioma_raiz: doc.idiomaRaiz,
            idioma_destino: doc.idiomaDestino,
            is_bank_statement: doc.isExtrato,
            source_currency: doc.isExtrato ? doc.sourceCurrency : null,
            target_currency: doc.isExtrato ? doc.targetCurrency : null
          })
          .select()
          .single();

        if (createError) {
          console.error('ERROR: Erro ao criar documento no banco:', createError);
          throw new Error(`Erro ao criar documento ${doc.file.name}: ${createError.message}`);
        }

        console.log('DEBUG: Documento criado:', newDocument.id);
        documentIds.push(newDocument.id);
        
        // Atualizar o documento com o ID
        updateDocument(doc.id, { documentId: newDocument.id });
      }
      
      // Armazenar os IDs dos documentos para usar nos modais de pagamento
      setCurrentDocumentIds(documentIds);
      
      // Mostrar modal de seleção de método de pagamento
      setShowPaymentModal(true);

    } catch (err: any) {
      console.error('ERROR: Erro ao preparar documentos:', err);
      setError(err.message || 'Erro ao preparar documentos');
    } finally {
      setIsUploading(false);
    }
  };

  // Função para redirecionar para checkout Zelle COM UPLOAD
  const handleZelleRedirect = async (amount: number) => {
    if (documents.length === 0 || !user || currentDocumentIds.length === 0) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      console.log('🚀 Uploading documents for Zelle payment...');
      
      // Fazer upload de todos os arquivos para o Storage
      for (const doc of documents) {
        if (!doc.documentId) continue;
        
        const fileName = generateUniqueFileName(doc.file.name, user.id);
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, doc.file);

        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          throw new Error(`Falha ao fazer upload do documento ${doc.file.name}`);
        }

        // Obter URL público
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        console.log('✅ Document uploaded successfully:', publicUrl);

        // Atualizar o documento no banco com file_url, payment_method e status zelle_pending
        const { error: updateError } = await supabase
          .from('documents')
          .update({ 
            file_url: publicUrl,
            payment_method: 'zelle',
            status: 'zelle_pending'
          })
          .eq('id', doc.documentId);

        if (updateError) {
          console.error('❌ Database update error:', updateError);
          throw new Error(`Falha ao atualizar documento ${doc.file.name} no banco`);
        }
      }

      console.log('✅ All documents updated in database with file_url');

      // Redirecionar para Zelle checkout com o primeiro documento (pode precisar ajustar para múltiplos)
      const firstDoc = documents[0];
      const params = new URLSearchParams({
        document_id: currentDocumentIds.join(','), // Passar todos os IDs separados por vírgula
        amount: amount.toString(),
        filename: firstDoc.file.name,
        pages: firstDoc.pages?.toString() || '1'
      });
      
      navigate(`/zelle-checkout?${params.toString()}`);
      
    } catch (err: any) {
      console.error('❌ Error preparing Zelle payment:', err);
      setError(err.message || 'Erro ao preparar pagamento Zelle');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDirectStripePayment = async () => {
    if (documents.length === 0 || !user || currentDocumentIds.length === 0) {
      setError('Nenhum documento selecionado');
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Processar todos os documentos e criar uma sessão de checkout que inclua todos
      const documentItems = [];
      
      for (const doc of documents) {
        if (!doc.documentId) continue;
        
        let fileId = '';
        
        if (isMobile) {
          // Mobile: Tentar usar IndexedDB primeiro, se falhar usar upload direto
          try {
            fileId = await fileStorage.storeFile(doc.file, {
              documentType: mapTipoTradToDatabase(doc.tipoTrad),
              certification: true,
              notarization: doc.tipoTrad === 'Notarized',
              pageCount: doc.pages,
              isBankStatement: doc.isExtrato,
              originalLanguage: doc.idiomaRaiz,
              targetLanguage: doc.idiomaDestino,
              userId: user.id,
              sourceCurrency: doc.isExtrato ? doc.sourceCurrency : null,
              targetCurrency: doc.isExtrato ? doc.targetCurrency : null
            });
          } catch (indexedDBError) {
            // Fallback: Upload direto para Supabase Storage
            const filePath = generateUniqueFileName(doc.file.name, user.id);
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, doc.file);
            if (uploadError) throw uploadError;
            fileId = filePath;
          }
        } else {
          // Desktop: Salvar arquivo no IndexedDB primeiro
          fileId = await fileStorage.storeFile(doc.file, {
            documentType: mapTipoTradToDatabase(doc.tipoTrad),
            certification: true,
            notarization: doc.tipoTrad === 'Notarized',
            pageCount: doc.pages,
            isBankStatement: doc.isExtrato,
            originalLanguage: doc.idiomaRaiz,
            targetLanguage: doc.idiomaDestino,
            userId: user.id,
            sourceCurrency: doc.isExtrato ? doc.sourceCurrency : null,
            targetCurrency: doc.isExtrato ? doc.targetCurrency : null
          });
        }
        
        // Determinar fileId e filePath baseado na plataforma
        // Se for mobile e fileId contém '/' (é um caminho), usar filePath, senão usar fileId
        const isFilePath = isMobile && fileId.includes('/');
        
        const documentItem: any = {
          documentId: doc.documentId,
          pages: doc.pages,
          isNotarized: doc.tipoTrad === 'Notarized',
          isBankStatement: doc.isExtrato,
          filename: generateUniqueFilename(doc.file.name),
          originalFilename: doc.file.name,
          originalLanguage: doc.idiomaRaiz,
          targetLanguage: doc.idiomaDestino,
          documentType: mapTipoTradToDatabase(doc.tipoTrad),
          sourceCurrency: doc.isExtrato ? doc.sourceCurrency : null,
          targetCurrency: doc.isExtrato ? doc.targetCurrency : null,
          fileSize: doc.file.size,
          fileType: doc.file.type
        };
        
        if (isFilePath) {
          documentItem.filePath = fileId;
        } else {
          documentItem.fileId = fileId;
        }
        
        documentItems.push(documentItem);
      }
      
      // Criar payload com múltiplos documentos
      const payload = {
        documents: documentItems, // Array de documentos
        userId: user.id,
        userEmail: user.email,
        isMobile: isMobile,
        clientName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
        totalAmount: totalValue
      };

      console.log('DEBUG: Payload com múltiplos documentos:', payload);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      // Usar a nova função para múltiplos documentos
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session-multiple`, {
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
      console.error('ERROR: Erro ao processar pagamento Stripe:', err);
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">{t('upload.pageTitle')}</h1>
          <p className="text-gray-600 text-lg">{t('upload.pageDescription')}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Upload Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              {/* Instructions Section */}
              <div className="bg-tfe-blue-50 border border-tfe-blue-200 rounded-xl p-6 mb-8">
                <h2 className="text-2xl font-bold text-tfe-blue-950 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('upload.howItWorksTitle')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-tfe-blue-800">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-tfe-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">1</div>
                    <p className="font-medium">{t('upload.steps.upload.title')}</p>
                    <p className="text-tfe-blue-700">{t('upload.steps.upload.description')}</p>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-tfe-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">2</div>
                    <p className="font-medium">{t('upload.steps.choose.title')}</p>
                    <p className="text-tfe-blue-700">{t('upload.steps.choose.description')}</p>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 bg-tfe-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">3</div>
                    <p className="font-medium">{t('upload.steps.receive.title')}</p>
                    <p className="text-tfe-blue-700">{t('upload.steps.receive.description')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Upload Area */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold text-gray-800">{t('upload.form.selectDocument')}</h2>
                    {documents.length > 0 && (
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-tfe-blue-600 text-white rounded-lg hover:bg-tfe-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Mais Documentos
                      </button>
                    )}
                  </div>
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
                      onChange={handleInputChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      id="file-upload"
                      aria-label="Upload document file input"
                      title="Select documents to upload"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-base text-gray-600 font-medium">
                        {documents.length === 0 
                          ? t('upload.form.uploadArea.clickToUpload')
                          : 'Arraste e solte mais arquivos ou clique para adicionar'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t('upload.form.uploadArea.supportedFormats')} - Você pode adicionar múltiplos documentos
                      </p>
                    </div>
                  </div>
                </section>

                {/* Documents List */}
                {documents.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Documentos Adicionados ({documents.length})</h2>
                    {documents.map((doc) => (
                      <div key={doc.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="w-8 h-8 text-tfe-blue-500" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{doc.file.name}</p>
                              <p className="text-sm text-gray-500">{(doc.file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeDocument(doc.id)}
                            className="p-2 text-tfe-red-500 hover:bg-tfe-red-50 rounded-lg transition-colors"
                            title="Remover documento"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {doc.fileUrl && doc.file.type.startsWith('image/') && (
                          <div className="mb-4">
                            <img src={doc.fileUrl} alt="Preview" className="max-h-32 rounded shadow" />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Pages */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('upload.form.numberOfPages')}
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={doc.pages}
                              onChange={e => updateDocument(doc.id, { pages: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                              disabled
                            />
                          </div>

                          {/* Translation Type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('upload.form.translationType')}
                            </label>
                            <select
                              value={doc.tipoTrad}
                              onChange={e => updateDocument(doc.id, { tipoTrad: e.target.value as 'Certified' | 'Notarized' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                            >
                              {translationTypes.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Is Bank Statement */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('upload.form.isBankStatement')}
                            </label>
                            <select
                              value={doc.isExtrato ? 'yes' : 'no'}
                              onChange={e => updateDocument(doc.id, { isExtrato: e.target.value === 'yes' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                            >
                              <option value="no">{t('upload.form.selectOptions.no')}</option>
                              <option value="yes">{t('upload.form.selectOptions.yes')}</option>
                            </select>
                          </div>

                          {/* Original Language */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('upload.form.originalLanguage')}
                            </label>
                            <select
                              value={doc.idiomaRaiz}
                              onChange={e => updateDocument(doc.id, { idiomaRaiz: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                            >
                              {(t('upload.serviceInfo.supportedLanguages.languages', { returnObjects: true }) as unknown as string[]).map((lang: string, index: number) => (
                                <option key={index} value={lang}>{lang}</option>
                              ))}
                            </select>
                          </div>

                          {/* Target Language */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('upload.form.targetLanguage')}
                            </label>
                            <select
                              value={doc.idiomaDestino}
                              onChange={e => updateDocument(doc.id, { idiomaDestino: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                            >
                              {targetLanguages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Currency Fields - Only show when isExtrato is true */}
                        {doc.isExtrato && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                4.1. Source Currency (Original Document)
                              </label>
                              <select
                                value={doc.sourceCurrency}
                                onChange={e => updateDocument(doc.id, { sourceCurrency: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                              >
                                {currencies.map(currency => (
                                  <option key={currency} value={currency}>{currency}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                4.2. Target Currency (Translation To)
                              </label>
                              <select
                                value={doc.targetCurrency}
                                onChange={e => updateDocument(doc.id, { targetCurrency: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                              >
                                {currencies.map(currency => (
                                  <option key={currency} value={currency}>{currency}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Document Price */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Valor deste documento:</span>
                            <span className="text-lg font-bold text-tfe-blue-950">
                              ${calcularValor(doc.pages, doc.isExtrato, doc.tipoTrad)}.00
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>
                )}

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
                {documents.length > 0 && (
                  <div className="pt-4">
                    <button
                      onClick={handleUpload}
                      disabled={documents.length === 0 || isUploading}
                      className="w-full bg-gradient-to-r from-tfe-blue-950 to-tfe-red-950 text-white py-4 rounded-xl font-bold shadow-lg hover:from-blue-800 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all"
                    >
                      {isUploading ? t('common.loading') : `${t('upload.summary.processPayment')} $${totalValue}.00`}
                    </button>
                  </div>
                )}
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
                  {t('upload.summary.title')}
                </h3>
                {documents.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-base text-gray-700">Total ({documents.length} {documents.length === 1 ? 'documento' : 'documentos'}):</span>
                      <span className="text-2xl font-bold text-tfe-blue-950">${totalValue}.00</span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {documents.map((doc, index) => (
                        <div key={doc.id} className="text-xs text-tfe-blue-950/80 bg-tfe-blue-100 rounded p-2">
                          <p className="font-medium">{doc.file.name}</p>
                          <p>
                            {translationTypes.find(t => t.value === doc.tipoTrad)?.label} ${doc.tipoTrad === 'Notarized' ? '20' : '15'}{doc.isExtrato ? ' + $10' : ''} {t('upload.summary.pricing.perPage')} × {doc.pages} {doc.pages !== 1 ? t('upload.summary.pages') : t('upload.summary.page')} = ${calcularValor(doc.pages, doc.isExtrato, doc.tipoTrad)}.00
                          </p>
                          <p className="text-tfe-blue-950/70 flex items-center gap-1 mt-1">
                            <Globe className="w-3 h-3" />
                            {doc.idiomaRaiz} → {doc.idiomaDestino}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600">Adicione documentos para ver o resumo</p>
                  </div>
                )}
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
                  {t('upload.serviceInfo.title')}
                </h3>
                
                <div className="space-y-6">
                  {/* Translation Types */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-tfe-blue-600" />
                      {t('upload.serviceInfo.translationTypes.title')}
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-800">{t('upload.serviceInfo.translationTypes.certified.title')}</span>
                          <span className="text-sm font-bold text-tfe-blue-600">{t('upload.serviceInfo.translationTypes.certified.price')}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {t('upload.serviceInfo.translationTypes.certified.description')}
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• {t('upload.serviceInfo.translationTypes.certified.features.0', 'Official certification stamp')}</li>
                          <li>• {t('upload.serviceInfo.translationTypes.certified.features.1', 'USCIS accepted')}</li>
                          <li>• {t('upload.serviceInfo.translationTypes.certified.features.2', 'Digital verification code')}</li>
                          <li>• {t('upload.serviceInfo.translationTypes.certified.features.3', '24-48 hour turnaround')}</li>
                        </ul>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-800">{t('upload.serviceInfo.translationTypes.notarized.title')}</span>
                          <span className="text-sm font-bold text-tfe-blue-600">{t('upload.serviceInfo.translationTypes.notarized.price')}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {t('upload.serviceInfo.translationTypes.notarized.description')}
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• {t('upload.serviceInfo.translationTypes.notarized.features.0', 'Notary public certification')}</li>
                          <li>• {t('upload.serviceInfo.translationTypes.notarized.features.1', 'Legal document authentication')}</li>
                          <li>• {t('upload.serviceInfo.translationTypes.notarized.features.2', 'Court-accepted format')}</li>
                          <li>• {t('upload.serviceInfo.translationTypes.notarized.features.3', 'Enhanced verification')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Document Types */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-tfe-blue-600" />
                      {t('upload.serviceInfo.documentTypes.title')}
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-800">{t('upload.serviceInfo.documentTypes.regular.title')}</span>
                          <span className="text-sm text-gray-600">{t('upload.serviceInfo.documentTypes.regular.price')}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {t('upload.serviceInfo.documentTypes.regular.description')}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-800">{t('upload.serviceInfo.documentTypes.bankStatements.title')}</span>
                          <span className="text-sm font-bold text-orange-600">{t('upload.serviceInfo.documentTypes.bankStatements.price')}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {t('upload.serviceInfo.documentTypes.bankStatements.description')}
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• {t('upload.serviceInfo.documentTypes.bankStatements.features.0', 'Enhanced verification process')}</li>
                          <li>• {t('upload.serviceInfo.documentTypes.bankStatements.features.1', 'Financial document formatting')}</li>
                          <li>• {t('upload.serviceInfo.documentTypes.bankStatements.features.2', 'Additional security measures')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-tfe-blue-600" />
                      {t('upload.serviceInfo.supportedLanguages.title')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(t('upload.serviceInfo.supportedLanguages.languages', { returnObjects: true }) as unknown as string[]).map((lang: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-gray-700">{lang}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('upload.serviceInfo.supportedLanguages.note')}
                    </p>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-tfe-blue-600" />
                      {t('upload.serviceInfo.serviceFeatures.title')}
                    </h4>
                    <div className="space-y-2 text-sm">
                      {(t('upload.serviceInfo.serviceFeatures.features', { returnObjects: true }) as unknown as string[]).map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Método de Pagamento */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSelectStripe={() => {
          setShowPaymentModal(false);
          handleDirectStripePayment();
        }}
        onSelectZelle={() => {
          setShowPaymentModal(false);
          handleZelleRedirect(totalValue);
        }}
        amount={totalValue}
      />

      {/* Modal de Pagamento Zelle */}
      {currentDocumentIds.length > 0 && documents.length > 0 && (
        <ZellePaymentModal
          isOpen={showZelleModal}
          onClose={() => setShowZelleModal(false)}
          amount={totalValue}
          documentId={currentDocumentIds[0]}
          userId={user?.id || ''}
          documentDetails={{
            filename: documents[0]?.file.name || '',
            pages: documents[0]?.pages || 1,
            translationType: documents[0]?.tipoTrad || 'Certified'
          }}
        />
      )}
    </div>
  );
} 