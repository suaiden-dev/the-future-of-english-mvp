
const ChatBot = () => {
  return (
    <a
      href="https://ai.simplesdesk.com.br/webchat/?p=1465849&id=kIpW5C0ooMIxIVdN"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end bg-transparent"
      title="Falar com Assistente de Vistos"
    >
      <div className="relative w-16 h-16 cursor-pointer group">
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
    </a>
  );
};

export default ChatBot;
