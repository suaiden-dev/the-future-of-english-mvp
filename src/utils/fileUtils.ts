/**
 * Sanitiza o nome do arquivo removendo caracteres especiais e espaços
 * que podem causar problemas no upload para o Supabase Storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove extensão do arquivo
  const lastDotIndex = fileName.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  
  // Sanitiza o nome do arquivo
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Substitui caracteres especiais por underscore
    .replace(/_+/g, '_') // Remove underscores múltiplos
    .replace(/^_|_$/g, '') // Remove underscores no início e fim
    .toLowerCase(); // Converte para minúsculas
  
  // Se o nome ficou vazio, usa um nome padrão
  const finalName = sanitizedName || 'document';
  
  return finalName + extension;
}

/**
 * Gera um nome único para o arquivo baseado no timestamp e nome sanitizado
 * 
 * Novo formato: YYYYMMDD_HHMMSS_Usuario_NomeOriginal.pdf
 * Exemplo: 20250115_143022_joao_silva_diploma_universidade.pdf
 * 
 * Estrutura:
 * - YYYYMMDD: Data (15/01/2025)
 * - HHMMSS: Hora (14:30:22)
 * - Usuario: Nome do usuário sanitizado
 * - NomeOriginal: Nome original do arquivo sanitizado
 */
export function generateUniqueFileName(originalFileName: string, userId: string, userName?: string): string {
  const sanitizedName = sanitizeFileName(originalFileName);
  
  // Formatar data atual de forma legível
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
  
  // Usar nome do usuário se disponível, senão usar userId abreviado
  const userIdentifier = userName ? 
    userName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 
    userId.substring(0, 8);
  
  // Estrutura: YYYYMMDD_HHMMSS_Usuario_NomeOriginal.pdf
  return `${userId}/${dateStr}_${timeStr}_${userIdentifier}_${sanitizedName}`;
}

/**
 * Verifica se uma URL do S3 expirou e regenera se necessário
 */
export async function getValidFileUrl(url: string): Promise<string> {
  try {
    // Se não é uma URL do S3 ou Supabase, retorna como está
    if (!url.includes('s3.amazonaws.com') && !url.includes('supabase.co')) {
      return url;
    }

    // Para URLs do S3 externo, simplesmente retornar a URL original
    if (url.includes('s3.amazonaws.com')) {
      console.log('URL do S3 detectada, retornando URL original para tentativa de visualização...');
      return url;
    }

    // Para URLs do Supabase Storage, verificar e regenerar se necessário
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }

      // Se a URL expirou (403 Forbidden), tentar regenerar
      if (response.status === 403) {
        console.log('URL do Supabase Storage expirou, tentando regenerar...');
        
        // Extrair informações da URL para regenerar
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // Para URLs do Supabase Storage
        const bucket = 'documents';
        const filePath = pathParts.slice(2).join('/');
        
        console.log('Bucket:', bucket);
        console.log('FilePath:', filePath);
        
        // Regenerar URL do Supabase Storage usando as novas funções
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Configuração do Supabase não encontrada');
        }
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Tentar URL pública primeiro (não expira)
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        // Verificar se a nova URL funciona
        try {
          const newResponse = await fetch(publicUrl, { method: 'HEAD' });
          if (newResponse.ok) {
            console.log('✅ URL pública regenerada com sucesso');
            return publicUrl;
          }
        } catch (newUrlError) {
          console.log('URL pública falhou, tentando URL pré-assinado...');
        }
        
        // Se URL pública falhou, tentar URL pré-assinado de 30 dias
        const { data: signedUrlData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 2592000); // 30 dias
        
        if (signedUrlData?.signedUrl) {
          console.log('✅ URL pré-assinada regenerada com sucesso');
          return signedUrlData.signedUrl;
        }
        
        throw new Error('Não foi possível regenerar URL do arquivo');
      }
    } catch (fetchError) {
      console.log('Erro ao verificar URL do Supabase Storage:', fetchError);
      
      // Tentar regenerar mesmo assim
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const bucket = 'documents';
        const filePath = pathParts.slice(2).join('/');
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Configuração do Supabase não encontrada');
        }
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Tentar URL pública primeiro
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        return publicUrl;
      } catch (regenerateError) {
        console.error('Erro ao regenerar URL:', regenerateError);
        throw new Error('Não foi possível acessar o arquivo. Tente novamente mais tarde.');
      }
    }
    
    return url;
  } catch (error) {
    console.error('Erro ao verificar/regenerar URL:', error);
    throw error;
  }
} 