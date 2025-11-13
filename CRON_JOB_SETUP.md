# Configuração de Cron Job para Limpeza Automática

## 🚨 **Problema Identificado**

O agendador no frontend (`App.tsx`) só funciona quando o usuário está logado e com a aplicação aberta. Para limpeza automática 24/7, precisamos de um cron job no servidor.

## ✅ **Soluções Implementadas**

### **1. GitHub Actions (Recomendado)**

Criado arquivo `.github/workflows/cleanup-stripe.yml` que executa a cada 2 minutos.

**Para ativar:**
1. Faça commit do arquivo `.github/workflows/cleanup-stripe.yml`
2. Configure a secret `SUPABASE_SERVICE_ROLE_KEY` no GitHub
3. O workflow executará automaticamente a cada 2 minutos

### **2. Cron Job Externo (Alternativa)**

Use um serviço como **cron-job.org** ou **Uptime Robot**:

**URL para chamar:**
```
https://ywpogqwhwscbdhnoqsmv.functions.supabase.co/cleanup-stripe-pending
```

**Método:** POST
**Headers:**
```
Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]
Content-Type: application/json
```

**Body:** `{}`

**Frequência:** A cada 2 minutos

### **3. Servidor Próprio**

Se você tem um servidor, configure um cron job:

```bash
# Editar crontab
crontab -e

# Adicionar linha para executar a cada 2 minutos
*/2 * * * * curl -X POST -H "Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]" -H "Content-Type: application/json" -d "{}" "https://ywpogqwhwscbdhnoqsmv.functions.supabase.co/cleanup-stripe-pending"
```

## 🧪 **Teste Manual**

Para testar se a Edge Function está funcionando:

```bash
curl -X POST \
  -H "Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d "{}" \
  "https://ywpogqwhwscbdhnoqsmv.functions.supabase.co/cleanup-stripe-pending"
```

## 📊 **Monitoramento**

### **Logs da Edge Function:**
- Acesse: Supabase Dashboard > Functions > Logs
- Procure por: `cleanup-stripe-pending`

### **Verificar Documentos:**
```sql
-- Ver documentos stripe_pending
SELECT COUNT(*) as total_stripe_pending
FROM documents 
WHERE status = 'stripe_pending';

-- Ver sessões Stripe pendentes
SELECT COUNT(*) as total_stripe_sessions
FROM stripe_sessions 
WHERE payment_status = 'pending';
```

## ⚠️ **Importante**

1. **Mantenha a `SUPABASE_SERVICE_ROLE_KEY` segura**
2. **Teste antes de ativar em produção**
3. **Monitore os logs regularmente**
4. **Considere aumentar o tempo para 30 minutos em produção**

## 🔄 **Restaurar Tempos de Produção**

Quando terminar os testes, altere os tempos de volta:

1. **Edge Function:** 30 minutos em vez de 2
2. **Cron Job:** A cada 30 minutos em vez de 2
3. **GitHub Actions:** `*/30 * * * *` em vez de `*/2 * * * *`
