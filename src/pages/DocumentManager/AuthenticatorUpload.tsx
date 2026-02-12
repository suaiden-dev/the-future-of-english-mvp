import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Info, Shield, Globe, Award, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { generateUniqueFileName } from '../../utils/fileUtils';
import { useI18n } from '../../contexts/I18nContext';

export default function AuthenticatorUpload() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pages, setPages] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipoTrad, setTipoTrad] = useState<'Certified' | 'Notarized'>('Certified');
  const [isExtrato, setIsExtrato] = useState(false);
  const [idiomaRaiz, setIdiomaRaiz] = useState('Portuguese');
  const [idiomaDestino, setIdiomaDestino] = useState('English');
  const [uploadType, setUploadType] = useState<'client' | 'personal'>('client');
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptFileUrl, setReceiptFileUrl] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Estados para moedas do bank statement
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('USD');

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
    'CHF',
    'CNY',
    'MXN',
    'ARS',
    'CLP',
    'COP',
  ];

  const paymentMethods = [
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'transfer', label: 'Bank Transfer' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'other', label: 'Other' },
  ];

  function calcularValor(pages: number, tipoTrad: string) {
    let basePrice = tipoTrad === 'Notarized' ? 20 : 15; // $20 for Notarized, $15 for Certified
    return pages * basePrice;
  }

  // Função para mapear o tipo de tradução para o valor correto no banco
  function mapTipoTradToDatabase(tipoTrad: 'Certified' | 'Notarized'): string {
    return tipoTrad === 'Certified' ? 'Certificado' : 'Notorizado';
  }

  const valor = calcularValor(pages, tipoTrad);

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
    console.log('DEBUG: handleFileChange called with file:', file);
    setSelectedFile(file);
    setError(null);
    setSuccess(null);

    // Reset upload state
    setIsUploading(false);

    // Validate file type
    if (!file.type.includes('pdf')) {
      setError('Please select a PDF file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    try {
      // Load PDF.js for page counting
      if (!pdfjsLib) {
        await loadPdfJs();
      }

      // Count pages
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      setPages(pageCount);

      console.log('DEBUG: PDF loaded, pages:', pageCount);

      // Generate preview URL
      const url = URL.createObjectURL(file);
      setFileUrl(url);

    } catch (error) {
      console.error('Error processing PDF:', error);
      setError('Error processing PDF file. Please try again.');
    }
  };

  const handleReceiptFileChange = (file: File) => {
    setReceiptFile(file);
    setError(null);

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image/')) {
      setError('Receipt file must be PDF or image (JPG, PNG).');
      return;
    }

    // Validate file size (max 5MB for receipt)
    if (file.size > 5 * 1024 * 1024) {
      setError('Receipt file size must be less than 5MB.');
      return;
    }

    // Generate preview URL
    const url = URL.createObjectURL(file);
    setReceiptFileUrl(url);
  };

  // Função para processar upload direto (SEM PAGAMENTO para autenticador)
  const handleDirectUpload = async (fileId: string, customPayload?: any) => {
    try {
      console.log('DEBUG: === HANDLE DIRECT UPLOAD START ===');
      console.log('DEBUG: Timestamp:', new Date().toISOString());
      console.log('DEBUG: Autenticador - Upload direto sem pagamento');
      console.log('DEBUG: File ID recebido:', fileId);
      console.log('DEBUG: Custom payload:', customPayload);

      if (!selectedFile) {
        throw new Error('No file selected');
      }

      // Validar client name apenas se for upload para cliente
      if (uploadType === 'client' && !clientName.trim()) {
        throw new Error('Client name is required when uploading for a client');
      }

      const metadata = {
        documentType: tipoTrad,
        certification: false,
        notarization: tipoTrad === 'Certified',
        pageCount: pages,
        isBankStatement: isExtrato,
        originalLanguage: idiomaRaiz,
        targetLanguage: idiomaDestino,
        userId: user?.id,
        uploadType: uploadType,
        ...(uploadType === 'client' && {
          clientName: clientName.trim(),
          paymentMethod: paymentMethod
        }),
        ...(isExtrato && {
          sourceCurrency: sourceCurrency,
          targetCurrency: targetCurrency
        })
      };

      console.log('DEBUG: Salvando arquivo no IndexedDB com metadata:', metadata);

      // Usar payload customizado se fornecido (que já tem originalLanguage e targetLanguage corretos)
      const payload = customPayload || {
        pages,
        isCertified: false,
        isNotarized: tipoTrad === 'Certified',
        isBankStatement: isExtrato,
        filePath: fileId,
        userId: user?.id,
        userEmail: user?.email,
        filename: selectedFile?.name,
        clientName: clientName.trim(),
        originalLanguage: idiomaRaiz,
        targetLanguage: idiomaDestino,
        documentType: 'Certificado',
        paymentMethod: paymentMethod,
        ...(isExtrato && {
          sourceCurrency: sourceCurrency,
          targetCurrency: targetCurrency
        })
      };
      console.log('Payload final a ser enviado para webhook:', payload);

      // Verificar se o documento já existe na tabela documents
      console.log('DEBUG: Verificando se documento já existe na tabela documents...');
      // Gerar nome único para o arquivo usando o padrão centralizado (Lush America)
      const rawUniqueFilename = generateUniqueFileName(selectedFile?.name || 'document');
      const uniqueFilename = `${user?.id}/${rawUniqueFilename}`;
      console.log('DEBUG: Nome original:', selectedFile?.name);
      console.log('DEBUG: Nome único gerado com pasta:', uniqueFilename);

      // Como agora usamos nomes únicos, não precisamos verificar duplicatas
      // Sempre criaremos um novo documento

      // Criar documento na tabela documents primeiro (para que a edge function possa puxar client_name)
      console.log('DEBUG: Criando documento na tabela documents...');
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(payload.filePath);

      console.log('DEBUG: Dados para inserção na tabela documents:');
      console.log('DEBUG: user:', user);
      console.log('DEBUG: user_id:', user?.id);
      console.log('DEBUG: filename:', selectedFile?.name);
      console.log('DEBUG: pages:', pages);
      console.log('DEBUG: valor:', valor);
      console.log('DEBUG: tipo_trad:', mapTipoTradToDatabase(tipoTrad));
      console.log('DEBUG: idioma_raiz:', idiomaRaiz);
      console.log('DEBUG: idioma_destino:', idiomaDestino);
      console.log('DEBUG: isExtrato:', isExtrato);
      console.log('DEBUG: clientName:', clientName);

      const documentData: any = {
        user_id: user?.id,
        filename: uniqueFilename, // Nome único para evitar conflitos
        original_filename: selectedFile?.name || 'unknown', // Nome original para exibição
        pages: pages,
        status: 'pending',
        total_cost: valor,
        tipo_trad: mapTipoTradToDatabase(tipoTrad),
        valor: valor,
        idioma_raiz: idiomaRaiz,
        idioma_destino: idiomaDestino,
        is_bank_statement: isExtrato,
        file_url: publicUrl,
        verification_code: `AUTH${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
        is_internal_use: uploadType === 'personal'
      };

      // Adicionar campos de cliente apenas se for upload para cliente
      if (uploadType === 'client') {
        documentData.client_name = clientName.trim();
        documentData.payment_method = paymentMethod;
      }

      // Adicionar campos condicionais apenas se necessário
      if (isExtrato) {
        documentData.source_currency = sourceCurrency;
        documentData.target_currency = targetCurrency;
      }

      console.log('DEBUG: Document data to insert:', documentData);
      console.log('DEBUG: Verificação dos campos no documentData:');
      console.log('DEBUG: - documentData.filename:', documentData.filename);
      console.log('DEBUG: - documentData.original_filename:', documentData.original_filename);

      const { data: createdDoc, error: createError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      if (createError) {
        console.error('ERROR: Erro ao criar documento na tabela documents:', createError);
        console.error('ERROR: Detalhes do erro:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint
        });
        throw new Error(`Error saving document to database: ${createError.message}`);
      }

      console.log('DEBUG: Documento criado na tabela documents:', createdDoc);
      console.log('DEBUG: createdDoc?.id:', createdDoc?.id);
      console.log('DEBUG: selectedFile?.name:', selectedFile?.name);

      // Preparar dados para o webhook
      const webhookData = {
        filename: uniqueFilename, // Nome único para processamento interno
        original_filename: selectedFile?.name || 'unknown', // Nome original para exibição
        original_document_id: createdDoc?.id, // ID do documento criado na tabela documents
        url: payload.filePath, // Sempre o caminho completo
        user_id: user?.id,
        paginas: pages,
        valor: valor,
        is_bank_statement: isExtrato,
        client_name: clientName.trim(),
        idioma_raiz: idiomaRaiz,
        idioma_destino: idiomaDestino,
        tipo_trad: mapTipoTradToDatabase(tipoTrad),
        mimetype: selectedFile?.type,
        size: selectedFile?.size,
        payment_method: paymentMethod,
        ...(isExtrato && {
          source_currency: sourceCurrency,
          target_currency: targetCurrency
        })
      };

      console.log('DEBUG: Dados enviados para webhook:', webhookData);
      console.log('DEBUG: Verificação dos campos específicos:');
      console.log('DEBUG: - webhookData.original_filename:', webhookData.original_filename);
      console.log('DEBUG: - webhookData.original_document_id:', webhookData.original_document_id);
      console.log('DEBUG: - webhookData.filename:', webhookData.filename);
      console.log('DEBUG: Nome original vs único no webhook:');
      console.log('DEBUG: - Nome original:', selectedFile?.name);
      console.log('DEBUG: - Nome único (webhook):', uniqueFilename);
      console.log('DEBUG: - ID do documento original:', createdDoc?.id);

      // Enviar direto para o webhook de tradução (SEM Stripe)
      console.log('DEBUG: === ENVIANDO PARA WEBHOOK ===');
      console.log('DEBUG: Timestamp:', new Date().toISOString());

      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-translation-webhook`;
      console.log('DEBUG: Webhook URL:', webhookUrl);
      console.log('DEBUG: Webhook data:', JSON.stringify(webhookData, null, 2));

      console.log('DEBUG: JSON sendo enviado para webhook:', JSON.stringify(webhookData, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(webhookData)
      });

      console.log('DEBUG: Resposta do webhook status:', response.status);
      console.log('DEBUG: Resposta do webhook headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('DEBUG: Resposta do webhook body:', responseText);

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: 'Response is not JSON', raw: responseText };
        }
        console.error('Erro detalhado do webhook:', errorData);
        throw new Error(errorData.error || 'Error sending document for translation');
      }

      console.log('DEBUG: === HANDLE DIRECT UPLOAD SUCCESS ===');
      console.log('DEBUG: Timestamp:', new Date().toISOString());
      setSuccess('Document uploaded successfully and sent for translation!');

    } catch (err: any) {
      console.error('ERROR: === HANDLE DIRECT UPLOAD ERROR ===');
      console.error('ERROR: Timestamp:', new Date().toISOString());
      console.error('ERROR: Erro no upload:', err);
      setError(err.message || 'Error processing upload');
    }
  };

  const handleUpload = async () => {
    console.log('DEBUG: === HANDLE UPLOAD START ===');
    console.log('DEBUG: Timestamp:', new Date().toISOString());
    console.log('DEBUG: handleUpload called - USER CLICKED UPLOAD BUTTON');
    console.log('DEBUG: selectedFile:', selectedFile);
    console.log('DEBUG: user:', user);
    console.log('DEBUG: clientName:', clientName);
    console.log('DEBUG: pages:', pages);
    console.log('DEBUG: tipoTrad:', tipoTrad);
    console.log('DEBUG: isExtrato:', isExtrato);
    console.log('DEBUG: idiomaRaiz:', idiomaRaiz);
    console.log('DEBUG: idiomaDestino:', idiomaDestino);
    console.log('DEBUG: isUploading:', isUploading);

    // Proteção contra chamadas duplicadas
    if (isUploading) {
      console.log('DEBUG: Upload já em andamento, ignorando chamada duplicada');
      return;
    }

    if (!selectedFile || !user) {
      console.log('DEBUG: Upload bloqueado - validação básica falhou');
      console.log('DEBUG: selectedFile exists:', !!selectedFile);
      console.log('DEBUG: user exists:', !!user);
      return;
    }

    // Validar client name apenas se for upload para cliente
    if (uploadType === 'client' && !clientName.trim()) {
      console.log('DEBUG: Upload bloqueado - Client Name é obrigatório para uploads de cliente');
      setError('Client name is required when uploading for a client. Please enter the client\'s full name.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      console.log('DEBUG: === INICIANDO UPLOAD E ENVIO PARA WEBHOOK ===');
      console.log('DEBUG: Usuário clicou no botão - fazendo upload agora');

      // Upload direto para Supabase Storage
      console.log('DEBUG: Fazendo upload para Supabase Storage');
      const rawFilePath = generateUniqueFileName(selectedFile.name);
      const filePath = `${user.id}/${rawFilePath}`;
      console.log('DEBUG: Tentando upload para Supabase Storage:', filePath);

      const { data, error: uploadError } = await supabase.storage.from('documents').upload(filePath, selectedFile);

      // Upload do comprovante de pagamento se existir
      let receiptPath = null;
      if (receiptFile) {
        try {
          const rawReceiptFilePath = generateUniqueFileName(`receipt_${receiptFile.name}`);
          const receiptFilePath = `${user.id}/${rawReceiptFilePath}`;
          const { data: receiptData, error: receiptError } = await supabase.storage
            .from('documents')
            .upload(receiptFilePath, receiptFile);

          if (receiptError) {
            console.error('DEBUG: Erro no upload do comprovante:', receiptError);
            throw receiptError;
          }

          console.log('DEBUG: Upload do comprovante bem-sucedido:', receiptData);
          receiptPath = receiptFilePath;
        } catch (err) {
          console.error('DEBUG: Erro ao fazer upload do comprovante:', err);
          // Não bloqueia o upload do documento principal se o comprovante falhar
        }
      }
      if (uploadError) {
        console.error('DEBUG: Erro no upload para Supabase Storage:', uploadError);
        throw uploadError;
      }

      console.log('DEBUG: Upload para Supabase Storage bem-sucedido:', data);

      // Debug dos valores antes de criar o payload
      console.log('DEBUG: Valores no momento do payload:');
      console.log('DEBUG: idiomaRaiz:', idiomaRaiz);
      console.log('DEBUG: idiomaDestino:', idiomaDestino);
      console.log('DEBUG: tipoTrad:', tipoTrad);
      console.log('DEBUG: isExtrato:', isExtrato);

      // Payload para webhook
      const payload: any = {
        pages,
        isCertified: false,
        isNotarized: tipoTrad === 'Certified',
        isBankStatement: isExtrato,
        filePath: filePath,
        userId: user.id,
        userEmail: user.email,
        filename: selectedFile?.name,
        originalLanguage: idiomaRaiz,
        targetLanguage: idiomaDestino,
        documentType: 'Certificado',
        isMobile: isMobile,
        uploadType: uploadType,
        isInternalUse: uploadType === 'personal',
        ...(isExtrato && {
          sourceCurrency: sourceCurrency,
          targetCurrency: targetCurrency
        })
      };

      // Adicionar campos de cliente apenas se for upload para cliente
      if (uploadType === 'client') {
        payload.clientName = clientName.trim();
        payload.paymentMethod = paymentMethod;
        payload.receiptPath = receiptPath;
      }
      console.log('DEBUG: Payload enviado:', payload);
      console.log('DEBUG: Payload.originalLanguage:', payload.originalLanguage);
      console.log('DEBUG: Payload.targetLanguage:', payload.targetLanguage);

      // Chama o upload direto com payload
      await handleDirectUpload(filePath, payload);

    } catch (err: any) {
      console.error('ERROR: === HANDLE UPLOAD ERROR ===');
      console.error('ERROR: Timestamp:', new Date().toISOString());
      console.error('ERROR: Erro no upload:', err);
      setError(err.message || 'Error processing upload');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden py-10 px-4">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C71B2D]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#163353]/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2 tracking-tight uppercase">Document Translation</h1>
          <p className="text-gray-600 font-medium opacity-80 uppercase tracking-[0.2em] text-xs">Upload documents for professional translation - Free access for authenticators</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Upload Form */}
          <div className="lg:col-span-2">
            <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] shadow-lg border border-gray-200 p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#163353]/5 rounded-full blur-[100px] pointer-events-none" />

              {/* Instructions Section */}
              <div className="relative bg-[#163353]/10 backdrop-blur-md border border-[#163353]/20 rounded-[24px] p-6 mb-8">
                <h2 className="text-2xl font-black text-[#163353] mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <FileText className="w-6 h-6" />
                  How It Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col items-center text-center bg-white/60 backdrop-blur-sm rounded-[16px] p-4 border border-gray-100">
                    <div className="w-10 h-10 bg-[#163353] text-white rounded-full flex items-center justify-center font-black mb-3 shadow-md shadow-[#163353]/20">1</div>
                    <p className="font-black text-gray-900 uppercase tracking-wider text-xs mb-1">Upload Document</p>
                    <p className="text-gray-600 text-xs font-medium">Select your PDF or image file</p>
                  </div>
                  <div className="flex flex-col items-center text-center bg-white/60 backdrop-blur-sm rounded-[16px] p-4 border border-gray-100">
                    <div className="w-10 h-10 bg-[#163353] text-white rounded-full flex items-center justify-center font-black mb-3 shadow-md shadow-[#163353]/20">2</div>
                    <p className="font-black text-gray-900 uppercase tracking-wider text-xs mb-1">Choose Service</p>
                    <p className="text-gray-600 text-xs font-medium">Select translation type and language</p>
                  </div>
                  <div className="flex flex-col items-center text-center bg-white/60 backdrop-blur-sm rounded-[16px] p-4 border border-gray-100">
                    <div className="w-10 h-10 bg-[#163353] text-white rounded-full flex items-center justify-center font-black mb-3 shadow-md shadow-[#163353]/20">3</div>
                    <p className="font-black text-gray-900 uppercase tracking-wider text-xs mb-1">Get Translation</p>
                    <p className="text-gray-600 text-xs font-medium">Receive your translated document</p>
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

                {/* Upload Type */}
                <section>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="upload-type">
                    3. Upload Type
                  </label>
                  <select
                    id="upload-type"
                    value={uploadType}
                    onChange={e => {
                      const newType = e.target.value as 'client' | 'personal';
                      setUploadType(newType);
                      // Limpar campos quando mudar para personal use
                      if (newType === 'personal') {
                        setClientName('');
                        setPaymentMethod('card');
                        setReceiptFile(null);
                        setReceiptFileUrl(null);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                    aria-label="Upload type"
                  >
                    <option value="client">For Client</option>
                    <option value="personal">Personal Use</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadType === 'client'
                      ? 'This document is for a client who paid for translation services.'
                      : 'This document is for your personal use and will not be counted in statistics.'}
                  </p>
                </section>

                {/* Client Name - Only show for client uploads */}
                {uploadType === 'client' && (
                  <section>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="client-name">
                      4. Client Name
                    </label>
                    <input
                      id="client-name"
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                      placeholder="Enter client's full name"
                      aria-label="Client name"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the full name of the client for whom this document is being translated.
                    </p>
                  </section>
                )}

                {/* Translation Details */}
                <section className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="translation-type">
                      {uploadType === 'client' ? '5' : '4'}. Translation Type
                    </label>
                    <select
                      id="translation-type"
                      value={tipoTrad}
                      onChange={e => setTipoTrad(e.target.value as 'Certified' | 'Notarized')}
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
                      {uploadType === 'client' ? '6' : '5'}. Is it a bank statement?
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

                  {/* Campos de moeda - aparecem apenas se for bank statement */}
                  {isExtrato && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="source-currency">
                          5.1. Source Currency (Original Document)
                        </label>
                        <select
                          id="source-currency"
                          value={sourceCurrency}
                          onChange={e => setSourceCurrency(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                          aria-label="Source currency"
                        >
                          {currencies.map(currency => (
                            <option key={currency} value={currency}>{currency}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="target-currency">
                          5.2. Target Currency (Translation To)
                        </label>
                        <select
                          id="target-currency"
                          value={targetCurrency}
                          onChange={e => setTargetCurrency(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                          aria-label="Target currency"
                        >
                          {currencies.map(currency => (
                            <option key={currency} value={currency}>{currency}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="original-language">
                      6. Original Document Language
                    </label>
                    <select
                      id="original-language"
                      value={idiomaRaiz}
                      onChange={e => setIdiomaRaiz(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                      aria-label="Original document language"
                    >
                      {(t('upload.serviceInfo.supportedLanguages.languages', { returnObjects: true }) as unknown as string[]).map((lang: string, index: number) => (
                        <option key={index} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="target-language">
                      7. Target Language (Translation To)
                    </label>
                    <select
                      id="target-language"
                      value={idiomaDestino}
                      onChange={e => setIdiomaDestino(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                      aria-label="Target language for translation"
                    >
                      {targetLanguages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </section>

                {/* Payment Method - Only show for client uploads */}
                {uploadType === 'client' && (
                  <section>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="payment-method">
                      7. Payment Method
                    </label>
                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tfe-blue-500 focus:border-tfe-blue-500 text-base"
                      aria-label="Payment method"
                    >
                      {paymentMethods.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the payment method used by the client for this translation service.
                    </p>
                  </section>
                )}

                {/* Receipt Upload - Only show for client uploads */}
                {uploadType === 'client' && (
                  <section>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="receipt-upload">
                      8. Payment Receipt (Optional)
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${receiptFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'}`}
                      onClick={() => receiptInputRef.current?.click()}
                      style={{ minHeight: 120 }}
                      aria-label="Upload receipt area"
                    >
                      <input
                        type="file"
                        ref={receiptInputRef}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleReceiptFileChange(file);
                        }}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        id="receipt-upload"
                        aria-label="Upload receipt file input"
                        title="Select a receipt file to upload"
                      />
                      {receiptFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <Receipt className="w-8 h-8 text-green-500 mb-1" />
                          <span className="text-gray-800 font-medium text-sm">{receiptFile.name}</span>
                          <span className="text-xs text-gray-500">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          <button
                            className="mt-1 text-xs text-tfe-red-500 hover:underline"
                            onClick={e => {
                              e.stopPropagation();
                              setReceiptFile(null);
                              setReceiptFileUrl(null);
                            }}
                          >Remove receipt</button>
                          {receiptFile && receiptFileUrl && receiptFile.type.startsWith('image/') && (
                            <img src={receiptFileUrl} alt="Receipt Preview" className="max-h-24 rounded shadow mt-2" />
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Receipt className="w-8 h-8 text-gray-400 mb-1" />
                          <p className="text-sm text-gray-600 font-medium">
                            Click to upload receipt or drag and drop
                          </p>
                          <p className="text-xs text-gray-400">
                            PDF, JPG, PNG up to 5MB
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a copy of the payment receipt for record keeping purposes. This is optional.
                    </p>
                  </section>
                )}

                {/* Error/Success Messages */}
                {error && (
                  <div className="relative bg-[#C71B2D]/5 border border-[#C71B2D]/20 rounded-[16px] p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-[#C71B2D] flex-shrink-0" />
                    <span className="text-[#C71B2D] font-bold">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="relative bg-green-50 border border-green-200 rounded-[16px] p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
                    <span className="text-green-700 font-bold">{success}</span>
                  </div>
                )}

                {/* Upload Button */}
                <div className="pt-4 relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isUploading) {
                        handleUpload();
                      }
                    }}
                    disabled={!selectedFile || (uploadType === 'client' && !clientName.trim()) || isUploading}
                    className="relative w-full bg-gradient-to-r from-[#163353] to-[#C71B2D] text-white py-4 rounded-[18px] font-black shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <span className="relative z-10">{isUploading ? 'Uploading...' : 'Upload Document (Free for Authenticators)'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Information Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Summary Card */}
              <div className="relative bg-white/80 backdrop-blur-xl rounded-[30px] p-6 border border-gray-200 shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#163353]/5 rounded-full blur-[60px] pointer-events-none" />
                <h3 className="relative text-2xl font-black text-[#163353] mb-4 flex items-center gap-2 uppercase tracking-tight">
                  <Shield className="w-6 h-6" />
                  Authenticator Access
                </h3>
                <div className="relative flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Regular Cost:</span>
                  <span className="text-2xl font-black text-gray-400 line-through">${valor}.00</span>
                </div>
                <div className="relative flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                  <span className="text-base text-[#163353] font-black uppercase tracking-wider">Your Cost:</span>
                  <span className="text-3xl font-black text-green-600">FREE</span>
                </div>
                <p className="relative text-xs text-gray-600 font-medium mb-3 bg-gray-50/50 p-3 rounded-[12px]">
                  {translationTypes.find(t => t.value === tipoTrad)?.label} ${tipoTrad === 'Notarized' ? '20' : '15'} per page × {pages} pages = ${valor.toFixed(2)}
                </p>
                <div className="relative mb-4 p-3 bg-[#163353]/10 backdrop-blur-sm rounded-[16px] border border-[#163353]/20">
                  <p className="text-xs font-black text-[#163353] flex items-center gap-2 uppercase tracking-wider">
                    <Globe className="w-4 h-4" />
                    {idiomaRaiz} → {idiomaDestino}
                  </p>
                </div>
                <ul className="relative text-xs text-gray-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium">USCIS accepted translations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium">Official certification & authentication</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium">Digital verification system</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium">24/7 customer support</span>
                  </li>
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
    </div>
  );
}