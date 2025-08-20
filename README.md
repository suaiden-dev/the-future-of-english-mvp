# Lush America Translations MVP

## Estrutura do Projeto

```
the-future-of-english-mvp-main/
│
├── .env
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── index.html
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── functions/
│       └── send-translation-webhook/
│           └── index.ts
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    │
    ├── types/
    │   └── Page.ts
    │
    ├── components/
    │   ├── Header.tsx
    │   ├── Sidebar.tsx
    │   └── ...outros componentes
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useDocuments.ts
    │   ├── useFolders.ts
    │   └── ...outros hooks
    │
    ├── lib/
    │   ├── supabase.ts
    │   └── database.types.ts
    │
    ├── pages/
    │   ├── Home.tsx
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   ├── Translations.tsx
    │   ├── DocumentVerification.tsx
    │   ├── DocumentManager/
    │   ├── CustomerDashboard/
    │   └── AdminDashboard/
    │
    └── utils/
        └── documentUtils.tsx
```

## Descrição das principais pastas

- **supabase/**: Tudo relacionado ao backend Supabase (migrations, edge functions, config).
- **src/**: Todo o código do frontend React.
  - **types/**: Tipos globais compartilhados.
  - **components/**: Componentes reutilizáveis.
  - **hooks/**: Hooks customizados.
  - **lib/**: Configurações e helpers de integração (ex: supabase.ts).
  - **pages/**: Páginas e subpáginas do app.
  - **utils/**: Funções utilitárias.

## Como rodar o projeto

1. Instale as dependências:
   ```sh
   npm install
   ```
2. Inicie o frontend:
   ```sh
   npm run dev
   ```
3. Use o Supabase CLI para gerenciar migrations e edge functions:
   ```sh
   supabase start
   ```

---

Mantenha essa estrutura para facilitar manutenção, deploy e colaboração!
