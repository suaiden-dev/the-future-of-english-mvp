import { supabase } from '../lib/supabase';
import { generateUniqueFileName } from './fileUtils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_RETRY_ATTEMPTS = 3;

export interface RetryUploadResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
  documentId?: string;
}

/**
 * Valida o arquivo antes do upload
 */
export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // Validar tipo
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Only PDF files are allowed' };
  }

  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size: 10MB' };
  }

  // Validar se não está vazio
  if (file.size === 0) {
    return { valid: false, error: 'Empty file is not allowed' };
  }

  return { valid: true };
}

/**
 * Verifica se o pagamento está confirmado para o documento
 * @param documentId - ID do documento
 * @param paymentStatus - Status do pagamento (opcional, se já conhecido)
 * @param paymentId - ID do pagamento (opcional, para validação adicional)
 */
export async function verifyPayment(
  documentId: string, 
  paymentStatus?: string,
  paymentId?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Se o status do pagamento já foi fornecido, usar diretamente
    if (paymentStatus) {
      const confirmedStatuses = ['completed', 'verified'];
      if (confirmedStatuses.includes(paymentStatus.toLowerCase())) {
        console.log(`Payment verified using provided status for document ${documentId}: ${paymentStatus}`);
        return { valid: true };
      } else {
        console.warn(`Payment status not confirmed for document ${documentId}: ${paymentStatus}`);
        return { valid: false, error: `Payment status is not confirmed: ${paymentStatus}` };
      }
    }

    // Se paymentId foi fornecido, buscar por ID (mais específico e pode contornar RLS)
    if (paymentId) {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('id, status, payment_method')
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('Error fetching payment by ID:', error);
        // Continuar para tentar buscar por document_id
      } else if (payment) {
        const confirmedStatuses = ['completed', 'verified'];
        if (confirmedStatuses.includes(payment.status?.toLowerCase() || '')) {
          console.log(`Payment verified by ID for document ${documentId}:`, payment);
          return { valid: true };
        } else {
          console.warn(`Payment found by ID but not confirmed: ${payment.status}`);
          return { valid: false, error: `Payment status is not confirmed: ${payment.status}` };
        }
      }
    }

    // Buscar pagamentos com status confirmado (completed, verified, etc)
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, status, payment_method')
      .eq('document_id', documentId)
      .in('status', ['completed', 'verified']); // Aceitar completed e verified (para Zelle)

    if (error) {
      console.error('Error fetching payment:', error);
      // Se for erro de RLS, tentar uma abordagem diferente
      if (error.code === '42501' || error.code === 'PGRST301') {
        return { valid: false, error: 'Permission denied. Cannot verify payment due to access restrictions.' };
      }
      return { valid: false, error: `Error verifying payment: ${error.message}` };
    }

    if (!payments || payments.length === 0) {
      console.warn(`No confirmed payment found for document ${documentId}`);
      return { valid: false, error: 'Payment not found or not confirmed' };
    }

    // Verificar se há pelo menos um pagamento confirmado
    const hasConfirmedPayment = payments.some(p => 
      p.status === 'completed' || p.status === 'verified'
    );

    if (!hasConfirmedPayment) {
      console.warn(`Payment found but not confirmed for document ${documentId}. Status: ${payments.map(p => p.status).join(', ')}`);
      return { valid: false, error: 'Payment not confirmed' };
    }

    console.log(`Payment verified for document ${documentId}:`, payments[0]);
    return { valid: true };
  } catch (err: any) {
    console.error('Exception verifying payment:', err);
    return { valid: false, error: `Error verifying payment: ${err.message}` };
  }
}

/**
 * Conta o número de páginas de um PDF usando pdfjs-dist
 */
export async function countPdfPages(file: File): Promise<number> {
  try {
    // Carregar PDF.js dinamicamente
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    const pdfjsWorkerSrc = (await import('pdfjs-dist/build/pdf.worker?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  } catch (error: any) {
    console.error('Error counting PDF pages:', error);
    throw new Error(`Error processing PDF: ${error.message}`);
  }
}

/**
 * Valida se o número de páginas do arquivo corresponde ao esperado
 */
export async function validatePageCount(
  file: File,
  expectedPages: number
): Promise<{ valid: boolean; actualPages?: number; error?: string }> {
  try {
    const actualPages = await countPdfPages(file);
    
    if (actualPages !== expectedPages) {
      return {
        valid: false,
        actualPages,
        error: `Page count does not match. Expected: ${expectedPages}, Found: ${actualPages}`
      };
    }

    return { valid: true, actualPages };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Faz upload do arquivo com retry automático (exponential backoff)
 */
export async function uploadFileWithRetry(
  file: File,
  filePath: string,
  retries: number = MAX_RETRY_ATTEMPTS
): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (error) {
        // Apenas retry em erros de rede/timeout
        const isNetworkError = 
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError');

        if (!isNetworkError) {
          return { success: false, error: error.message };
        }

        // Se não é a última tentativa, aguardar antes de tentar novamente
        if (attempt < retries) {
          const delay = 1000 * attempt; // Exponential backoff: 1s, 2s, 3s
          console.log(`Attempt ${attempt} failed, waiting ${delay}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: any) {
      // Se não é a última tentativa, aguardar antes de tentar novamente
      if (attempt < retries) {
        const delay = 1000 * attempt;
        console.log(`Attempt ${attempt} failed with exception, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return { success: false, error: err.message || 'Unknown upload error' };
    }
  }

  return { success: false, error: 'Maximum number of attempts reached' };
}

/**
 * Atualiza o documento após upload bem-sucedido via Edge Function
 */
export async function updateDocumentAfterUpload(
  documentId: string,
  fileUrl: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Session not found. Please log in again.' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/update-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        documentId,
        fileUrl,
        userId,
        clearUploadFailed: true // Limpa upload_failed_at e incrementa upload_retry_count
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Error updating document: ${errorText}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Error updating document: ${error.message}` };
  }
}

/**
 * Função principal para reenviar documento
 * @param documentId - ID do documento
 * @param file - Arquivo PDF para upload
 * @param paymentStatus - Status do pagamento (opcional, se já conhecido)
 * @param paymentId - ID do pagamento (opcional, para validação adicional)
 */
export async function retryDocumentUpload(
  documentId: string,
  file: File,
  paymentStatus?: string,
  paymentId?: string
): Promise<RetryUploadResult> {
  try {
    // 1. Validar arquivo
    const fileValidation = await validateFile(file);
    if (!fileValidation.valid) {
      return { success: false, error: fileValidation.error };
    }

    // 2. Verificar pagamento (usar paymentStatus se fornecido para evitar problemas de RLS)
    const paymentValidation = await verifyPayment(documentId, paymentStatus, paymentId);
    if (!paymentValidation.valid) {
      return { success: false, error: paymentValidation.error };
    }

    // 3. Buscar informações do documento
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('user_id, filename, pages, file_url')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return { success: false, error: 'Document not found' };
    }

    // 4. Validar número de páginas
    const pageValidation = await validatePageCount(file, document.pages);
    if (!pageValidation.valid) {
      return { 
        success: false, 
        error: pageValidation.error || 'Page count does not match' 
      };
    }

    // 5. Gerar nome único para arquivo
    const filePath = generateUniqueFileName(
      document.filename || file.name,
      document.user_id
    );

    // 6. Verificar se arquivo já existe no Storage (evitar duplicatas)
    const { data: existingFiles } = await supabase.storage
      .from('documents')
      .list(filePath.split('/')[0], {
        search: filePath.split('/').pop()
      });

    let publicUrl: string;

    if (existingFiles && existingFiles.length > 0) {
      // Arquivo já existe, usar URL existente
      const { data: { publicUrl: existingUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      publicUrl = existingUrl;
    } else {
      // 7. Fazer upload com retry
      const uploadResult = await uploadFileWithRetry(file, filePath);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'Error uploading file' };
      }

      // 8. Obter URL pública do arquivo
      const { data: { publicUrl: newUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      publicUrl = newUrl;
    }

    // 9. Atualizar documento via Edge Function
    const updateResult = await updateDocumentAfterUpload(
      documentId,
      publicUrl,
      document.user_id
    );

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    // 10. Chamar webhook para processamento (opcional)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        // Buscar dados completos do documento para o webhook
        const { data: fullDocument } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (fullDocument) {
          const webhookPayload = {
            filename: fullDocument.filename,
            original_filename: fullDocument.original_filename || fullDocument.filename,
            original_document_id: documentId,
            url: publicUrl,
            mimetype: 'application/pdf',
            size: file.size,
            user_id: document.user_id,
            pages: fullDocument.pages,
            paginas: fullDocument.pages,
            document_type: fullDocument.tipo_trad || 'Certified',
            tipo_trad: fullDocument.tipo_trad || 'Certificado',
            total_cost: fullDocument.total_cost?.toString() || '0',
            valor: fullDocument.total_cost?.toString() || '0',
            source_language: fullDocument.idioma_raiz || 'Portuguese',
            target_language: fullDocument.idioma_destino || 'English',
            idioma_raiz: fullDocument.idioma_raiz || 'Portuguese',
            idioma_destino: fullDocument.idioma_destino || 'English',
            is_bank_statement: fullDocument.is_bank_statement || false
          };

          await fetch(`${supabaseUrl}/functions/v1/send-translation-webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(webhookPayload)
          });
        }
      }
    } catch (webhookError) {
      // Não falhar se webhook falhar, apenas log
      console.warn('Error sending webhook (non-critical):', webhookError);
    }

    // 11. Log de sucesso (opcional)
    try {
      const { Logger } = await import('../lib/loggingHelpers');
      const { ActionTypes } = await import('../types/actionTypes');
      await Logger.logDocument(
        ActionTypes.DOCUMENT.RETRY_UPLOAD,
        documentId,
        'Document re-uploaded successfully',
        {
          document_id: documentId,
          user_id: document.user_id,
          pages: document.pages,
          timestamp: new Date().toISOString()
        }
      );
    } catch (logError) {
      // Non-blocking
      console.warn('Error logging (non-critical):', logError);
    }

    return {
      success: true,
      fileUrl: publicUrl,
      documentId
    };
  } catch (error: any) {
    console.error('Error re-uploading document:', error);
    return {
      success: false,
      error: error.message || 'Unknown error re-uploading document'
    };
  }
}

