import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Cache para evitar processamento duplicado (backup)
const processedRequests = new Map<string, number>();

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

    // Gerar um ID único para esta requisição baseado no conteúdo (SEM timestamp para detectar duplicatas reais)
    const requestId = `${parsedBody.user_id || 'unknown'}_${parsedBody.filename || 'unknown'}`;
    console.log("Request ID:", requestId);
    
    // 🔍 VERIFICAÇÃO ROBUSTA ANTI-DUPLICATA USANDO BANCO DE DADOS
    // Esta é a solução principal - verificar no banco se já existe documento recente
    if (parsedBody.user_id && parsedBody.filename) {
      console.log("🔍 VERIFICAÇÃO ANTI-DUPLICATA: Checando banco de dados...");
      
      const cutoffTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutos atrás
      
      const { data: recentDocs, error: recentError } = await supabase
        .from('documents_to_be_verified')
        .select('id, filename, created_at')
        .eq('user_id', parsedBody.user_id)
        .eq('filename', parsedBody.filename)
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentError) {
        console.log("⚠️ Erro ao verificar duplicatas:", recentError);
      } else if (recentDocs && recentDocs.length > 0) {
        console.log("🚨 DUPLICATA DETECTADA! Documento já processado recentemente:");
        console.log("Documento existente:", recentDocs[0]);
        console.log("⏱️ Criado em:", recentDocs[0].created_at);
        console.log("✅ IGNORANDO upload duplicado para prevenir múltiplos documentos");
        
        return new Response(
          JSON.stringify({
            success: true,
            status: 200,
            message: "Document already processed recently - duplicate prevented",
            existing_document: recentDocs[0],
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      } else {
        console.log("✅ Nenhuma duplicata encontrada, prosseguindo com o upload");
      }
    }
    
    // Cache em memória como backup (pode não funcionar com múltiplas instâncias)
    const now = Date.now();
    const lastProcessed = processedRequests.get(requestId);
    if (lastProcessed && (now - lastProcessed) < 120000) {
      console.log("🔄 Cache em memória detectou duplicata");
      return new Response(
        JSON.stringify({
          success: true,
          status: 200,
          message: "Request already processed (memory cache)",
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    
    // Marcar esta requisição como processada
    processedRequests.set(requestId, now);
    
    // Limpar cache antigo (mais de 5 minutos)
    for (const [key, timestamp] of processedRequests.entries()) {
      if (now - timestamp > 300000) { // 5 minutos
        processedRequests.delete(key);
      }
    }

    // Recebe o evento do Supabase Storage ou do frontend
    const { 
      filename, 
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
      is_bank_statement, 
      client_name 
    } = parsedBody;
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
        // 🎯 USAR CAMPOS EXATOS QUE O N8N ESPERA (como funcionava antes)
        paginas: record.pages || pages || paginas || 1,                                              // "paginas" ✅
        tipo_trad: record.document_type || document_type || record.tipo_trad || tipo_trad || 'Certificado',  // "tipo_trad" ✅  
        valor: record.total_cost || total_cost || record.valor || valor || 0,                                 // "valor" ✅
        idioma_raiz: record.source_language || source_language || record.idioma_raiz || idioma_raiz || 'Portuguese',  // "idioma_raiz" ✅
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
        filename: filename, 
        url: finalUrl, 
        mimetype, 
        size, 
        user_id: user_id || null, 
        // 🎯 USAR CAMPOS EXATOS QUE O N8N ESPERA (como funcionava antes)
        paginas: pages || paginas || 1,                              // "paginas" ✅
        tipo_trad: document_type || tipo_trad || 'Certificado',      // "tipo_trad" ✅
        valor: total_cost || valor || 0,                             // "valor" ✅
        idioma_raiz: source_language || idioma_raiz || 'Portuguese', // "idioma_raiz" ✅
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

    // 📋 FLUXO HÍBRIDO: Enviar para n8n E inserir na tabela documents_to_be_verified
    // Isso garante que o valor seja registrado mesmo para traduções gratuitas
    if (webhookResponse.ok && user_id && url) {
      try {
        console.log("=== INSERÇÃO EM DOCUMENTS_TO_BE_VERIFIED ===");
        console.log("user_id:", user_id);
        console.log("filename:", filename);
        
        // Buscar dados do documento para pegar informações completas
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('id, total_cost, document_type, source_language, is_bank_statement, pages, client_name')
          .eq('user_id', user_id)
          .eq('filename', filename)
          .single();

        if (docData && !docError) {
          console.log("Found document data:", docData);
          
          // Verificação final contra duplicatas ANTES da inserção
          const { data: finalCheck, error: finalCheckError } = await supabase
            .from('documents_to_be_verified')
            .select('id, filename, status, created_at')
            .eq('user_id', user_id)
            .eq('filename', filename)
            .limit(1);

          if (finalCheckError) {
            console.error("Error in final duplicate check:", finalCheckError);
          } else if (finalCheck && finalCheck.length > 0) {
            console.log("🚨 FINAL DUPLICATE CHECK: Document already exists in documents_to_be_verified");
            console.log("Existing document:", finalCheck[0]);
            console.log("⏭️ SKIPPING insertion to prevent duplicate");
          } else {
            console.log("✅ Final duplicate check passed - proceeding with insertion");
            
            // 🎯 USAR A LÓGICA DA EDGE FUNCTION ANTIGA (que funcionava!)
            // Pegar o valor original do documento, não calcular baseado em páginas
            const pages = docData.pages || payload.pages || 1;
            const originalValue = docData.total_cost || payload.total_cost || 0;
            
            console.log("📊 VALOR ORIGINAL DO DOCUMENTO (como na Edge Function antiga):");
            console.log("  - Páginas:", pages);
            console.log("  - Valor original do documento:", originalValue);
            console.log("  - Valor pago pelo authenticator:", docData.total_cost || payload.total_cost || 0);
            console.log("  - Usando valor original (não calculado) ✅");
            
            const insertData = {
              user_id: user_id,
              filename: filename,
              pages: pages,
              status: 'pending',
              total_cost: originalValue, // 🎯 VALOR ORIGINAL (como funcionava antes)
              is_bank_statement: docData.is_bank_statement || payload.is_bank_statement || false,
              source_language: docData.source_language || payload.source_language || 'portuguese',
              target_language: 'english',
              translation_status: 'pending',
              file_id: docData.id,
              verification_code: `TFEB${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              client_name: docData.client_name || payload.client_name || null,
              translated_file_url: payload.url
            };
            
            console.log("Attempting to insert data:", JSON.stringify(insertData, null, 2));
            
            const { data: verifyData, error: verifyError } = await supabase
              .from('documents_to_be_verified')
              .insert(insertData)
              .select();

            if (verifyError) {
              console.error("Error inserting into documents_to_be_verified:", verifyError);
              
              // Se o erro for de duplicata, não falhar completamente
              if (verifyError.code === '23505') {
                console.log("🚨 DUPLICATE KEY ERROR - Document already exists (this is expected behavior)");
              }
            } else {
              console.log("✅ Inserted into documents_to_be_verified successfully:", verifyData);
              console.log("💰 Valor registrado:", insertData.total_cost);
            }
          }
        } else {
          console.error("Error finding document:", docError);
        }
      } catch (verifyError) {
        console.error("Exception inserting into documents_to_be_verified:", verifyError);
      }
    }

    // ✅ Webhook enviado para n8n com sucesso
    if (webhookResponse.ok) {
      console.log("✅ Webhook enviado para n8n com sucesso");
      console.log("📋 Valor da tradução registrado em documents_to_be_verified");
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