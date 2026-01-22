# SQL Scripts

Esta pasta contém scripts SQL utilitários, de debug, correções e funções auxiliares que não são migrations oficiais do Supabase.

## 📁 Organização

### ⚠️ Importante
- **Migrations oficiais** estão em `supabase/migrations/` e seguem o padrão de timestamp
- **Scripts nesta pasta** são utilitários, correções manuais, ou scripts de debug/teste

## 📋 Categorias de Scripts

### 🔧 Configuração e Setup
- `add_finance_role.sql` - Adiciona role de finance
- `add_payments_rls_policies.sql` - Adiciona políticas RLS para pagamentos
- `add_stripe_pending_status.sql` - Adiciona status pending ao Stripe
- `add_zelle_payment_support.sql` - Adiciona suporte a pagamentos Zelle
- `step1_add_finance_enum.sql` - Passo 1: Adiciona enum finance
- `step2_create_finance_function.sql` - Passo 2: Cria função finance

### 📊 Relatórios e Análises
- `generate_comprehensive_report.sql` - Gera relatório abrangente
- `generate_comprehensive_report_fixed.sql` - Versão corrigida do relatório
- `clean_generate_comprehensive_report.sql` - Limpeza do relatório

### 🐛 Correções e Fixes
- `fix_duplicate_error_immediate.sql` - Correção imediata de erro de duplicação
- `fix_enum_migration.sql` - Correção de migração de enum
- `fix_finance_dashboard_functions.sql` - Correção de funções do dashboard finance
- `fix_finance_permissions.sql` - Correção de permissões finance
- `fix_is_lush_admin_function.sql` - Correção da função is_lush_admin
- `quick_fix_is_lush_admin.sql` - Correção rápida is_lush_admin
- `complete_enum_cleanup.sql` - Limpeza completa de enums

### 🔍 Debug e Verificação
- `check_documents_to_be_verified_validations.sql` - Verifica validações de documentos
- `check_payments_table.sql` - Verifica tabela de pagamentos
- `check_storage_triggers.sql` - Verifica triggers de storage
- `debug_authenticator_documents.sql` - Debug de documentos do autenticador
- `debug_document_search.sql` - Debug de busca de documentos
- `debug_functions_no_auth.sql` - Debug de funções sem autenticação
- `test_combined_functions.sql` - Teste de funções combinadas
- `verify_payments_access.sql` - Verifica acesso a pagamentos

### 🧹 Limpeza e Manutenção
- `clean_duplicate_documents.sql` - Limpa documentos duplicados
- `find_duplicate_validation_function.sql` - Encontra função de validação duplicada

### 📄 Adições de Campos e Tabelas
- `add_document_reference.sql` - Adiciona referência de documento
- `add_file_path_to_documents.sql` - Adiciona caminho de arquivo aos documentos
- `add_idioma_destino_column.sql` - Adiciona coluna de idioma de destino
- `alter_payments_document_id_nullable.sql` - Torna document_id nullable em payments
- `create_zelle_payment_history_table.sql` - Cria tabela de histórico de pagamentos Zelle

### ⚙️ Funções e Triggers
- `webhook_notification_function.sql` - Função de notificação webhook
- `update_rpc_functions_for_finance.sql` - Atualiza funções RPC para finance
- `update_cron_job_to_30_minutes.sql` - Atualiza cron job para 30 minutos
- `optimized_queries_with_document_id.sql` - Queries otimizadas com document_id

## 🚀 Como Usar

### Antes de Executar
1. **Verifique se já existe uma migration oficial** em `supabase/migrations/`
2. **Faça backup do banco de dados** antes de executar scripts de modificação
3. **Teste em ambiente de desenvolvimento** primeiro

### Executando Scripts

#### Via Supabase CLI
```bash
supabase db execute -f scripts/sql/nome_do_script.sql
```

#### Via Supabase Dashboard
1. Acesse o SQL Editor no Supabase Dashboard
2. Cole o conteúdo do script
3. Execute

#### Via psql
```bash
psql -h [host] -U [user] -d [database] -f scripts/sql/nome_do_script.sql
```

## 📝 Notas

- Scripts nesta pasta **não são executados automaticamente** pelo sistema de migrations
- Use apenas quando necessário para correções manuais ou utilitários
- Considere criar uma migration oficial se o script for parte do fluxo normal de desenvolvimento

## 🔄 Migrations vs Scripts

| Aspecto | Migrations (`supabase/migrations/`) | Scripts (`scripts/sql/`) |
|---------|-----------------------------------|--------------------------|
| **Execução** | Automática via Supabase CLI | Manual |
| **Versionamento** | Com timestamp | Sem versionamento |
| **Uso** | Mudanças de schema oficiais | Utilitários, debug, correções |
| **Ordem** | Executadas em ordem cronológica | Executadas conforme necessário |

## ⚠️ Avisos

- **Não execute scripts de modificação em produção** sem testar antes
- **Verifique dependências** entre scripts antes de executar
- **Documente mudanças** feitas manualmente via scripts

