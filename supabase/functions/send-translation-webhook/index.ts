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
    console.log("=== WEBHOOK CALL START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Raw request body:", requestBody);
    

    
    const parsedBody = JSON.parse(requestBody);
    console.log("Parsed request body:", parsedBody);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Recebe o evento do Supabase Storage ou do frontend
    const { filename, url, mimetype, size, record, user_id, paginas, tipo_trad, valor, idioma_raiz, is_bank_statement, client_name } = parsedBody;
    let payload;

    if (record) {
      // Called from Storage trigger
      console.log("Processing storage trigger payload");
      const bucket = record.bucket_id || record.bucket || record.bucketId;
      const path = record.name || record.path || record.file_name;
      
      // Corrigir a geração da URL pública
      let publicUrl;
      if (url && url.startsWith('http')) {
        // Se já temos uma URL válida, usar ela
        publicUrl = url;
      } else {
        // Gerar URL pública corretamente
        const { data: { publicUrl: generatedUrl } } = supabase.storage
          .from(bucket || 'documents')
          .getPublicUrl(path);
        publicUrl = generatedUrl;
      }
      
      console.log("Generated public URL:", publicUrl);
      
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
        is_bank_statement: record.is_bank_statement || is_bank_statement || false,
        client_name: record.client_name || client_name || null,
        // Adicionar informações sobre o tipo de arquivo
        isPdf: (record.mimetype || record.metadata?.mimetype || "application/octet-stream") === 'application/pdf',
        fileExtension: path.split('.').pop()?.toLowerCase(),
        // Informar ao n8n que deve usar a tabela 'profiles' em vez de 'users'
        tableName: 'profiles',
        schema: 'public'
      };
    } else {
      // Called from frontend
      console.log("Processing frontend payload");
      console.log("URL received:", url);
      console.log("User ID:", user_id);
      console.log("Filename:", filename);
      
      // Verificar se a URL já é válida
      let finalUrl = url;
      if (url && !url.startsWith('http')) {
        // Se a URL não é completa, tentar gerar uma URL pública
        try {
          // Extrair o caminho do arquivo da URL
          const urlParts = url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const userFolder = urlParts[urlParts.length - 2];
          const filePath = `${userFolder}/${fileName}`;
          
          console.log("Extracted file path:", filePath);
          
          const { data: { publicUrl: generatedUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);
          
          finalUrl = generatedUrl;
          console.log("Generated public URL from path:", finalUrl);
        } catch (urlError) {
          console.error("Error generating public URL:", urlError);
          // Usar a URL original se não conseguir gerar
          finalUrl = url;
        }
      }
      
      payload = { 
        filename, 
        url: finalUrl, 
        mimetype, 
        size, 
        user_id: user_id || null, 
        paginas, tipo_trad, valor, idioma_raiz, 
        is_bank_statement: is_bank_statement || false,
        client_name: client_name || null,
        // Adicionar informações sobre o tipo de arquivo
        isPdf: mimetype === 'application/pdf',
        fileExtension: filename.split('.').pop()?.toLowerCase(),
        // Informar ao n8n que deve usar a tabela 'profiles' em vez de 'users'
        tableName: 'profiles',
        schema: 'public'
      };
      
      console.log("Final payload for frontend:", JSON.stringify(payload, null, 2));
    }

    console.log("Final payload for n8n webhook:", JSON.stringify(payload, null, 2));

    // Verificar se o arquivo é um PDF antes de enviar para o n8n
    const isPdf = payload.isPdf || payload.mimetype === 'application/pdf' || payload.filename.toLowerCase().endsWith('.pdf');
    console.log("Is PDF file:", isPdf);
    console.log("File mimetype:", payload.mimetype);
    console.log("File extension:", payload.fileExtension);
    console.log("Table name for n8n:", payload.tableName);

    // Send POST to n8n webhook
    const webhookUrl = "https://nwh.thefutureofenglish.com/webhook/tfoetranslations";
    console.log("Sending webhook to:", webhookUrl);
    console.log("Payload being sent to n8n:", JSON.stringify(payload, null, 2));

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
    console.log("n8n webhook response headers:", Object.fromEntries(webhookResponse.headers.entries()));
    console.log("n8n webhook response body:", responseText);

    // If webhook call was successful and we have user_id, update document status
    if (webhookResponse.ok && user_id && filename) {
      try {
        console.log("Updating document status to processing...");
        console.log("Looking for document with user_id:", user_id, "and filename:", filename);
        
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

    // Also update documents_to_be_verified table if needed (instead of creating duplicate)
    if (webhookResponse.ok && user_id && url) {
      try {
        console.log("=== CHECKING FOR DUPLICATES ===");
        console.log("user_id:", user_id);
        console.log("filename:", filename);
        console.log("Checking for existing document in documents_to_be_verified...");
        
        // First, find the document ID
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('id, total_cost, tipo_trad, idioma_raiz, is_bank_statement, pages, client_name')
          .eq('user_id', user_id)
          .eq('filename', filename)
          .single();

        if (docData && !docError) {
          console.log("Found document data:", docData);
          console.log("N8N validated is_bank_statement:", is_bank_statement);
          console.log("Client marked is_bank_statement:", docData.is_bank_statement);
          
          // Check if document already exists in documents_to_be_verified
          console.log("=== CHECKING FOR EXISTING DOCUMENTS ===");
          
          // Primeiro, verificar se já existe um documento com o mesmo file_id
          const { data: existingDocsByFileId, error: checkErrorByFileId } = await supabase
            .from('documents_to_be_verified')
            .select('id, translated_file_url, created_at, status, file_id')
            .eq('file_id', docData.id)
            .order('created_at', { ascending: false });

          console.log("Check by file_id error:", checkErrorByFileId);
          console.log("Existing docs by file_id found:", existingDocsByFileId?.length || 0);

          if (existingDocsByFileId && existingDocsByFileId.length > 0 && !checkErrorByFileId) {
            console.log("Document already exists in documents_to_be_verified (by file_id), skipping duplicate creation");
            console.log("Found existing documents by file_id:", existingDocsByFileId.length);
            existingDocsByFileId.forEach((doc, index) => {
              console.log(`Document ${index + 1}:`, doc.id, "translated_file_url:", doc.translated_file_url, "status:", doc.status, "file_id:", doc.file_id);
            });
            console.log("=== SKIPPING DUPLICATE CREATION (by file_id) ===");
          } else {
            // Verificar também por user_id e filename como fallback
            const { data: existingDocs, error: checkError } = await supabase
              .from('documents_to_be_verified')
              .select('id, translated_file_url, created_at, status')
              .eq('user_id', user_id)
              .eq('filename', filename)
              .order('created_at', { ascending: false });

            console.log("Check error:", checkError);
            console.log("Existing docs found:", existingDocs?.length || 0);

            if (existingDocs && existingDocs.length > 0 && !checkError) {
              console.log("Document already exists in documents_to_be_verified, skipping duplicate creation");
              console.log("Found existing documents:", existingDocs.length);
              existingDocs.forEach((doc, index) => {
                console.log(`Document ${index + 1}:`, doc.id, "translated_file_url:", doc.translated_file_url, "status:", doc.status);
              });
              console.log("=== SKIPPING DUPLICATE CREATION ===");
                        } else {
              console.log("Document not found in documents_to_be_verified, creating new entry...");
              
              const insertData = {
                user_id: user_id,
                filename: filename,
                pages: docData.pages || paginas || 1,
                status: 'pending',
                total_cost: docData.total_cost || parseFloat(valor) || 0,
                // Usar o valor validado pelo N8N se disponível, senão usar o valor do cliente
                is_bank_statement: (() => {
                  const finalValue = is_bank_statement !== undefined ? is_bank_statement : (docData.is_bank_statement || false);
                  console.log("Final is_bank_statement value being used:", finalValue);
                  return finalValue;
                })(),
                source_language: docData.idioma_raiz?.toLowerCase() || 'portuguese',
                target_language: 'english',
                translation_status: 'pending',
                file_id: docData.id,
                verification_code: `TFEB${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                client_name: docData.client_name || client_name || null
              };
              
              console.log("Attempting to insert data:", JSON.stringify(insertData, null, 2));
              
              const { data: verifyData, error: verifyError } = await supabase
                .from('documents_to_be_verified')
                .insert(insertData)
                .select();

              if (verifyError) {
                console.error("Error inserting into documents_to_be_verified:", verifyError);
                console.error("Error details:", JSON.stringify(verifyError, null, 2));
              } else {
                console.log("Inserted into documents_to_be_verified successfully:", verifyData);
                console.log("Notifications will be created automatically by database trigger");
              }
            }
          }
        } else {
          console.error("Error finding document:", docError);
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