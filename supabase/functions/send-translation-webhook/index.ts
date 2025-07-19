import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Edge Function: send-translation-webhook called`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    console.log(`Method ${req.method} not allowed`);
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Supabase URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
    console.log("Service Role Key:", supabaseServiceKey ? "✓ Set" : "✗ Missing");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestBody = await req.text();
    console.log("Raw request body:", requestBody);
    
    const parsedBody = JSON.parse(requestBody);
    console.log("Parsed request body:", parsedBody);

    // Recebe o evento do Supabase Storage ou do frontend
    const { filename, url, mimetype, size, record, user_id, paginas, tipo_trad, valor, idioma_raiz, is_bank_statement } = parsedBody;
    let payload;

    if (record) {
      // Called from Storage trigger
      console.log("Processing storage trigger payload");
      const bucket = record.bucket_id || record.bucket || record.bucketId;
      const path = record.name || record.path || record.file_name;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
      payload = {
        filename: path,
        url: publicUrl,
        mimetype: record.mimetype || record.metadata?.mimetype || "application/octet-stream",
        size: record.size || record.metadata?.size || null,
        user_id: record.user_id || record.metadata?.user_id || null,
        paginas: record.paginas || paginas || null,
        tipo_trad: record.tipo_trad || tipo_trad || null,
        valor: record.valor || valor || null,
        idioma_raiz: record.idioma_raiz || idioma_raiz || null,
        is_bank_statement: record.is_bank_statement || is_bank_statement || false
      };
    } else {
      // Called from frontend
      console.log("Processing frontend payload");
      payload = { 
        filename, 
        url, 
        mimetype, 
        size, 
        user_id: user_id || null, 
        paginas, tipo_trad, valor, idioma_raiz, 
        is_bank_statement: is_bank_statement || false
      };
    }

    console.log("Final payload for n8n webhook:", JSON.stringify(payload, null, 2));

    // Send POST to n8n webhook
    const webhookUrl = "https://nwh.thefutureofenglish.com/webhook/tfoetranslations";
    console.log("Sending webhook to:", webhookUrl);

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Supabase-Edge-Function/1.0"
      },
      body: JSON.stringify(payload),
    });
    const responseText = await webhookResponse.text();
    console.log("n8n webhook response status:", webhookResponse.status);
    console.log("n8n webhook response body:", responseText);

    // If webhook call was successful and we have user_id, update document status
    if (webhookResponse.ok && user_id && filename) {
      try {
        console.log("Updating document status to processing...");
        const { data: updateData, error: updateError } = await supabase
          .from('documents')
          .update({ status: 'processing' })
          .eq('user_id', user_id)
          .eq('filename', filename)
          .select();
        
        if (updateError) {
          console.error("Error updating document status:", updateError);
        } else {
          console.log("Document status updated successfully:", updateData);
        }
      } catch (updateError) {
        console.error("Exception updating document status:", updateError);
      }
    }

    // Also insert into documents_to_be_verified table if needed
    if (webhookResponse.ok && user_id && url) {
      try {
        console.log("Inserting into documents_to_be_verified...");
        
        // First, find the document ID
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('id, total_cost, tipo_trad, idioma_raiz, is_bank_statement, pages')
          .eq('user_id', user_id)
          .eq('filename', filename)
          .single();

        if (docData && !docError) {
          const { data: verifyData, error: verifyError } = await supabase
            .from('documents_to_be_verified')
            .insert({
              user_id: user_id,
              filename: filename,
              pages: docData.pages || paginas || 1,
              status: 'pending',
              total_cost: docData.total_cost || parseFloat(valor) || 0,
              is_bank_statement: docData.is_bank_statement || is_bank_statement || false,
              source_language: docData.idioma_raiz?.toLowerCase() || 'portuguese',
              target_language: 'english',
              translation_status: 'pending',
              file_id: docData.id,
              verification_code: `TFEB${Math.random().toString(36).substr(2, 5).toUpperCase()}`
            })
            .select();

          if (verifyError) {
            console.error("Error inserting into documents_to_be_verified:", verifyError);
          } else {
            console.log("Inserted into documents_to_be_verified successfully:", verifyData);
          }
        }
      } catch (verifyError) {
        console.error("Exception inserting into documents_to_be_verified:", verifyError);
      }
    }

    const responseData = {
      success: webhookResponse.ok,
      status: webhookResponse.status,
      message: responseText,
      payload: payload,
      timestamp: new Date().toISOString()
    };

    console.log("Final response:", JSON.stringify(responseData, null, 2));

    return new Response(
      JSON.stringify(responseData),
      {
        status: webhookResponse.ok ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("Error in send-translation-webhook:", error);
    console.error("Error stack:", error.stack);
    
    const errorResponse = {
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
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