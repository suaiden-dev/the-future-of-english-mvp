// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Adicionar import do client do Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js";

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  try {
    console.log("Edge Function chamada!");

    // Instanciar o client do Supabase com a service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Recebe o evento do Supabase Storage ou do frontend
    const { filename, url, mimetype, size, record, user_id } = await req.json();
    let payload;

    if (record) {
      // Chamada do trigger do Storage
      const bucket = record.bucket_id || record.bucket || record.bucketId;
      const path = record.name || record.path || record.file_name;
      const publicUrl = `https://nqhbwpizaizhyijkxkwj.supabase.co/storage/v1/object/public/${bucket}/${path}`;
      payload = {
        filename: path,
        url: publicUrl,
        mimetype: record.mimetype || record.metadata?.mimetype || "application/octet-stream",
        size: record.size || record.metadata?.size || null,
        user_id: record.user_id || record.metadata?.user_id || null,
      };
    } else {
      // Chamada do frontend
      payload = { filename, url, mimetype, size, user_id: user_id || null };
    }

    console.log("Payload para n8n:", payload);

    // Envia o POST para o n8n
    const webhookUrl = "https://nwh.thefutureofenglish.com/webhook/tfoetranslations";
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("Resposta do n8n:", response.status, await response.text());

    // Retorna o status do envio
    return new Response(
      JSON.stringify({ ok: response.ok, status: response.status }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      }
    );
  } catch (err: any) {
    console.error("Erro na Edge Function:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      }
    );
  }
}); 