import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Cache para evitar processamento duplicado
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

    // Gerar um ID único para esta requisição baseado no conteúdo
    const requestId = `${parsedBody.user_id || 'unknown'}_${parsedBody.filename || 'unknown'}_${Date.now()}`;
    console.log("Request ID:", requestId);
    
    // Verificar se esta requisição já foi processada recentemente (últimos 30 segundos)
    const now = Date.now();
    const lastProcessed = processedRequests.get(requestId);
    if (lastProcessed && (now - lastProcessed) < 30000) {
      console.log("Request already processed recently, skipping duplicate processing");
      return new Response(
        JSON.stringify({
          success: true,
          status: 200,
          message: "Request already processed",
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
      if (now - timestamp > 300000) {
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
      
      // Estrutura exata do payload conforme especificado
      payload = {
        filename: path,
        url: publicUrl,
        mimetype: record.mimetype || record.metadata?.mimetype || "application/octet-stream",
        size: record.size || record.metadata?.size || null,
        user_id: record.user_id || record.metadata?.user_id || null,
        paginas: record.pages || pages || paginas || 1,
        tipo_trad: record.document_type || document_type || record.tipo_trad || tipo_trad || 'Certificado',
        valor: record.total_cost || total_cost || record.valor || valor || 0,
        idioma_raiz: record.source_language || source_language || record.idioma_raiz || idioma_raiz || 'Portuguese',
        is_bank_statement: record.is_bank_statement || is_bank_statement || false,
        client_name: record.client_name || client_name || null,
        isPdf: (record.mimetype || record.metadata?.mimetype || "application/octet-stream") === 'application/pdf',
        fileExtension: path.split('.').pop()?.toLowerCase(),
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
      
      // Estrutura exata do payload conforme especificado
      payload = { 
        filename: filename, 
        url: finalUrl, 
        mimetype, 
        size, 
        user_id: user_id || null, 
        paginas: pages || paginas || 1,
        tipo_trad: document_type || tipo_trad || 'Certificado',
        valor: total_cost || valor || 0,
        idioma_raiz: source_language || idioma_raiz || 'Portuguese',
        is_bank_statement: is_bank_statement || false,
        client_name: client_name || null,
        isPdf: mimetype === 'application/pdf',
        fileExtension: filename.split('.').pop()?.toLowerCase(),
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
          
          // Verificação mais robusta: verificar por múltiplos critérios
          const { data: existingDocsByFileId, error: checkErrorByFileId } = await supabase
            .from('documents_to_be_verified')
            .select('id, translated_file_url, created_at, status, file_id, user_id, filename')
            .eq('file_id', docData.id)
            .order('created_at', { ascending: false });

          console.log("Check by file_id error:", checkErrorByFileId);
          console.log("Existing docs by file_id found:", existingDocsByFileId?.length || 0);

          // Verificação adicional por user_id e filename
          const { data: existingDocsByUserAndFilename, error: checkErrorByUserAndFilename } = await supabase
            .from('documents_to_be_verified')
            .select('id, translated_file_url, created_at, status, file_id, user_id, filename')
            .eq('user_id', user_id)
            .ilike('filename', filename) // Usar ilike para case-insensitive comparison
            .order('created_at', { ascending: false });

          console.log("Check by user_id and filename error:", checkErrorByUserAndFilename);
          console.log("Existing docs by user_id and filename found:", existingDocsByUserAndFilename?.length || 0);

          // Verificar se há documentos recentes (últimos 5 minutos) para evitar duplicatas por timing
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: recentDocs, error: checkRecentError } = await supabase
            .from('documents_to_be_verified')
            .select('id, translated_file_url, created_at, status, file_id, user_id, filename')
            .eq('user_id', user_id)
            .ilike('filename', filename)
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: false });

          console.log("Recent docs (last 5 minutes) found:", recentDocs?.length || 0);

          // Verificação adicional: verificar se há documentos com status 'pending' ou 'processing'
          const { data: pendingDocs, error: checkPendingError } = await supabase
            .from('documents_to_be_verified')
            .select('id, translated_file_url, created_at, status, file_id, user_id, filename')
            .eq('user_id', user_id)
            .ilike('filename', filename)
            .in('status', ['pending', 'processing'])
            .order('created_at', { ascending: false });

          console.log("Pending docs found:", pendingDocs?.length || 0);

          // Verificação adicional: verificar se há documentos com a mesma URL (caso a URL seja única)
          let urlDocs = [];
          let checkUrlError = null;
          if (url && url.startsWith('http')) {
            const { data: urlDocsData, error: urlError } = await supabase
              .from('documents_to_be_verified')
              .select('id, translated_file_url, created_at, status, file_id, user_id, filename')
              .eq('user_id', user_id)
              .ilike('translated_file_url', `%${url.split('/').pop()}%`)
              .order('created_at', { ascending: false });
            
            urlDocs = urlDocsData || [];
            checkUrlError = urlError;
            console.log("URL docs found:", urlDocs.length);
          }

          // Verificação adicional: verificar se há documentos criados nos últimos 10 minutos
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const { data: veryRecentDocs, error: checkVeryRecentError } = await supabase
            .from('documents_to_be_verified')
            .select('id, translated_file_url, created_at, status, file_id, user_id, filename')
            .eq('user_id', user_id)
            .ilike('filename', filename)
            .gte('created_at', tenMinutesAgo)
            .order('created_at', { ascending: false });

          console.log("Very recent docs (last 10 minutes) found:", veryRecentDocs?.length || 0);

          // Verificação adicional: verificar se há documentos com o mesmo file_id
          let fileIdDocs = [];
          let checkFileIdError = null;
          if (docData && docData.id) {
            const { data: fileIdDocsData, error: fileIdError } = await supabase
              .from('documents_to_be_verified')
              .select('id, translated_file_url, created_at, status, file_id, user_id, filename')
              .eq('file_id', docData.id)
              .order('created_at', { ascending: false });
            
            fileIdDocs = fileIdDocsData || [];
            checkFileIdError = fileIdError;
            console.log("File ID docs found:", fileIdDocs.length);
          }

          // Se encontrou documentos existentes por qualquer critério, não criar duplicata
          const hasExistingDocs = (existingDocsByFileId && existingDocsByFileId.length > 0 && !checkErrorByFileId) ||
                                 (existingDocsByUserAndFilename && existingDocsByUserAndFilename.length > 0 && !checkErrorByUserAndFilename) ||
                                 (recentDocs && recentDocs.length > 0 && !checkRecentError) ||
                                 (pendingDocs && pendingDocs.length > 0 && !checkPendingError) ||
                                 (urlDocs && urlDocs.length > 0 && !checkUrlError) ||
                                 (veryRecentDocs && veryRecentDocs.length > 0 && !checkVeryRecentError) ||
                                 (fileIdDocs && fileIdDocs.length > 0 && !checkFileIdError);

          if (hasExistingDocs) {
            console.log("Document already exists in documents_to_be_verified, skipping duplicate creation");
            
            if (existingDocsByFileId && existingDocsByFileId.length > 0) {
              console.log("Found existing documents by file_id:", existingDocsByFileId.length);
              existingDocsByFileId.forEach((doc, index) => {
                console.log(`Document ${index + 1}:`, doc.id, "translated_file_url:", doc.translated_file_url, "status:", doc.status, "file_id:", doc.file_id);
              });
            }
            
            if (existingDocsByUserAndFilename && existingDocsByUserAndFilename.length > 0) {
              console.log("Found existing documents by user_id and filename:", existingDocsByUserAndFilename.length);
              existingDocsByUserAndFilename.forEach((doc, index) => {
                console.log(`Document ${index + 1}:`, doc.id, "translated_file_url:", doc.translated_file_url, "status:", doc.status, "file_id:", doc.file_id);
              });
            }
            
            if (recentDocs && recentDocs.length > 0) {
              console.log("Found recent documents:", recentDocs.length);
              recentDocs.forEach((doc, index) => {
                console.log(`Recent Document ${index + 1}:`, doc.id, "created_at:", doc.created_at, "status:", doc.status);
              });
            }

            if (pendingDocs && pendingDocs.length > 0) {
              console.log("Found pending documents:", pendingDocs.length);
              pendingDocs.forEach((doc, index) => {
                console.log(`Pending Document ${index + 1}:`, doc.id, "created_at:", doc.created_at, "status:", doc.status);
              });
            }

            if (urlDocs && urlDocs.length > 0) {
              console.log("Found URL documents:", urlDocs.length);
              urlDocs.forEach((doc, index) => {
                console.log(`URL Document ${index + 1}:`, doc.id, "translated_file_url:", doc.translated_file_url, "status:", doc.status);
              });
            }

            if (veryRecentDocs && veryRecentDocs.length > 0) {
              console.log("Found very recent documents:", veryRecentDocs.length);
              veryRecentDocs.forEach((doc, index) => {
                console.log(`Very Recent Document ${index + 1}:`, doc.id, "created_at:", doc.created_at, "status:", doc.status);
              });
            }

            if (fileIdDocs && fileIdDocs.length > 0) {
              console.log("Found file_id documents:", fileIdDocs.length);
              fileIdDocs.forEach((doc, index) => {
                console.log(`File ID Document ${index + 1}:`, doc.id, "file_id:", doc.file_id, "status:", doc.status);
              });
            }
            
            console.log("=== SKIPPING DUPLICATE CREATION ===");
          } else {
            console.log("Document not found in documents_to_be_verified, creating new entry...");
            
            // Verificação final mais robusta antes da inserção para evitar race conditions
            console.log("=== FINAL CHECK BEFORE INSERTION ===");
            const { data: finalCheck, error: finalCheckError } = await supabase
              .from('documents_to_be_verified')
              .select('id, filename, status, created_at')
              .eq('user_id', user_id)
              .ilike('filename', filename)
              .in('status', ['pending', 'processing'])
              .limit(1);

            if (finalCheckError) {
              console.error("Error in final check:", finalCheckError);
            } else if (finalCheck && finalCheck.length > 0) {
              console.log("🚨 DUPLICATE DETECTED in final check!");
              console.log("Final check found documents:", finalCheck.length);
              finalCheck.forEach((doc, index) => {
                console.log(`Final Check Document ${index + 1}:`, doc.id, "filename:", doc.filename, "status:", doc.status, "created_at:", doc.created_at);
              });
              console.log("=== SKIPPING INSERTION - DUPLICATE FOUND ===");
              return new Response(
                JSON.stringify({
                  success: true,
                  status: 200,
                  message: "Document already exists, skipping duplicate creation",
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
              console.log("✅ Final check passed - no duplicates found");
            }

            // Verificação adicional: verificar se há documentos com o mesmo file_id (caso edge)
            if (docData && docData.id) {
              const { data: finalFileIdCheck, error: finalFileIdError } = await supabase
                .from('documents_to_be_verified')
                .select('id, filename, status, created_at, file_id')
                .eq('file_id', docData.id)
                .limit(1);

              if (finalFileIdError) {
                console.error("Error in final file_id check:", finalFileIdError);
              } else if (finalFileIdCheck && finalFileIdCheck.length > 0) {
                console.log("🚨 DUPLICATE DETECTED by file_id in final check!");
                console.log("Final file_id check found documents:", finalFileIdCheck.length);
                finalFileIdCheck.forEach((doc, index) => {
                  console.log(`Final File ID Check Document ${index + 1}:`, doc.id, "filename:", doc.filename, "status:", doc.status, "file_id:", doc.file_id);
                });
                console.log("=== SKIPPING INSERTION - DUPLICATE FOUND BY FILE_ID ===");
                return new Response(
                  JSON.stringify({
                    success: true,
                    status: 200,
                    message: "Document already exists (file_id duplicate), skipping duplicate creation",
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
                console.log("✅ Final file_id check passed - no duplicates found");
              }
            }
            
            const insertData = {
              user_id: user_id,
              filename: filename,
              pages: docData.pages || pages || paginas || 1,
              status: 'pending',
              total_cost: docData.total_cost || total_cost || valor || 0,
              // Usar o valor validado pelo N8N se disponível, senão usar o valor do cliente
              is_bank_statement: (() => {
                const finalValue = is_bank_statement !== undefined ? is_bank_statement : (docData.is_bank_statement || false);
                console.log("Final is_bank_statement value being used:", finalValue);
                return finalValue;
              })(),
              source_language: docData.source_language || source_language || docData.idioma_raiz?.toLowerCase() || 'portuguese',
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
              
              // Se o erro for de duplicata, não falhar completamente
              if (verifyError.code === '23505') {
                console.log("🚨 DUPLICATE KEY ERROR - Document already exists");
                return new Response(
                  JSON.stringify({
                    success: true,
                    status: 200,
                    message: "Document already exists (duplicate key)",
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
            } else {
              console.log("✅ Inserted into documents_to_be_verified successfully:", verifyData);
              console.log("Notifications will be created automatically by database trigger");
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