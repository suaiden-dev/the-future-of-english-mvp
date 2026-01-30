import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * N8N Storage Access - The Future of English
 * 
 * Edge Function para permitir que o N8N acesse arquivos de buckets privados.
 * Autenticação via token secreto (N8N_STORAGE_SECRET).
 * 
 * Uso: GET /functions/v1/n8n-storage-access?bucket=documents&path=user_id/file.pdf&token=SECRET
 * Ou:  GET /functions/v1/n8n-storage-access?url=FULL_PUBLIC_URL&token=SECRET
 */

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        let bucket = url.searchParams.get("bucket");
        let path = url.searchParams.get("path");
        const token = url.searchParams.get("token");
        const fullUrl = url.searchParams.get("url");

        // Se recebeu URL completa, extrair bucket e path
        if (fullUrl && !bucket && !path) {
            const parsedUrl = new URL(fullUrl);
            const pathParts = parsedUrl.pathname.split('/storage/v1/object/public/');
            if (pathParts.length === 2) {
                const [bucketName, ...filePath] = pathParts[1].split('/');
                bucket = bucketName;
                path = filePath.join('/');
            }
        }

        // Validação de parâmetros
        if (!bucket || !path) {
            return new Response(
                JSON.stringify({
                    error: "Missing parameters",
                    hint: "Use ?bucket=X&path=Y&token=Z or ?url=FULL_URL&token=Z"
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!token) {
            return new Response(
                JSON.stringify({ error: "Missing token parameter" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validar token contra secret configurada
        const expectedToken = Deno.env.get("N8N_STORAGE_SECRET");
        if (!expectedToken) {
            console.error("[N8N-ACCESS] N8N_STORAGE_SECRET not configured!");
            return new Response(
                JSON.stringify({ error: "Server misconfigured - contact admin" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (token !== expectedToken) {
            console.warn(`[N8N-ACCESS] Invalid token attempt for ${bucket}/${path}`);
            return new Response(
                JSON.stringify({ error: "Invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Token válido - fazer download com service role
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        console.log(`[N8N-ACCESS] Downloading ${bucket}/${path}`);

        const { data, error: downloadError } = await adminClient.storage
            .from(bucket)
            .download(path);

        if (downloadError) {
            console.error(`[N8N-ACCESS] Download error for ${bucket}/${path}:`, downloadError);
            return new Response(
                JSON.stringify({ error: "File not found", details: downloadError.message }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Determinar Content-Type baseado na extensão
        const extension = path.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        const contentType = mimeTypes[extension || ''] || data.type || "application/octet-stream";
        const fileSize = data.size;

        console.log(`[N8N-ACCESS] Successfully served ${bucket}/${path} (${contentType}) - Size: ${fileSize} bytes`);

        return new Response(data, {
            status: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": contentType,
                "Content-Length": fileSize.toString(),
                "Cache-Control": "private, max-age=300",
                "Content-Disposition": `inline; filename="${path.split('/').pop()}"`,
            },
        });

    } catch (error) {
        console.error("[N8N-ACCESS] Unexpected error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
