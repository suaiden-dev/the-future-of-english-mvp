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
 */
export function generateUniqueFileName(originalFileName: string, userId: string): string {
  const sanitizedName = sanitizeFileName(originalFileName);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${userId}/${timestamp}_${randomSuffix}_${sanitizedName}`;
}

/**
 * Verifica se uma URL do S3 expirou e regenera se necessário
 */
export async function getValidFileUrl(url: string): Promise<string> {
  try {
    // Se não é uma URL do S3, retorna como está
    if (!url.includes('s3.amazonaws.com') && !url.includes('pdf-temp-files.s3')) {
      return url;
    }

    // Para URLs do S3 externo, simplesmente retornar a URL original
    // O navegador pode conseguir abrir mesmo que a verificação HEAD falhe
    if (url.includes('pdf-temp-files.s3')) {
      console.log('URL do S3 detectada, retornando URL original para tentativa de visualização...');
      return url;
    }

    // Para outras URLs do S3, também retornar a URL original
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
        
        // Regenerar URL do Supabase Storage
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Configuração do Supabase não encontrada');
        }
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        return publicUrl;
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