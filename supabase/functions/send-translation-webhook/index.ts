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

    // Log adicional para identificar a fonte da chamada
    const referer = req.headers.get('referer') || 'unknown';
    const origin = req.headers.get('origin') || 'unknown';
    console.log("=== REQUEST SOURCE INFO ===");
    console.log("Referer:", referer);
    console.log("Origin:", origin);
    console.log("User-Agent:", req.headers.get('user-agent') || 'unknown');


    // Recebe o evento do Supabase Storage ou do frontend
    const { 
      filename, 
      original_filename,
      original_document_id,
      url, 
      mimetype, 
      size, 
      record, 
      user_id, 
      pages,
      paginas,
      document_type,
      tipo_trad, 
      total_cost,
      valor, 
      source_language,
      target_language,
      idioma_raiz,
      idioma_destino,
      is_bank_statement, 
      client_name,
      source_currency,
      target_currency
    } = parsedBody;
    
    // Debug logs para idiomas e moedas
    console.log("=== LANGUAGE & CURRENCY DEBUG ===");
    console.log("source_language:", source_language);
    console.log("target_language:", target_language);
    console.log("idioma_raiz:", idioma_raiz);
    console.log("idioma_destino:", idioma_destino);
    
    // Debug logs para campos originais
    console.log("=== ORIGINAL FIELDS DEBUG ===");
    console.log("original_filename:", original_filename);
    console.log("original_document_id:", original_document_id);
    console.log("source_currency:", source_currency);
    console.log("target_currency:", target_currency);
    console.log("is_bank_statement:", is_bank_statement);
    
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
        // Sempre usar campos padronizados
        pages: record.pages || pages || paginas || 1,
        document_type: document_type || record.tipo_trad || 'Certificado', // Priorizar document_type do frontend
        total_cost: record.total_cost || total_cost || record.valor || valor || '0',
        source_language: record.idioma_raiz || idioma_raiz || record.source_language || source_language || 'Portuguese',
        target_language: record.idioma_destino || idioma_destino || record.target_language || target_language || 'English',
        is_bank_statement: record.is_bank_statement || is_bank_statement || false,
        client_name: record.client_name || client_name || null,
        // Campos de moeda para bank statements
        source_currency: record.source_currency || source_currency || null,
        target_currency: record.target_currency || target_currency || null,
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
        filename: filename, 
        original_filename: original_filename || null, // Nome original para exibição
        original_document_id: original_document_id || null, // ID do documento original
        url: finalUrl, 
        mimetype, 
        size, 
        user_id: user_id || null, 
        // Sempre usar campos padronizados
        pages: pages || paginas || 1,
        document_type: document_type || tipo_trad || 'Certificado', // Priorizar document_type do frontend
        total_cost: total_cost || valor || '0',
        source_language: idioma_raiz || source_language || 'Portuguese',
        target_language: idioma_destino || target_language || 'English',
        is_bank_statement: is_bank_statement || false,
        client_name: client_name || null,
        // Campos de moeda para bank statements
        source_currency: source_currency || null,
        target_currency: target_currency || null,
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

    // 📋 FLUXO CORRETO: Apenas enviar para n8n
    // O retorno do webhook do n8n é que vai salvar na tabela documents_to_be_verified
    if (webhookResponse.ok) {
      console.log("✅ Webhook enviado para n8n com sucesso");
      console.log("📋 O retorno do n8n será responsável por salvar em documents_to_be_verified");
      console.log("🚫 Edge Function NÃO deve inserir diretamente em documents_to_be_verified");
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