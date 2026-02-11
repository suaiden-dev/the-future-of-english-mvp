import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Info, Shield, DollarSign, Globe, Award, X, Plus, Loader2 } from 'lucide-react';
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
        const uniqueFilename = generateUniqueFileName(doc.file.name);
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

        const fileName = generateUniqueFileName(doc.file.name);
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
            const filePath = generateUniqueFileName(doc.file.name);
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
          filename: generateUniqueFileName(doc.file.name),
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight">
            {t('upload.pageTitle')}
          </h1>
          <p className="text-gray-600 text-lg font-medium opacity-80">
            {t('upload.pageDescription')}
          </p>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Upload Form */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg p-8 border border-gray-200">
              {/* Instructions Section */}
              <div className="bg-gradient-to-br from-[#163353]/5 to-[#C71B2D]/5 backdrop-blur-sm border border-[#163353]/10 rounded-2xl p-6 mb-8">
                <h2 className="text-xl font-black text-[#163353] mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <FileText className="w-5 h-5 text-[#C71B2D]" />
                  {t('upload.howItWorksTitle')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { step: 1, title: t('upload.steps.upload.title'), desc: t('upload.steps.upload.description') },
                    { step: 2, title: t('upload.steps.choose.title'), desc: t('upload.steps.choose.description') },
                    { step: 3, title: t('upload.steps.receive.title'), desc: t('upload.steps.receive.description') }
                  ].map((item) => (
                    <div key={item.step} className="flex flex-col items-center text-center group">
                      <div className="w-10 h-10 bg-[#163353] text-white rounded-xl flex items-center justify-center font-black mb-3 shadow-lg group-hover:scale-110 transition-transform">
                        {item.step}
                      </div>
                      <p className="font-bold text-gray-900 mb-1">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                {/* Upload Area */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">{t('upload.form.selectDocument')}</h2>
                    {documents.length > 0 && (
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#163353]/10 text-[#163353] rounded-xl font-bold hover:bg-[#163353]/20 transition-all border border-[#163353]/10 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Mais
                      </button>
                    )}
                  </div>
                  <div
                    className={`relative group border-2 border-dashed rounded-[24px] p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${
                      dragActive 
                        ? 'border-[#C71B2D] bg-[#C71B2D]/5 scale-[0.99]' 
                        : 'border-gray-200 bg-gray-50/50 hover:border-[#163353]/40 hover:bg-white/80'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    style={{ minHeight: 200 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <input
                      type="file"
                      ref={inputRef}
                      onChange={handleInputChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                    />
                    
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className={`p-4 rounded-2xl transition-colors ${dragActive ? 'bg-[#C71B2D]/10 text-[#C71B2D]' : 'bg-[#163353]/5 text-[#163353] group-hover:bg-[#163353]/10'}`}>
                        <Upload className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="text-lg text-gray-900 font-black">
                          {documents.length === 0
                            ? t('upload.form.uploadArea.clickToUpload')
                            : 'Solte para adicionar mais arquivos'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                          {t('upload.form.uploadArea.supportedFormats')}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Documents List */}
                {documents.length > 0 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                        Documentos Adicionados ({documents.length})
                      </h2>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:border-[#C71B2D]/30 transition-all group">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-12 h-12 bg-[#163353]/10 rounded-xl flex items-center justify-center text-[#163353] group-hover:bg-[#C71B2D]/10 group-hover:text-[#C71B2D] transition-colors">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <p className="font-black text-gray-900 leading-tight">{doc.file.name}</p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                                  {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeDocument(doc.id)}
                              className="p-2 text-gray-400 hover:text-[#C71B2D] hover:bg-[#C71B2D]/5 rounded-xl transition-all"
                              title="Remover documento"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Pages */}
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('upload.form.numberOfPages')}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={doc.pages}
                                  onChange={e => updateDocument(doc.id, { pages: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#C71B2D] focus:border-transparent transition-all outline-none disabled:opacity-70"
                                  disabled
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <FileText className="w-4 h-4" />
                                </div>
                              </div>
                            </div>

                            {/* Translation Type */}
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('upload.form.translationType')}
                              </label>
                              <select
                                value={doc.tipoTrad}
                                onChange={e => updateDocument(doc.id, { tipoTrad: e.target.value as 'Certified' | 'Notarized' })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#C71B2D] focus:border-transparent transition-all outline-none cursor-pointer appearance-none"
                              >
                                {translationTypes.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Is Bank Statement */}
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('upload.form.isBankStatement')}
                              </label>
                              <select
                                value={doc.isExtrato ? 'yes' : 'no'}
                                onChange={e => updateDocument(doc.id, { isExtrato: e.target.value === 'yes' })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#C71B2D] focus:border-transparent transition-all outline-none cursor-pointer appearance-none"
                              >
                                <option value="no">{t('upload.form.selectOptions.no')}</option>
                                <option value="yes">{t('upload.form.selectOptions.yes')}</option>
                              </select>
                            </div>

                            {/* Original Language */}
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('upload.form.originalLanguage')}
                              </label>
                              <select
                                value={doc.idiomaRaiz}
                                onChange={e => updateDocument(doc.id, { idiomaRaiz: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#C71B2D] focus:border-transparent transition-all outline-none cursor-pointer appearance-none"
                              >
                                {(t('upload.serviceInfo.supportedLanguages.languages', { returnObjects: true }) as unknown as string[]).map((lang: string, index: number) => (
                                  <option key={index} value={lang}>{lang}</option>
                                ))}
                              </select>
                            </div>

                            {/* Target Language */}
                            <div>
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('upload.form.targetLanguage')}
                              </label>
                              <select
                                value={doc.idiomaDestino}
                                onChange={e => updateDocument(doc.id, { idiomaDestino: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#C71B2D] focus:border-transparent transition-all outline-none cursor-pointer appearance-none"
                              >
                                {targetLanguages.map(lang => (
                                  <option key={lang} value={lang}>{lang}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {doc.isExtrato && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
                              <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                  4.1. Source Currency (Original Document)
                                </label>
                                <select
                                  value={doc.sourceCurrency}
                                  onChange={e => updateDocument(doc.id, { sourceCurrency: e.target.value })}
                                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#C71B2D] focus:border-transparent transition-all outline-none cursor-pointer appearance-none"
                                >
                                  {currencies.map(currency => (
                                    <option key={currency} value={currency}>{currency}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                  4.2. Target Currency (Translation To)
                                </label>
                                <select
                                  value={doc.targetCurrency}
                                  onChange={e => updateDocument(doc.id, { targetCurrency: e.target.value })}
                                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-[#C71B2D] focus:border-transparent transition-all outline-none cursor-pointer appearance-none"
                                >
                                  {currencies.map(currency => (
                                    <option key={currency} value={currency}>{currency}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          <div className="mt-6 pt-4 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Subtotal</span>
                              <span className="text-2xl font-black text-[#163353] tracking-tight">
                                ${calcularValor(doc.pages, doc.isExtrato, doc.tipoTrad)}.00
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {error && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-red-700 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-bold">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4 text-green-700 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-bold">{success}</span>
                  </div>
                )}

                {documents.length > 0 && (
                  <div className="pt-4 hidden lg:block">
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="group relative w-full bg-[#163353] hover:bg-[#0A1A2F] text-white py-5 rounded-[20px] font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl overflow-hidden shadow-[#163353]/20"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                      <div className="relative flex items-center justify-center gap-3">
                        {isUploading ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>{t('common.loading')}</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-6 h-6" />
                            <span>{t('upload.summary.processPayment')} ${totalValue}.00</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-10 space-y-6">
              <div className="bg-[#163353] rounded-[30px] p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C71B2D]/20 rounded-full blur-2xl -ml-10 -mb-10 group-hover:scale-150 transition-transform duration-700" />
                
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-widest relative z-10">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  {t('upload.summary.title')}
                </h3>
                
                {documents.length > 0 ? (
                  <div className="relative z-10 space-y-6">
                    <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                      {documents.map((doc) => (
                        <div key={doc.id} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                          <p className="font-bold text-sm truncate mb-2">{doc.file.name}</p>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/60">
                            <span>{doc.pages} {doc.pages === 1 ? 'Page' : 'Pages'}</span>
                            <span className="text-white">${calcularValor(doc.pages, doc.isExtrato, doc.tipoTrad)}.00</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-white/10 space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-black uppercase tracking-widest text-white/60">Total Amount</span>
                        <span className="text-4xl font-black tracking-tight">${totalValue}.00</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 text-center py-10 opacity-60">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhum documento selecionado</p>
                  </div>
                )}
              </div>

              <div className="lg:hidden">
                <button
                  onClick={handleUpload}
                  disabled={isUploading || documents.length === 0}
                  className="w-full bg-[#163353] text-white py-5 rounded-[20px] font-black text-lg transition-all active:scale-95 shadow-xl disabled:opacity-50"
                >
                  {isUploading ? t('common.loading') : `Finalizar Pedido • $${totalValue}.00`}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: 'USCIS Accepted' },
                  { icon: Globe, label: 'Fast Delivery' }
                ].map((badge, i) => (
                  <div key={i} className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-gray-200 flex flex-col items-center text-center">
                    <badge.icon className="w-5 h-5 text-[#163353] mb-2" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                      {badge.label}
                    </span>
                  </div>
                ))}
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