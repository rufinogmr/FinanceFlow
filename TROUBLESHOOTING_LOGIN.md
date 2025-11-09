# 🔧 Guia de Solução de Problemas - Login no FinanceFlow

## ✅ Melhorias Implementadas

Adicionei as seguintes melhorias no sistema de login:

1. **Validações Aprimoradas**
   - Validação de formato de email
   - Validação de força de senha
   - Mensagens de erro mais específicas

2. **Feedback Visual**
   - Indicador de força de senha (Fraca/Média/Forte)
   - Botão para mostrar/ocultar senha
   - Mensagens de erro detalhadas com emojis

3. **Logs Detalhados**
   - Console logs para debug
   - Rastreamento de erros específicos do Firebase

---

## 🚨 Problemas Comuns e Soluções

### 1️⃣ "Usuário não encontrado"

**Problema:** Você está tentando fazer login mas não criou uma conta ainda.

**Solução:**
- Clique em "Não tem conta? Criar agora"
- Preencha email e senha (mínimo 6 caracteres)
- Clique em "Criar Conta"
- Depois faça login normalmente

---

### 2️⃣ "Senha incorreta"

**Problema:** A senha digitada não corresponde à conta.

**Solução:**
- Verifique se está digitando a senha correta
- Use o botão 👁️ (olho) para ver a senha digitada
- Se esqueceu a senha, será necessário criar nova conta (ainda não há recuperação de senha)

---

### 3️⃣ "Email inválido"

**Problema:** O formato do email está incorreto.

**Solução:**
- Use o formato: `seuemail@exemplo.com`
- Verifique se não há espaços extras
- Use um provedor válido (gmail.com, outlook.com, etc.)

---

### 4️⃣ "Domínio não autorizado" (Login com Google)

**Problema:** O domínio do seu site não está autorizado no Firebase.

**Solução:**
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto "fiinanceflow"
3. Vá em **Authentication** → **Settings** → **Authorized domains**
4. Adicione o domínio onde seu app está rodando:
   - `localhost` (para desenvolvimento)
   - Seu domínio de produção (ex: `seusite.com`)

---

### 5️⃣ "Erro de conexão / Network error"

**Problema:** Problema de internet ou CORS.

**Solução:**
1. Verifique sua conexão com a internet
2. Se estiver em localhost, reinicie o servidor:
   ```bash
   npm run dev
   ```
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Tente outro navegador

---

### 6️⃣ "Muitas tentativas"

**Problema:** Firebase bloqueou temporariamente por segurança.

**Solução:**
- Aguarde 15-30 minutos
- Tente novamente depois
- Use login com Google como alternativa

---

## 🔍 Como Verificar Erros no Console

1. **Abra o Console do Navegador:**
   - Chrome/Edge: Pressione `F12` ou `Ctrl+Shift+I`
   - Firefox: Pressione `F12`
   - Safari: `Cmd+Option+I`

2. **Vá para a aba "Console"**

3. **Tente fazer login novamente**

4. **Procure por mensagens em vermelho** como:
   - `auth/user-not-found` → Usuário não existe
   - `auth/wrong-password` → Senha errada
   - `auth/network-request-failed` → Problema de internet
   - `auth/unauthorized-domain` → Domínio não autorizado

---

## ⚙️ Verificar Configuração do Firebase

### ✅ Checklist de Configuração

1. **Authentication habilitado:**
   - Acesse [Firebase Console](https://console.firebase.google.com/)
   - Projeto: `fiinanceflow`
   - Menu lateral: **Authentication**
   - Certifique-se que **Email/Password** está ATIVO
   - Certifique-se que **Google** está ATIVO

2. **Firestore Database criado:**
   - Menu lateral: **Firestore Database**
   - Se não existir, clique em "Create database"
   - Escolha modo **Test mode** (para desenvolvimento)
   - Região: escolha a mais próxima (ex: southamerica-east1)

3. **Regras de segurança (temporárias para teste):**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

---

## 🧪 Teste Passo a Passo

### Criar Primeira Conta (Teste):

1. Acesse a aplicação
2. Clique em "Não tem conta? Criar agora"
3. Digite: `teste@teste.com`
4. Digite senha: `senha123`
5. Clique em "Criar Conta"
6. Você deve ser logado automaticamente

### Fazer Login:

1. Se não estiver logado, na tela de login:
2. Digite: `teste@teste.com`
3. Digite senha: `senha123`
4. Clique em "Entrar"
5. Você deve entrar no app principal

---

## 🔐 Segurança - Próximos Passos

### ⚠️ IMPORTANTE para Produção:

As credenciais do Firebase estão EXPOSTAS no código fonte. Antes de colocar em produção:

1. **Mover credenciais para variáveis de ambiente:**
   ```bash
   # Criar arquivo .env
   VITE_FIREBASE_API_KEY=seu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
   # ... etc
   ```

2. **Atualizar firebase.js:**
   ```javascript
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     // ...
   };
   ```

3. **Configurar Firebase Security Rules:**
   - Restrinjir acesso apenas a usuários autenticados
   - Validar dados no servidor
   - Implementar rate limiting

---

## 📞 Ainda com Problemas?

Se ainda está tendo problemas, compartilhe:

1. **Mensagem de erro completa** do console (F12)
2. **Método de login** que está usando (Google ou Email)
3. **Se é login ou criação de conta**
4. **Print da tela de erro** (se possível)

Dessa forma consigo te ajudar de forma mais específica!

---

## 📝 Comandos Úteis

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Limpar cache e reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Ver logs do Firebase
# Abra o Console do navegador (F12) e vá na aba Console
```

---

**Última atualização:** 08/11/2025
**Versão:** 1.0
