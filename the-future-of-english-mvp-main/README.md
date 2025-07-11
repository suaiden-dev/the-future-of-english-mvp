# The Future of English - MVP

Uma aplicação web moderna para tradução e verificação de documentos em inglês, construída com React, TypeScript e Vite.

## 🚀 Funcionalidades

- **Tradução de Documentos**: Upload e tradução de documentos
- **Verificação de Documentos**: Sistema de verificação e autenticação
- **Dashboard do Cliente**: Gerenciamento de documentos e pastas
- **Painel Administrativo**: Monitoramento e gerenciamento de projetos
- **Sistema de Autenticação**: Login e registro de usuários
- **Interface Responsiva**: Design moderno com Tailwind CSS

## 🛠️ Tecnologias Utilizadas

- **React 18** - Biblioteca JavaScript para interfaces
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS utilitário
- **Lucide React** - Ícones modernos
- **ESLint** - Linting de código

## 📦 Instalação

### Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn

### Passos para Instalação

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd the-future-of-english-mvp-main
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Execute o projeto em modo de desenvolvimento**
   ```bash
   npm run dev
   ```

4. **Acesse a aplicação**
   - Abra seu navegador
   - Acesse: `http://localhost:5173`

## 🔑 Credenciais de Demonstração

### Administrador
- **Email**: `admin@thefutureofenglish.com`
- **Senha**: `admin123`

### Usuário Regular
- **Email**: Qualquer email válido
- **Senha**: Qualquer senha (mínimo 6 caracteres)

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Header.tsx      # Cabeçalho da aplicação
│   └── Sidebar.tsx     # Barra lateral do dashboard
├── pages/              # Páginas da aplicação
│   ├── Home.tsx        # Página inicial
│   ├── Login.tsx       # Página de login
│   ├── Register.tsx    # Página de registro
│   ├── Translations.tsx # Página de traduções
│   ├── DocumentVerification.tsx # Verificação de documentos
│   ├── CustomerDashboard/ # Dashboard do cliente
│   └── AdminDashboard/    # Dashboard do administrador
├── utils/              # Utilitários e helpers
├── App.tsx             # Componente principal
└── main.tsx            # Ponto de entrada
```

## 🎯 Como Usar

### Para Usuários Regulares

1. **Registro/Login**: Crie uma conta ou faça login
2. **Dashboard**: Acesse seu painel pessoal
3. **Upload de Documentos**: Faça upload de documentos para tradução
4. **Gerenciamento**: Organize documentos em pastas
5. **Verificação**: Verifique a autenticidade de documentos

### Para Administradores

1. **Login**: Use as credenciais de administrador
2. **Painel Admin**: Acesse o painel administrativo
3. **Monitoramento**: Visualize estatísticas e métricas
4. **Gerenciamento**: Gerencie projetos de tradução
5. **Controle de Status**: Atualize status de documentos

## 🚀 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter

## 🔧 Configuração

### Variáveis de Ambiente

O projeto não requer variáveis de ambiente para funcionamento básico, mas você pode configurar:

```env
VITE_API_URL=sua_url_api
VITE_APP_NAME=The Future of English
```

### Personalização

- **Cores**: Edite `tailwind.config.js` para personalizar o tema
- **Ícones**: Substitua ícones do Lucide React
- **Estilos**: Modifique `src/index.css` para estilos globais

## 🐛 Solução de Problemas

### Erro de Porta em Uso
```bash
# Se a porta 5173 estiver em uso, Vite usará automaticamente outra porta
# Ou especifique uma porta diferente:
npm run dev -- --port 3000
```

### Problemas de Dependências
```bash
# Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

### Erros de TypeScript
```bash
# Verifique se todas as dependências estão instaladas
npm install
# Execute o linter
npm run lint
```

## 📝 Notas de Desenvolvimento

- Este é um MVP (Minimum Viable Product)
- Os dados são simulados (não há backend real)
- As funcionalidades são demonstrativas
- O foco está na interface e experiência do usuário

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte ou dúvidas, entre em contato através dos issues do GitHub.

---

**Desenvolvido com ❤️ para o futuro do inglês**
