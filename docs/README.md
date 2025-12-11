# Documentação do Projeto

Esta pasta contém toda a documentação técnica do projeto, incluindo guias de implementação, correções de bugs, configurações e relatórios.

## 📁 Organização

A documentação está organizada por categorias principais:

### 🔧 Configuração e Setup
- `ENVIRONMENT_SETUP.md` - Configuração do ambiente de desenvolvimento
- `SUPABASE_SETUP_GUIDE.md` - Guia de configuração do Supabase
- `SUPABASE_PRODUCTION_SETUP.md` - Configuração para produção
- `SUPABASE_CRON_SOLUTION.md` - Solução de cron jobs no Supabase
- `README_STRIPE_SETUP.md` - Configuração do Stripe

### 💳 Pagamentos
- `POSTGRESQL_ZELLE_INTEGRATION.md` - Integração com Zelle
- `ZELLE_PAYMENT_IMPLEMENTATION.md` - Implementação de pagamentos Zelle
- `ZELLE_CONFIRMATION_CODE_VALIDATION.md` - Validação de códigos Zelle
- `ZELLE_ADMIN_SYSTEM_COMPLETE.md` - Sistema administrativo Zelle completo
- `PAYMENT_DATABASE_FIX.md` - Correções no banco de dados de pagamentos
- `PAYMENT_CLEANUP_COMPLETE.md` - Limpeza completa de pagamentos
- `PAYMENT_NOTIFICATIONS_SYSTEM.md` - Sistema de notificações de pagamento
- `STRIPE_CLEANUP_SOLUTION.md` - Solução de limpeza do Stripe
- `STRIPE_SESSIONS_TABLE_FIX.md` - Correção da tabela de sessões Stripe
- `STRIPE_STATUS_FIX.md` - Correção de status do Stripe

### 📊 Dashboards
- `ADMIN_DASHBOARD_UX_IMPROVEMENTS.md` - Melhorias de UX no dashboard admin
- `AUTHENTICATOR_DASHBOARD_ERROR_FIX.md` - Correção de erros no dashboard do autenticador
- `AUTHENTICATOR_STORAGE_FIX_SUMMARY.md` - Resumo de correções de storage do autenticador
- `DASHBOARD_SEPARATION_GUIDE.md` - Guia de separação de dashboards
- `USER_FRIENDLY_ERRORS_SUMMARY.md` - Resumo de erros amigáveis ao usuário

### 📄 Documentos e Uploads
- `DOCUMENT_DUPLICATION_FIX.md` - Correção de duplicação de documentos
- `DUPLICATE_DOCUMENTS_FIX.md` - Correção de documentos duplicados
- `DUPLICATE_DOCUMENT_ERROR_FIX.md` - Correção de erro de documentos duplicados
- `DUPLICATE_UPLOAD_FIX.md` - Correção de uploads duplicados
- `DUPLICATE_UPLOAD_FINAL_SOLUTION.md` - Solução final para uploads duplicados
- `DUPLICATE_UPLOAD_PREVENTION_FIX.md` - Prevenção de uploads duplicados
- `FINAL_DUPLICATION_FIX.md` - Correção final de duplicação
- `UPLOAD_PAGE_FIX.md` - Correção da página de upload
- `UPLOAD_PAYLOAD_FIX.md` - Correção do payload de upload
- `MOBILE_UPLOAD_FIX.md` - Correção de upload no mobile
- `STORAGE_EXPIRATION_FIX.md` - Correção de expiração de storage
- `STORAGE_TRIGGER_SETUP.md` - Configuração de triggers de storage

### 🔄 Correções e Melhorias
- `CORRECTION_REJECTION_FIX.md` - Correção de rejeição
- `CORRECTION_TRACKING_SETUP.md` - Configuração de rastreamento de correções
- `EDGE_FUNCTION_CORRECTION_SOLUTION.md` - Solução de correção de Edge Functions
- `SOURCE_LANGUAGE_NULL_FIX.md` - Correção de idioma de origem nulo
- `VERIFICATION_CODE_DUPLICATION_FIX.md` - Correção de duplicação de código de verificação

### 🔐 Segurança e Permissões
- `RLS_POLICY_403_FIX.md` - Correção de política RLS 403
- `USER_MANAGEMENT_PERMISSION_FIX.md` - Correção de permissões de gerenciamento de usuários
- `USER_PROFILE_NOT_FOUND_FIX.md` - Correção de perfil de usuário não encontrado

### 🌐 Interface e UX
- `DRAG_AND_DROP_FIX.md` - Correção de drag and drop
- `DRAG_DROP_BLOCKED_FIX.md` - Correção de bloqueio de drag and drop
- `FOLDERS_DEBUG_ANALYSIS.md` - Análise de debug de pastas
- `FOLDERS_LOOP_FIX.md` - Correção de loop de pastas
- `FINAL_USE_REF_FIX.md` - Correção final de useRef
- `UX_IMPROVEMENTS.md` - Melhorias de UX
- `LANDING_PAGE_IMAGES_GUIDE.md` - Guia de imagens da landing page
- `TRANSLATIONS_LANDING_PAGE_GUIDE.md` - Guia de traduções da landing page
- `IMAGE_SUPPORT_SUMMARY.md` - Resumo de suporte a imagens

### 🔔 Notificações e Webhooks
- `NOTIFICATION_RECIPIENTS_UPDATE.md` - Atualização de destinatários de notificações
- `WEBHOOK_PAYLOAD_STANDARDIZATION.md` - Padronização de payload de webhook

### ⚙️ Sistema e Migrações
- `LUSH_ADMIN_TO_FINANCE_MIGRATION.md` - Migração de Lush Admin para Finance
- `LUSH_ADMIN_USAGE_EXAMPLE.md` - Exemplo de uso do Lush Admin
- `MULTILINGUAL_SYSTEM_GUIDE.md` - Guia do sistema multilíngue
- `CRON_JOB_SETUP.md` - Configuração de cron jobs
- `TEST_TIMEOUTS.md` - Timeouts de teste

### 📝 Relatórios
- `RELATORIO_IMPLEMENTACOES_2025-01-31.md` - Relatório de implementações (31/01/2025)

## 🔍 Como Usar

Para encontrar documentação específica:

1. **Por funcionalidade**: Procure por palavras-chave relacionadas (ex: "payment", "upload", "dashboard")
2. **Por tipo**: Use os prefixos dos arquivos:
   - `*_FIX.md` - Correções de bugs
   - `*_GUIDE.md` - Guias de uso
   - `*_SETUP.md` - Configurações
   - `*_SOLUTION.md` - Soluções completas
   - `*_SUMMARY.md` - Resumos

## 📌 Notas Importantes

- O arquivo `README.md` principal permanece na raiz do projeto
- Documentação específica de templates de email está em `email-templates/SETUP_GUIDE.md`
- Scripts SQL de migração estão na raiz do projeto (arquivos `.sql`)

## 🔄 Atualizações

Esta documentação é atualizada conforme novas implementações e correções são realizadas. Para adicionar nova documentação:

1. Crie o arquivo `.md` nesta pasta
2. Use nomes descritivos e consistentes
3. Atualize este README se necessário

