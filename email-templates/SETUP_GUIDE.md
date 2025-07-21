# 📧 Configuração dos Templates de Email no Supabase

## 🚀 Como Configurar

### 1. Acesse o Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Acesse seu projeto
- Navegue para **Authentication** > **Email Templates**

### 2. Configure o Template de Confirmação de Cadastro

1. **Clique em "Confirm signup"**
2. **Substitua o conteúdo** pelo código do arquivo `confirm-signup.html`
3. **Atualize a URL da logo**:
   ```html
   <!-- Mude esta linha no template -->
   <img src="https://your-domain.com/logo_tfoe.png" alt="The Future of English" class="logo">
   
   <!-- Para sua URL real, por exemplo: -->
   <img src="https://your-app.netlify.app/logo_tfoe.png" alt="The Future of English" class="logo">
   ```
4. **Clique em "Save"**

### 3. Configure o Template de Reset de Senha

1. **Clique em "Reset password"**
2. **Substitua o conteúdo** pelo código do arquivo `reset-password.html`
3. **Atualize a URL da logo** (mesmo processo acima)
4. **Clique em "Save"**

## 🔧 Personalizações Importantes

### URLs que você precisa atualizar:

1. **Logo do projeto**:
   ```html
   <img src="https://your-domain.com/logo_tfoe.png" alt="The Future of English" class="logo">
   ```

2. **Links do footer**:
   ```html
   <a href="https://thefutureofenglish.com">Website</a>
   <a href="mailto:support@thefutureofenglish.com">Support</a>
   <a href="https://thefutureofenglish.com/privacy">Privacy Policy</a>
   ```

3. **Email de suporte**:
   ```html
   support@thefutureofenglish.com
   ```

## 📋 Checklist de Configuração

- [ ] Template de confirmação configurado
- [ ] Template de reset de senha configurado
- [ ] URL da logo atualizada
- [ ] Links do footer atualizados
- [ ] Email de suporte atualizado
- [ ] Templates salvos no Supabase

## 🎨 Características dos Templates

### ✅ **Template de Confirmação:**
- Logo do projeto no cabeçalho
- Mensagem de boas-vindas personalizada
- Lista de funcionalidades do sistema
- Botão de confirmação destacado
- Informações de segurança
- Footer com links úteis

### ✅ **Template de Reset de Senha:**
- Logo do projeto no cabeçalho
- Instruções claras de segurança
- Passo a passo do processo
- Avisos de segurança
- Informações de suporte
- Footer profissional

## 🔒 Variáveis do Supabase

Os templates usam a variável `{{ .ConfirmationURL }}` que o Supabase substitui automaticamente pelo link real de confirmação/reset.

## 📱 Responsividade

Os templates são totalmente responsivos e funcionam bem em:
- Desktop
- Tablet
- Mobile

## 🎯 Resultado Final

Após a configuração, seus usuários receberão emails profissionais com:
- Branding consistente
- Informações claras
- Design moderno
- Instruções detalhadas
- Links de suporte

---

**💡 Dica:** Teste os templates enviando um email de teste para você mesmo antes de usar em produção! 