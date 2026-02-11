/**
 * Storage Proxy Utilities - The Future of English
 *
 * Funções para converter URLs do Supabase Storage para URLs de proxy.
 * Usado principalmente para integração com N8N.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Token padrão para N8N - deve ser configurado como secret no Supabase
const N8N_STORAGE_TOKEN = import.meta.env.VITE_N8N_STORAGE_TOKEN || 'tfoe_n8n_2026_a7b3c9d1e5f2';

/**
 * Converte URL pública do Supabase para URL do proxy N8N.
 *
 * @param publicUrl URL pública do Supabase Storage
 * @returns URL formatada para o proxy n8n-storage-access
 *
 * @example
 * const proxyUrl = getN8nProxyUrl(supabase.storage.from('documents').getPublicUrl(path).data.publicUrl);
 * // Resultado: https://xxx.supabase.co/functions/v1/n8n-storage-access?bucket=documents&path=...&token=...
 */
export function getN8nProxyUrl(publicUrl: string): string {
    if (!publicUrl) {
        console.warn('[getN8nProxyUrl] Empty URL provided');
        return '';
    }

    try {
        const url = new URL(publicUrl);
        const pathParts = url.pathname.split('/storage/v1/object/public/');

        if (pathParts.length === 2) {
            const [bucketName, ...filePath] = pathParts[1].split('/');
            const path = filePath.join('/');

            const proxyUrl = `${SUPABASE_URL}/functions/v1/n8n-storage-access?bucket=${encodeURIComponent(bucketName)}&path=${encodeURIComponent(path)}&token=${encodeURIComponent(N8N_STORAGE_TOKEN)}`;

            console.log(`[getN8nProxyUrl] Converted: ${bucketName}/${path}`);
            return proxyUrl;
        }

        // Se não conseguir parsear, tentar passar URL completa
        return `${SUPABASE_URL}/functions/v1/n8n-storage-access?url=${encodeURIComponent(publicUrl)}&token=${encodeURIComponent(N8N_STORAGE_TOKEN)}`;

    } catch (error) {
        console.error('[getN8nProxyUrl] Error parsing URL:', error);
        return publicUrl;
    }
}

/**
 * Cria URL de proxy N8N a partir de bucket e path.
 *
 * @param bucket Nome do bucket
 * @param path Caminho do arquivo
 * @returns URL formatada para o proxy n8n-storage-access
 */
export function buildN8nProxyUrl(bucket: string, path: string): string {
    const cleanPath = path.trim().replace(/\\/g, '/');
    return `${SUPABASE_URL}/functions/v1/n8n-storage-access?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(cleanPath)}&token=${encodeURIComponent(N8N_STORAGE_TOKEN)}`;
}

/**
 * Prepara objeto de webhook para N8N com URLs convertidas.
 * Converte todas as propriedades que terminam com '_url' para URLs de proxy.
 *
 * @param webhookData Objeto com dados do webhook
 * @returns Objeto com URLs convertidas para proxy
 *
 * @example
 * const payload = prepareN8nWebhookPayload({
 *   user_id: '123',
 *   document_url: 'https://xxx.supabase.co/storage/v1/object/public/documents/...',
 *   receipt_url: 'https://xxx.supabase.co/storage/v1/object/public/payment-receipts/...',
 * });
 */
export function prepareN8nWebhookPayload<T extends Record<string, unknown>>(webhookData: T): T {
    const result = { ...webhookData };

    for (const key of Object.keys(result)) {
        const value = result[key];

        if (
            key.endsWith('_url') &&
            typeof value === 'string' &&
            value.includes('/storage/v1/object/public/')
        ) {
            (result as Record<string, unknown>)[key] = getN8nProxyUrl(value);
        }
    }

    return result;
}
