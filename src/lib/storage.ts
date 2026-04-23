/**
 * Storage Utilities - The Future of English
 *
 * Funções para acesso seguro a arquivos do Supabase Storage.
 * Implementa hierarquia de fallback: Blob → Signed URL → Proxy
 */

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Obtém URL segura para um arquivo do Storage.
 * Funciona tanto com buckets públicos quanto privados.
 *
 * Hierarquia de tentativas:
 * 1. Download direto (Blob URL) - mais rápido, funciona se usuário tem permissão RLS
 * 2. Signed URL - funciona se usuário está autenticado
 * 3. Document Proxy - último recurso, funciona para qualquer usuário autenticado
 *
 * @param bucket Nome do bucket (ex: 'documents')
 * @param path Caminho do arquivo (ex: 'user_id/file.pdf')
 * @returns URL para acessar o arquivo
 */
export async function getSecureUrl(bucket: string, path: string): Promise<string> {
    if (!bucket || !path) {
        console.warn('[getSecureUrl] Missing bucket or path');
        return '';
    }

    // Limpar path (remover espaços e normalizar)
    const cleanPath = path.trim().replace(/\\/g, '/');

    try {
        // Tentativa 1: Download direto (Blob URL)
        const { data: blobData, error: blobError } = await supabase.storage
            .from(bucket)
            .download(cleanPath);

        if (!blobError && blobData) {
            const blobUrl = URL.createObjectURL(blobData);
            console.log(`[getSecureUrl] Success via Blob: ${bucket}/${cleanPath}`);
            return blobUrl;
        }

        // Tentativa 2: Signed URL (válida por 1 hora)
        const { data: signedData, error: signedError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(cleanPath, 3600);

        if (!signedError && signedData?.signedUrl) {
            console.log(`[getSecureUrl] Success via SignedURL: ${bucket}/${cleanPath}`);
            return signedData.signedUrl;
        }

        // Tentativa 3: Document Proxy (fallback final)
        const proxyUrl = getDocumentProxyUrl(bucket, cleanPath);
        console.log(`[getSecureUrl] Fallback to Proxy: ${bucket}/${cleanPath}`);
        return proxyUrl;

    } catch (error) {
        console.error(`[getSecureUrl] Error for ${bucket}/${cleanPath}:`, error);
        // Em caso de erro, retornar URL do proxy como fallback
        return getDocumentProxyUrl(bucket, cleanPath);
    }
}

/**
 * Gera URL para o Document Proxy (Edge Function).
 * Usado quando o acesso direto não é possível.
 */
export function getDocumentProxyUrl(bucket: string, path: string): string {
    const cleanPath = path.trim().replace(/\\/g, '/');
    return `${SUPABASE_URL}/functions/v1/document-proxy?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(cleanPath)}`;
}

/**
 * Extrai bucket e path de uma URL pública do Supabase.
 * Útil para converter URLs públicas em URLs de proxy.
 *
 * @param publicUrl URL pública do Supabase Storage
 * @returns { bucket, path } ou null se não for URL do Supabase
 */
export function parseStorageUrl(urlStr: string): { bucket: string; path: string } | null {
    if (!urlStr) return null;
    
    try {
        // Se já for uma URL de proxy, não precisa parsear de novo para converter
        if (urlStr.includes('/functions/v1/document-proxy')) return null;

        const url = new URL(urlStr);
        
        // Padrão 1: URL Pública (/storage/v1/object/public/bucket/path)
        let pathParts = url.pathname.split('/storage/v1/object/public/');
        
        // Padrão 2: URL Autenticada ou Assinada (/storage/v1/object/authenticated/bucket/path ou /sign/)
        if (pathParts.length < 2) {
            pathParts = url.pathname.split('/storage/v1/object/authenticated/');
        }
        if (pathParts.length < 2) {
            pathParts = url.pathname.split('/storage/v1/object/sign/');
        }

        if (pathParts.length === 2) {
            const parts = pathParts[1].split('/');
            const bucketName = parts[0];
            const filePath = parts.slice(1).join('/');
            
            if (bucketName && filePath) {
                return {
                    bucket: bucketName,
                    path: filePath,
                };
            }
        }

        return null;
    } catch {
        // Se não for uma URL válida, pode ser apenas o path direto (ex: "bucket/path")
        if (urlStr.includes('/')) {
            const parts = urlStr.split('/');
            if (parts.length >= 2) {
                return {
                    bucket: parts[0],
                    path: parts.slice(1).join('/')
                };
            }
        }
        return null;
    }
}


/**
 * Converte URL pública para URL segura via proxy.
 * Útil para migração de código que ainda usa URLs públicas.
 */
export async function convertPublicToSecure(publicUrl: string): Promise<string> {
    const parsed = parseStorageUrl(publicUrl);
    if (!parsed) {
        console.warn('[convertPublicToSecure] Could not parse URL:', publicUrl);
        return publicUrl;
    }

    return getSecureUrl(parsed.bucket, parsed.path);
}

/**
 * Limpa Blob URLs criadas para liberar memória.
 * Deve ser chamado quando o componente é desmontado.
 */
export function revokeBlobUrl(url: string): void {
    if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}
