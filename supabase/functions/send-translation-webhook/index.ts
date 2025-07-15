import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Edge Function: send-translation-webhook called");

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const { filename, url, mimetype, size, record, user_id } = await req.json();
    let payload;

    if (record) {
      // Called from Storage trigger
      const bucket = record.bucket_id || record.bucket || record.bucketId;
      const path = record.name || record.path || record.file_name;
      const publicUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${bucket}/${path}`;
      
      payload = {
        filename: path,
        url: publicUrl,
        mimetype: record.mimetype || record.metadata?.mimetype || "application/octet-stream",
        size: record.size || record.metadata?.size || null,
        user_id: record.user_id || record.metadata?.user_id || null,
      };
    } else {
      // Called from frontend
      payload = { 
        filename, 
        url, 
        mimetype, 
        size, 
        user_id: user_id || null 
      };
    }

    console.log("Payload for n8n webhook:", payload);

    // Send POST to n8n webhook
    const webhookUrl = "https://nwh.thefutureofenglish.com/webhook/tfoetranslations";
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Supabase-Edge-Function"
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("n8n webhook response:", response.status, responseText);

    // If webhook call was successful, optionally update document status
    if (response.ok && user_id) {
      try {
        await supabase
          .from('documents')
          .update({ status: 'processing' })
          .eq('user_id', user_id)
          .eq('filename', filename);
        
        console.log("Document status updated to processing");
      } catch (updateError) {
        console.error("Error updating document status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: response.ok, 
        status: response.status,
        message: responseText 
      }),
      {
        status: response.ok ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("Error in send-translation-webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});