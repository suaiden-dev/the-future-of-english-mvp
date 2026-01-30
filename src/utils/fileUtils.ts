/**
 * Sanitiza o nome do arquivo removendo caracteres especiais e espaços
 * que podem causar problemas no upload para o Supabase Storage.
 * Segue o padrão Lush America: minúsculas, troca espaços/especiais por underscore.
 */
export function sanitizeFileName(fileName: string): string {
  // Remove extensão do arquivo para sanitizar apenas o corpo
  const lastDotIndex = fileName.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

  // Sanitiza o nome do arquivo
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9]/g, '_') // Substitui qualquer coisa que não seja letra ou número por underscore
    .replace(/_+/g, '_')           // Remove underscores múltiplos
    .replace(/^_|_$/g, '')         // Remove underscores no início e fim
    .toLowerCase();                // Converte para minúsculas

  return sanitizedName || 'document';
}

/**
 * Gera um nome único para o arquivo seguindo o padrão Lush America:
 * {nome_sanitizado}_{CÓDIGO}.{extensao}
 * 
 * @param originalFileName Nome original do arquivo (ex: "RG 2024.pdf")
 * @returns Nome único (ex: "rg_2024_A1B2C3.pdf")
 */
export function generateUniqueFileName(originalFileName: string): string {
  const sanitizedBase = sanitizeFileName(originalFileName);

  // Extrai a extensão original
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? originalFileName.substring(lastDotIndex).toLowerCase() : '';

  // Gera sufixo aleatório de 6 caracteres (Lush America Style)
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Montagem final: nome_sanitizado_CÓDIGO.extensao
  return `${sanitizedBase}_${randomCode}${extension}`;
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