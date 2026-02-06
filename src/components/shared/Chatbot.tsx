import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/f1-initial`;

const WELCOME_MESSAGE = `Olá! 👋 Sou o assistente especializado em vistos F1.

Posso ajudar você com dúvidas sobre:
- **Change of Status (COS)** - Trocar seu status dentro dos EUA
- **Initial F1** - Obter o visto ainda no Brasil
- **Transfer** - Transferir seu I-20 entre escolas

Como posso ajudar você hoje?`;

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [msgCount, setMsgCount] = useState(0);
  const [lastMsgTimestamp, setLastMsgTimestamp] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const MAX_SESSION_MESSAGES = 15;
  const COOLDOWN_SECONDS = 3;

  // Add welcome message when chat is opened for the first time
  useEffect(() => {
    if (isOpen && !hasShownWelcome && messages.length === 0) {
      setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Antigravity optimization: Rate limiting
    const now = Date.now();
    const secondsSinceLastMsg = (now - lastMsgTimestamp) / 1000;
    
    if (secondsSinceLastMsg < COOLDOWN_SECONDS) {
      toast.error(`Please wait ${Math.ceil(COOLDOWN_SECONDS - secondsSinceLastMsg)}s before sending another message.`);
      return;
    }
    
    if (msgCount >= MAX_SESSION_MESSAGES) {
      toast.error("You reached the message limit for this session. Please log in for more access!");
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "⚠️ Você atingiu o limite de mensagens desta sessão anônima. Para continuar nossa conversa ou tirar mais dúvidas, por favor faça login ou cadastre-se na plataforma!" 
      }]);
      return;
    }

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setMsgCount(prev => prev + 1);
    setLastMsgTimestamp(now);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          threadId: threadId || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar mensagem");
      }

      if (!response.body) {
        throw new Error("Resposta sem corpo");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let isFirstEvent = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Extract threadId from first event
            if (isFirstEvent && parsed.threadId) {
              setThreadId(parsed.threadId);
              isFirstEvent = false;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Desculpe, ocorreu um erro. Tente novamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end bg-transparent"
      style={{ 
        background: 'transparent',
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        padding: 0,
        margin: 0
      }}
    >
      {/* Chat Icon */}
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          className="relative w-16 h-16 cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="Open chat"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen(true);
            }
          }}
        >
          {/* Botão principal */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-950 to-blue-900 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center group-hover:from-blue-900 group-hover:to-blue-800">
            {/* Ícone de chat */}
            <svg 
              className="w-8 h-8 text-white transition-transform duration-300 group-hover:scale-110" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          </div>
          
          {/* Indicador de notificação */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          
          {/* Efeito de ondas */}
          <div className="absolute inset-0 rounded-full bg-blue-600 opacity-20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full bg-blue-500 opacity-10 animate-ping" style={{ animationDelay: '0.5s' }}></div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          {/* Header */}
          <div className="bg-blue-950 px-4 py-3 flex justify-between items-center shrink-0">
            <div className="h-6 w-8 bg-gradient-to-br from-tfe-red-600 to-tfe-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">TFE</span>
            </div>
            <div className="text-white font-semibold text-sm">Assistente F1</div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white text-xl font-bold hover:text-gray-200 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 bg-gray-50 overflow-y-auto min-h-0 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "inline-block max-w-[85%] p-3 rounded-xl break-words overflow-wrap-anywhere word-break-break-word text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-blue-950 text-white self-end rounded-br-none"
                    : "bg-gray-200 text-gray-900 self-start rounded-bl-none"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="bg-gray-200 self-start rounded-xl rounded-bl-none p-3 max-w-[85%]">
                <div className="flex gap-1 h-5 items-center">
                  <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex shrink-0 border-t border-gray-100 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida..."
              disabled={isLoading}
              className="flex-1 px-4 py-4 text-sm border-none outline-none disabled:bg-gray-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-5 py-4 bg-white text-blue-950 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
