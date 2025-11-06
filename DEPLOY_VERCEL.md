# 🚀 Guia de Deploy no Vercel - FinanceFlow

## ✅ Deploy Concluído!

Seu app está no ar, mas precisa de uma configuração final no Firebase.

## ⚠️ Erro: `auth/unauthorized-domain`

Este erro acontece porque o Firebase não reconhece o domínio do Vercel como autorizado.

## 🔧 Solução (2 minutos):

### Passo 1: Identifique seu domínio Vercel

O domínio é algo como:
- `financeflow.vercel.app` ou
- `financeflow-xyz123.vercel.app`

Copie a URL completa da barra de endereço do navegador (sem o `https://`).

### Passo 2: Adicione no Firebase Console

1. **Acesse**: [https://console.firebase.google.com/](https://console.firebase.google.com/)

2. **Selecione o projeto**: `fiinanceflow`

3. **Navegue para**:
   ```
   Authentication → Settings → Authorized domains
   ```

   Ou acesse diretamente:
   ```
   https://console.firebase.google.com/project/fiinanceflow/authentication/settings
   ```

4. **Clique em**: `Add domain`

5. **Cole o domínio**: exemplo `financeflow-xyz123.vercel.app`
   - ⚠️ **NÃO** inclua `https://` ou `http://`
   - ⚠️ **NÃO** inclua `/` no final
   - ✅ Apenas: `seu-app.vercel.app`

6. **Clique em**: `Add`

### Passo 3: Teste

1. Volte para a aplicação no Vercel
2. Recarregue a página (`F5` ou `Ctrl+R`)
3. Tente fazer login com Google novamente

**Pronto! Deve funcionar! ✅**

---

## 🔍 Outros Erros e Soluções

### Favicon 404 (Não é crítico)

```
Failed to load resource: the server responded with a status of 404 () /favicon.ico
```

**Solução**: Adicione um favicon ao projeto:
1. Baixe um ícone `.ico` ou `.png`
2. Coloque na pasta `public/` como `favicon.ico`
3. Atualize o `index.html`:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
```

### Autocomplete Warning

```
Input elements should have autocomplete attributes
```

**Solução**: Adicione autocomplete nos inputs de senha:
```jsx
<input type="password" autocomplete="current-password" />
```

---

## 🎯 Domínios Atuais Autorizados

Verifique se estes domínios já estão autorizados no Firebase:
- ✅ `localhost` (para desenvolvimento)
- ✅ `fiinanceflow.firebaseapp.com` (domínio padrão do Firebase)
- ❓ `seu-dominio.vercel.app` (adicione este!)

---

## 🔐 Configuração de Segurança (Importante!)

### Regras do Firestore

Certifique-se de que suas regras permitem apenas usuários autenticados:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários só podem acessar seus próprios dados
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Para atualizar:
1. Vá em: `Firestore Database → Rules`
2. Cole as regras acima
3. Clique em `Publish`

---

## 🌐 Deploy Contínuo

### Deploy Automático

Cada push na branch `main` fará deploy automático no Vercel!

```bash
git add .
git commit -m "Minha atualização"
git push origin main
```

### Preview Deployments

Cada Pull Request terá uma URL de preview única para testes.

---

## 📞 Problemas?

Se ainda tiver erros:

1. **Limpe o cache do navegador**: `Ctrl+Shift+Delete`
2. **Verifique o console do Firebase**: Vá na aba `Authentication → Users` e veja se há logs de erro
3. **Teste em modo anônimo**: Abra uma janela anônima e teste
4. **Verifique as regras do Firestore**: Certifique-se de que não estão muito restritivas

---

## 🎉 Sucesso!

Depois de adicionar o domínio, seu app estará 100% funcional!

**URL do Firebase Console**: https://console.firebase.google.com/project/fiinanceflow/authentication/settings

Boa sorte! 🚀
