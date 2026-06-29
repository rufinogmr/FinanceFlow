<div align="center">
  <h1>💸 FinanceFlow</h1>
  <p><strong>Dashboard financeiro inteligente com análise de IA (Gemini) e cálculos precisos</strong></p>

  [![React](https://img.shields.io/badge/React-18.2.0-blue?logo=react&logoColor=white)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Node.js](https://img.shields.io/badge/Node.js-BFF-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
  [![Status](https://img.shields.io/badge/Status-Active-success)](#)
  [![License](https://img.shields.io/badge/License-MIT-green)](#)
</div>

<br>

O **FinanceFlow** é uma aplicação web moderna para gestão financeira pessoal. Diferente de gerenciadores comuns, ele utiliza uma arquitetura híbrida com um **BFF (Backend for Frontend)** em Node.js para garantir segurança e integra a inteligência artificial do **Google Gemini** para fornecer análises financeiras automatizadas e personalizadas.

🌐 **Acesse o projeto em produção:** [finance-flow-rose.vercel.app](https://finance-flow-rose.vercel.app)

---

## ✨ Features Principais

- 🤖 **Análise com IA (Gemini):** O sistema analisa suas receitas e despesas do mês e gera insights automáticos sobre seus hábitos de consumo.
- 🧮 **Cálculos Precisos:** Utiliza a biblioteca `decimal.js` para garantir 100% de precisão em cálculos financeiros, evitando os clássicos erros de ponto flutuante do JavaScript.
- 📊 **Exportação Profissional:** Geração de relatórios em Excel (`.xlsx`) com formatação monetária (BRL), cores por categoria e totais automáticos (via `exceljs`).
- 🔐 **Autenticação Segura:** Integração com Firebase Authentication e validação via Firebase Admin SDK no backend.
- 🧪 **Testado e Validado:** Mais de 40 testes unitários cobrindo toda a lógica de negócio financeira (saldos, faturas, status).

---

## 🏗️ Arquitetura e Stack Tecnológica

O projeto foi construído separando claramente as responsabilidades entre Frontend e Backend:

### Frontend (Client)
- **React 18** + **Vite** para renderização ultra-rápida.
- **Tailwind CSS** para estilização responsiva e moderna.
- **Lucide React** para iconografia.

### Backend (BFF - Backend for Frontend)
Localizado na pasta `/api`, atua como intermediário seguro:
- **Node.js** + **Express** para criação da API REST.
- **Google Generative AI SDK** para integração com o Gemini 1.5 Flash.
- **Firebase Admin** para validação de tokens JWT.
- **Zod** para validação de esquemas de dados.

---

## 📸 Preview

*(Adicione aqui screenshots do seu dashboard, do painel de IA e da tela de exportação)*
> `![Dashboard Preview](docs/screenshot-dashboard.png)`
> `![AI Analysis Preview](docs/screenshot-ai.png)`

---

## 🚀 Como Instalar e Rodar Localmente

### Pré-requisitos
- Node.js (v18+)
- Conta no Firebase (para autenticação)
- Chave de API do Google Gemini (gratuita)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/rufinogmr/FinanceFlow.git
   cd FinanceFlow
   ```

2. **Configure as variáveis de ambiente:**
   - Copie o arquivo `.env.example` para `.env` na raiz do projeto.
   - Preencha com suas credenciais do Firebase e do Gemini.

3. **Instale as dependências e rode o Frontend:**
   ```bash
   npm install
   npm run dev
   ```

4. **Em outro terminal, instale e rode o Backend (BFF):**
   ```bash
   cd api
   npm install
   npm run dev
   ```

5. **Acesse no navegador:** `http://localhost:5173`

---

## 🧪 Rodando os Testes

A lógica financeira do app foi extraída para funções puras em `src/financeLogic.js` e possui alta cobertura de testes.

```bash
# Rodar todos os testes
npm run test

# Rodar em modo watch (desenvolvimento)
npm run test:watch
```

---

## 🤝 Como Contribuir

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeatureIncrivel`)
3. Faça o commit das suas alterações (`git commit -m 'feat: Adiciona MinhaFeatureIncrivel'`)
4. Faça o push para a branch (`git push origin feature/MinhaFeatureIncrivel`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Sinta-se livre para usar, modificar e distribuir.

---
<div align="center">
  <p>Desenvolvido com ☕ e 🤖 por <a href="https://github.com/rufinogmr">Guilherme Rufino</a></p>
</div>
