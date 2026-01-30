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
 * Agora usa o sistema de proxy para buckets privados
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

    // Para URLs do Supabase Storage, usar o novo sistema de proxy
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Extrair bucket e path da URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/storage/v1/object/public/');

    if (pathParts.length === 2) {
      const [bucketName, ...filePath] = pathParts[1].split('/');
      const path = filePath.join('/');

      // Usar o novo sistema de getSecureUrl
      const { getSecureUrl } = await import('../lib/storage');
      const secureUrl = await getSecureUrl(bucketName, path);

      if (secureUrl) {
        console.log(`✅ URL segura obtida via getSecureUrl para ${bucketName}/${path}`);
        return secureUrl;
      }
    }

    // Fallback: tentar acessar a URL original
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }

      // Se a URL expirou (403 Forbidden), tentar regenerar via proxy
      if (response.status === 403) {
        console.log('URL expirou ou bucket privado, usando proxy...');

        // Extrair bucket e path para usar o proxy
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
        if (pathMatch) {
          const [, bucket, filePath] = pathMatch;
          const proxyUrl = `${supabaseUrl}/functions/v1/document-proxy?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`;
          console.log(`✅ Usando proxy URL: ${proxyUrl}`);
          return proxyUrl;
        }
      }
    } catch (fetchError) {
      console.log('Erro ao verificar URL, usando proxy como fallback:', fetchError);

      // Fallback final: usar proxy
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
      if (pathMatch) {
        const [, bucket, filePath] = pathMatch;
        const proxyUrl = `${supabaseUrl}/functions/v1/document-proxy?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`;
        return proxyUrl;
      }
    }

    return url;
  } catch (error) {
    console.error('Erro ao verificar/regenerar URL:', error);
    throw error;
  }
} 