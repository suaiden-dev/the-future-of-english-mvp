# Atualização: Destinatários das Notificações de Pagamento

## 📋 **Mudança Implementada**

Ajustei o sistema de notificações para que **apenas o cliente** receba notificações quando um admin aprova ou rejeita um pagamento Zelle.

## 🎯 **Comportamento Atualizado**

### **Novos Pagamentos (Stripe/Zelle)**
- ✅ **Destinatários**: Todos os admins, autenticadores e finance
- ✅ **Quando**: Após pagamento bem-sucedido ou upload de comprovante
- ✅ **Objetivo**: Notificar a equipe sobre novo pagamento

### **Pagamentos Zelle que Precisam Revisão Manual**
- ✅ **Destinatários**: Todos os admins, autenticadores e finance
- ✅ **Quando**: Comprovante Zelle é inválido e precisa revisão manual
- ✅ **Objetivo**: Notificar a equipe para revisar o comprovante

### **Aprovação/Rejeição de Pagamentos Zelle**
- ✅ **Destinatário**: Apenas o cliente que fez o pagamento
- ✅ **Quando**: Admin aprova ou rejeita pagamento Zelle
- ✅ **Objetivo**: Informar o cliente sobre a decisão

## 🔄 **Fluxos Atualizados**

### **Fluxo de Aprovação Zelle**
1. **Admin** acessa Finance Dashboard → Zelle Receipts
2. **Admin** clica em "Approve Payment"
3. **Sistema** atualiza status do pagamento para "verified"
4. **Sistema** chama `payment-notifications` function
5. **Edge Function** busca dados do cliente (não admins)
6. **Sistema** envia notificação apenas para o cliente
7. **Cliente** recebe email informando que o pagamento foi aprovado

### **Fluxo de Rejeição Zelle**
1. **Admin** acessa Finance Dashboard → Zelle Receipts
2. **Admin** clica em "Reject Payment" e informa motivo
3. **Sistema** atualiza status do pagamento para "rejected"
4. **Sistema** chama `payment-notifications` function
5. **Edge Function** busca dados do cliente (não admins)
6. **Sistema** envia notificação apenas para o cliente
7. **Cliente** recebe email informando que o pagamento foi rejeitado

### **Fluxo de Revisão Manual Zelle**
1. **Cliente** faz upload de comprovante Zelle
2. **Sistema** valida comprovante automaticamente
3. **Sistema** detecta que comprovante é inválido
4. **Sistema** atualiza status para "pending_manual_review"
5. **Sistema** chama `payment-notifications` function
6. **Edge Function** busca admins/autenticadores
7. **Sistema** envia notificação para toda a equipe
8. **Admins/Autenticadores** recebem email para revisar comprovante

## 📧 **Payloads de Notificação**

### **Para Novos Pagamentos (Admins/Autenticadores)**
```json
{
  "user_name": "Nome do cliente que pagou",
  "user_email": "admin@empresa.com",
  "notification_type": "Payment Stripe | Payment Zelle",
  "client_name": "Nome do cliente",
  "client_phone": "Telefone do cliente",
  "payment_amount": 50.00,
  "recipient_role": "admin | authenticator | finance"
}
```

### **Para Pagamentos Zelle que Precisam Revisão Manual (Admins/Autenticadores)**
```json
{
  "user_name": "Nome do cliente que pagou",
  "user_email": "admin@empresa.com",
  "notification_type": "Payment Zelle",
  "client_name": "Nome do cliente",
  "client_phone": "Telefone do cliente",
  "payment_amount": 50.00,
  "status": "comprovante requer revisão manual",
  "recipient_role": "admin | authenticator | finance"
}
```

### **Para Aprovação/Rejeição (Cliente)**
```json
{
  "user_name": "Nome do cliente",
  "user_email": "cliente@email.com",
  "notification_type": "Payment Approved | Payment Rejected",
  "client_name": "Nome do cliente",
  "client_phone": "Telefone do cliente",
  "payment_amount": 50.00,
  "recipient_role": "customer"
}
```

## 🔧 **Código Atualizado**

### **Edge Function: payment-notifications/index.ts**
- ✅ **Lógica condicional**: Diferentes destinatários baseado no tipo
- ✅ **Busca de cliente**: Para aprovação/rejeição
- ✅ **Busca de admins**: Para novos pagamentos
- ✅ **Payloads personalizados**: Dados apropriados para cada tipo

### **Arquivos Modificados**
- ✅ `supabase/functions/payment-notifications/index.ts`
- ✅ `PAYMENT_NOTIFICATIONS_SYSTEM.md` (documentação atualizada)

## 🧪 **Como Testar**

### **Teste de Aprovação**
1. Fazer upload de comprovante Zelle
2. Acessar Finance Dashboard → Zelle Receipts
3. Aprovar o pagamento
4. **Verificar**: Apenas o cliente deve receber notificação

### **Teste de Rejeição**
1. Fazer upload de comprovante Zelle
2. Acessar Finance Dashboard → Zelle Receipts
3. Rejeitar o pagamento com motivo
4. **Verificar**: Apenas o cliente deve receber notificação

### **Teste de Novo Pagamento**
1. Fazer pagamento via Stripe ou Zelle
2. **Verificar**: Admins e autenticadores devem receber notificação

### **Teste de Revisão Manual Zelle**
1. Fazer upload de comprovante Zelle inválido
2. **Verificar**: Admins e autenticadores devem receber notificação para revisar

## ✅ **Benefícios da Mudança**

- ✅ **Menos spam**: Admins não recebem notificações desnecessárias
- ✅ **Foco no cliente**: Cliente é informado diretamente sobre decisões
- ✅ **Eficiência**: Notificações mais direcionadas e relevantes
- ✅ **UX melhorada**: Cliente tem feedback imediato sobre seu pagamento

**Sistema atualizado e otimizado!** 🎉
