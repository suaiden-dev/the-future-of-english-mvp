import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Document Proxy - The Future of English
 * 
 * Edge Function para servir documentos privados de forma segura.
 * Regra TFOE: Qualquer usuário autenticado (user, admin, authenticator) pode acessar documentos.
 * 
 * Uso: GET /functions/v1/document-proxy?bucket=documents&path=user_id/file.pdf
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
        const bucket = url.searchParams.get("bucket");
        const path = url.searchParams.get("path");

        // Validação de parâmetros
        if (!bucket || !path) {
            return new Response(
                JSON.stringify({ error: "Missing bucket or path parameter" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const authHeader = req.headers.get("Authorization");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        // Cliente admin para download (bypass RLS)
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        let hasAccess = false;
        let userInfo = { id: "anonymous", role: "none" };

        // --- VALIDAÇÃO VIA AUTENTICAÇÃO (Sessão Logada) ---
        if (authHeader) {
            const userClient = createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: authHeader } },
            });

            const { data: { user }, error: authError } = await userClient.auth.getUser();

            if (!authError && user) {
                userInfo.id = user.id;

                // Buscar role do usuário na tabela profiles
                const { data: profile } = await adminClient
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                const userRole = profile?.role || user.user_metadata?.role || 'user';
                userInfo.role = userRole;

                // REGRA TFOE: Qualquer usuário autenticado com role válida pode acessar
                const validRoles = ['user', 'admin', 'authenticator', 'finance'];
                if (validRoles.includes(userRole)) {
                    hasAccess = true;
                    console.log(`[PROXY] Access granted to ${userInfo.role} (${userInfo.id}) for ${bucket}/${path}`);
                }
            }
        }

        // Acesso negado
        if (!hasAccess) {
            console.warn(`[PROXY] Blocked access to ${bucket}/${path}. User: ${userInfo.id}, Role: ${userInfo.role}`);
            return new Response(
                JSON.stringify({ error: "Forbidden - Authentication required" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- DOWNLOAD E STREAM ---
        const { data, error: downloadError } = await adminClient.storage
            .from(bucket)
            .download(path);

        if (downloadError) {
            console.error(`[PROXY] Download error for ${bucket}/${path}:`, downloadError);
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

        return new Response(data, {
            status: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=3600",
                "Content-Disposition": `inline; filename="${path.split('/').pop()}"`,
            },
        });

    } catch (error) {
        console.error("[PROXY] Unexpected error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
