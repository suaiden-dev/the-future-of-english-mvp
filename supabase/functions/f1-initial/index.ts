import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSISTANT_ID = "asst_6Q8wvTv0anNbFsYsy84KTGDk";

async function saveContactToDatabase(contactData: {
  name: string;
  email: string;
  phone?: string;
  process_type: string;
}): Promise<{ success: boolean; error?: string; duplicate?: boolean }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalize email for deduplication
    const normalizedEmail = contactData.email.toLowerCase().trim();

    // Check if contact with this email already exists
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (existingContact) {
      console.log("Duplicate contact detected, skipping insert:", normalizedEmail);
      return { success: true, duplicate: true };
    }

    const message = `Lead via chatbot - Processo: ${contactData.process_type}`;

    const { error } = await supabase
      .from("contacts")
      .insert({
        name: contactData.name,
        email: normalizedEmail,
        phone: contactData.phone || null,
        message: message
      });

    if (error) {
      console.error("Error saving contact:", error);
      return { success: false, error: error.message };
    }

    console.log("Contact saved successfully:", normalizedEmail);
    return { success: true };
  } catch (error) {
    console.error("Error in saveContactToDatabase:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("Missing OpenAI API Key");
    }

    const { messages, threadId } = await req.json();

    // ========== INPUT VALIDATION ==========
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages must be an array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many messages. Maximum 50 messages per request." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") {
        return new Response(
          JSON.stringify({ error: "Invalid message format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!msg.role || !["user", "assistant"].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: "Invalid message role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!msg.content || typeof msg.content !== "string") {
        return new Response(
          JSON.stringify({ error: "Message content must be a non-empty string" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (msg.content.length > 10000) {
        return new Response(
          JSON.stringify({ error: "Message content too long. Maximum 10,000 characters per message." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // ========== END INPUT VALIDATION ==========

    console.log("Processing chat request with", messages.length, "messages");

    // Get or create thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      console.log("Creating new thread");
      const threadResponse = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      });

      if (!threadResponse.ok) {
        const error = await threadResponse.text();
        console.error("Failed to create thread:", error);
        throw new Error("Failed to create thread");
      }

      const thread = await threadResponse.json();
      currentThreadId = thread.id;
      console.log("Created thread:", currentThreadId);
    }

    // Add the user's message to the thread
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      console.log("Adding message to thread");
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        },
        body: JSON.stringify({
          role: "user",
          content: lastMessage.content
        })
      });

      if (!messageResponse.ok) {
        const error = await messageResponse.text();
        console.error("Failed to add message:", error);
        throw new Error("Failed to add message to thread");
      }
    }

    // Run the assistant with streaming
    console.log("Starting assistant run with streaming");
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        stream: true
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error("Failed to start run:", error);
      throw new Error("Failed to start assistant run");
    }

    // Create a transform stream to convert OpenAI SSE to our format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send threadId as first event
        const threadIdEvent = JSON.stringify({
          threadId: currentThreadId,
          choices: [{
            delta: { content: "" },
            finish_reason: null
          }]
        });
        controller.enqueue(encoder.encode(`data: ${threadIdEvent}\n\n`));

        const reader = runResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  const event = JSON.parse(data);
                  
                  // Handle text delta events
                  if (event.object === "thread.message.delta") {
                    const content = event.delta?.content?.[0];
                    if (content?.type === "text" && content.text?.value) {
                      const chunk = JSON.stringify({
                        choices: [{
                          delta: { content: content.text.value },
                          finish_reason: null
                        }]
                      });
                      controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                    }
                  }
                  
                  // Handle run completion
                  if (event.object === "thread.run.completed") {
                    const doneChunk = JSON.stringify({
                      choices: [{
                        delta: { content: "" },
                        finish_reason: "stop"
                      }]
                    });
                    controller.enqueue(encoder.encode(`data: ${doneChunk}\n\n`));
                  }
                } catch (e) {
                  console.error("Error parsing SSE event:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
