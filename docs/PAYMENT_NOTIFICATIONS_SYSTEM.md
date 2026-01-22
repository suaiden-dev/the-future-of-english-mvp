# Sistema de Notificações de Pagamento

## 📋 **Visão Geral**

Sistema implementado para enviar notificações automáticas por email para administradores e autenticadores sempre que um cliente pagar pela tradução de um documento via Stripe ou Zelle.

## 🎯 **Funcionalidades**

- ✅ **Notificações automáticas** para pagamentos Stripe e Zelle
- ✅ **Webhook unificado** para `@https://nwh.thefutureofenglish.com/webhook/notificatfoe`
- ✅ **Payload padronizado** com nome do cliente, documento, valor e telefone
- ✅ **Suporte para roles** admin, authenticator e finance
- ✅ **Notificações de aprovação/rejeição** de pagamentos Zelle

## 🏗️ **Arquitetura**

### **1. Edge Function: payment-notifications**
- **Localização**: `supabase/functions/payment-notifications/index.ts`
- **Responsabilidade**: Centralizar o envio de notificações de pagamento
- **Entrada**: Dados do pagamento (payment_id, user_id, document_id, etc.)
- **Saída**: Notificações para todos os admins e autenticadores

### **2. Integrações Atualizadas**

#### **Stripe Webhook**
- **Arquivo**: `supabase/functions/stripe-webhook/index.ts`
- **Chamada**: Automática após pagamento bem-sucedido
- **Dados enviados**: payment_id, user_id, document_id, amount, filename

#### **Zelle Checkout**
- **Arquivo**: `src/pages/ZelleCheckout.tsx`
- **Chamada**: Após upload e validação do comprovante
- **Dados enviados**: payment_id, user_id, document_id, amount, filename

#### **Admin Zelle Receipts**
- **Arquivo**: `src/components/ZelleReceiptsAdmin.tsx`
- **Chamadas**: Aprovação e rejeição de pagamentos Zelle
- **Dados enviados**: payment_id, notification_type (approved/rejected)

## 📧 **Formato do Payload**

### **Webhook Endpoint**
```
https://nwh.thefutureofenglish.com/webhook/notificatfoe
```

### **Estrutura do Payload**
```json
{
  "user_name": "Nome do cliente que pagou",
  "user_email": "email@admin.com",
  "notification_type": "Payment Stripe | Payment Zelle | Payment Approved | Payment Rejected",
  "timestamp": "2025-01-24T10:30:00Z",
  "filename": "documento.pdf",
  "document_id": "uuid-do-documento",
  "status": "status do pagamento",
  "client_name": "Nome do cliente",
  "client_phone": "Telefone do cliente",
  "payment_amount": 50.00,
  "payment_method": "stripe | zelle",
  "recipient_role": "admin | authenticator | finance"
}
```

### **Tipos de Notificação**

| Tipo | Descrição | Quando é enviada |
|------|-----------|------------------|
| `Payment Stripe` | Pagamento Stripe processado | Após pagamento bem-sucedido via Stripe |
| `Payment Zelle` | Pagamento Zelle recebido | Após upload do comprovante Zelle |
| `Payment Approved` | Pagamento Zelle aprovado | Quando admin aprova pagamento Zelle |
| `Payment Rejected` | Pagamento Zelle rejeitado | Quando admin rejeita pagamento Zelle |

## 🔄 **Fluxos de Notificação**

### **Fluxo Stripe**
1. **Cliente** paga via Stripe
2. **Stripe** envia webhook para `stripe-webhook/index.ts`
3. **Sistema** processa pagamento (status: completed)
4. **Sistema** chama `payment-notifications` function
5. **Edge Function** busca admins/autenticadores
6. **Sistema** envia notificação para cada destinatário
7. **Webhook** `notificatfoe` recebe dados para envio de email

### **Fluxo Zelle**
1. **Cliente** faz upload do comprovante
2. **Sistema** valida comprovante automaticamente
3. **Sistema** cria registro de pagamento
4. **Sistema** chama `payment-notifications` function
5. **Edge Function** busca admins/autenticadores
6. **Sistema** envia notificação para cada destinatário
7. **Webhook** `notificatfoe` recebe dados para envio de email

### **Fluxo Aprovação/Rejeição Zelle**
1. **Admin** aprova ou rejeita pagamento
2. **Sistema** atualiza status do pagamento
3. **Sistema** chama `payment-notifications` function
4. **Edge Function** busca dados do cliente (não admins)
5. **Sistema** envia notificação apenas para o cliente
6. **Webhook** `notificatfoe` recebe dados para envio de email

## 🔧 **Configuração**

### **Variáveis de Ambiente Necessárias**
- `PROJECT_URL`: URL do projeto Supabase
- `SERVICE_ROLE_KEY`: Chave de service role do Supabase
- `VITE_SUPABASE_URL`: URL do Supabase (frontend)

### **Permissões Necessárias**
- **Service Role**: Acesso completo às tabelas `profiles` e `payments`
- **Edge Function**: Permissão para chamar outras edge functions
- **Frontend**: Token de autenticação do usuário

## 📊 **Destinatários das Notificações**

### **Novos Pagamentos (Stripe/Zelle)**
- ✅ **admin**: Administradores do sistema
- ✅ **authenticator**: Responsáveis pela autenticação de documentos
- ✅ **finance**: Responsáveis financeiros

### **Pagamentos Zelle que Precisam Revisão Manual**
- ✅ **admin**: Administradores do sistema
- ✅ **authenticator**: Responsáveis pela autenticação de documentos
- ✅ **finance**: Responsáveis financeiros

### **Aprovação/Rejeição de Pagamentos Zelle**
- ✅ **customer**: Apenas o cliente que fez o pagamento

### **Busca de Destinatários**
```sql
-- Para novos pagamentos e Zelle que precisa revisão manual
SELECT id, name, email, role 
FROM profiles 
WHERE role IN ('admin', 'authenticator', 'finance')

-- Para aprovação/rejeição
SELECT id, name, email, role 
FROM profiles 
WHERE id = 'user_id_do_cliente'
```

## 🚨 **Tratamento de Erros**

### **Estratégia de Fallback**
- **Erro na edge function**: Log do erro, não falha o processo principal
- **Erro no webhook externo**: Log do erro, continua com outros destinatários
- **Dados incompletos**: Usa valores padrão quando possível

### **Logs de Debug**
- **Payload enviado**: Log completo do payload para troubleshooting
- **Respostas do webhook**: Status e conteúdo das respostas
- **Contadores**: Sucessos e falhas por tentativa

## 🔍 **Monitoramento**

### **Métricas Disponíveis**
- **recipients_notified**: Quantidade de notificações enviadas com sucesso
- **recipients_failed**: Quantidade de notificações que falharam
- **results**: Array detalhado com resultado por destinatário

### **Como Monitorar**
1. **Logs da Edge Function**: `supabase functions logs payment-notifications`
2. **Logs do Stripe Webhook**: `supabase functions logs stripe-webhook`
3. **Console do Frontend**: Logs de debug nas páginas de pagamento

## 🧪 **Como Testar**

### **Teste Stripe**
1. Fazer um pagamento teste via Stripe
2. Verificar logs do `stripe-webhook`
3. Confirmar chamada para `payment-notifications`
4. Verificar recebimento no webhook `notificatfoe`

### **Teste Zelle**
1. Fazer upload de comprovante Zelle
2. Verificar logs do `ZelleCheckout.tsx`
3. Confirmar chamada para `payment-notifications`
4. Verificar recebimento no webhook `notificatfoe`

### **Teste Aprovação/Rejeição**
1. Aprovar ou rejeitar pagamento Zelle no admin
2. Verificar logs do `ZelleReceiptsAdmin.tsx`
3. Confirmar chamada para `payment-notifications`
4. Verificar recebimento no webhook `notificatfoe`

## 📝 **Exemplo de Uso**

### **Chamar a Edge Function Diretamente**
```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/payment-notifications`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`
  },
  body: JSON.stringify({
    payment_id: 'uuid-do-pagamento',
    user_id: 'uuid-do-usuario',
    document_id: 'uuid-do-documento',
    payment_method: 'stripe', // ou 'zelle'
    amount: 50.00,
    filename: 'documento.pdf',
    notification_type: 'payment_received' // ou 'payment_approved', 'payment_rejected'
  })
});
```

## 🔄 **Deploy**

### **Comandos para Deploy**
```bash
# Deploy da nova edge function
supabase functions deploy payment-notifications

# Deploy das edge functions atualizadas
supabase functions deploy stripe-webhook

# Verificar status
supabase functions list
```

## ✅ **Status da Implementação**

- ✅ **Edge Function criada**: `payment-notifications/index.ts`
- ✅ **Stripe webhook atualizado**: Integração com nova function
- ✅ **Zelle checkout atualizado**: Criação de pagamento e notificação
- ✅ **Admin receipts atualizado**: Aprovação e rejeição via nova function
- ✅ **Endpoint configurado**: `https://nwh.thefutureofenglish.com/webhook/notificatfoe`
- ✅ **Payload padronizado**: Inclui todos os dados solicitados
- ✅ **Suporte multi-role**: Admin, authenticator e finance
- ✅ **Tratamento de erros**: Logs e fallbacks implementados

**Sistema completo e pronto para uso!** 🎉
