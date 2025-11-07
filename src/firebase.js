import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';

// 🔥 CONFIGURAÇÃO DO FIREBASE
// ⚠️ IMPORTANTE: Substitua pelos seus dados do Firebase Console
// 👉 Acesse: https://console.firebase.google.com/
// 1. Crie um projeto
// 2. Ative Authentication (Google + Email/Password)
// 3. Ative Firestore Database (modo teste)
// 4. Copie as configs abaixo em: Project Settings > General > Your apps

const firebaseConfig = {
  apiKey: "AIzaSyDtoJSAQV3yf_opvLT4cavdO19OJ4PhXo4",
  authDomain: "fiinanceflow.firebaseapp.com",
  projectId: "fiinanceflow",
  storageBucket: "fiinanceflow.firebasestorage.app",
  messagingSenderId: "609048037253",
  appId: "1:609048037253:web:af05d119d6bb015e5266ec",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// 🔐 FUNÇÕES DE AUTENTICAÇÃO
export const loginComGoogle = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
    // O resultado será capturado após o redirect usando getRedirectResult
  } catch (error) {
    console.error("Erro ao fazer login com Google:", error);
    throw error;
  }
};

// Função para capturar o resultado do redirect após login com Google
export const verificarRedirectLogin = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Erro ao verificar redirect:", error);
    throw error;
  }
};

export const loginComEmail = async (email, senha) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, senha);
    return result.user;
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    throw error;
  }
};

export const registrarComEmail = async (email, senha) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, senha);
    return result.user;
  } catch (error) {
    console.error("Erro ao registrar:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    throw error;
  }
};

export const observarAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// 💾 FUNÇÕES DE DATABASE (CONTAS)
export const salvarConta = async (userId, conta) => {
  try {
    const contaRef = doc(db, 'users', userId, 'contas', conta.id.toString());
    await setDoc(contaRef, conta);
    return conta;
  } catch (error) {
    console.error("Erro ao salvar conta:", error);
    throw error;
  }
};

export const buscarContas = async (userId) => {
  try {
    const contasRef = collection(db, 'users', userId, 'contas');
    const snapshot = await getDocs(contasRef);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    return [];
  }
};

export const observarContas = (userId, callback) => {
  const contasRef = collection(db, 'users', userId, 'contas');
  return onSnapshot(contasRef, (snapshot) => {
    const contas = snapshot.docs.map(doc => doc.data());
    callback(contas);
  });
};

export const deletarConta = async (userId, contaId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'contas', contaId.toString()));
  } catch (error) {
    console.error("Erro ao deletar conta:", error);
    throw error;
  }
};

// 💳 FUNÇÕES DE DATABASE (CARTÕES)
export const salvarCartao = async (userId, cartao) => {
  try {
    const cartaoRef = doc(db, 'users', userId, 'cartoes', cartao.id.toString());
    await setDoc(cartaoRef, cartao);
    return cartao;
  } catch (error) {
    console.error("Erro ao salvar cartão:", error);
    throw error;
  }
};

export const buscarCartoes = async (userId) => {
  try {
    const cartoesRef = collection(db, 'users', userId, 'cartoes');
    const snapshot = await getDocs(cartoesRef);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Erro ao buscar cartões:", error);
    return [];
  }
};

export const observarCartoes = (userId, callback) => {
  const cartoesRef = collection(db, 'users', userId, 'cartoes');
  return onSnapshot(cartoesRef, (snapshot) => {
    const cartoes = snapshot.docs.map(doc => doc.data());
    callback(cartoes);
  });
};

// 💸 FUNÇÕES DE DATABASE (TRANSAÇÕES)
export const salvarTransacao = async (userId, transacao) => {
  try {
    const transacaoRef = doc(db, 'users', userId, 'transacoes', transacao.id.toString());
    await setDoc(transacaoRef, transacao);
    return transacao;
  } catch (error) {
    console.error("Erro ao salvar transação:", error);
    throw error;
  }
};

export const buscarTransacoes = async (userId) => {
  try {
    const transacoesRef = collection(db, 'users', userId, 'transacoes');
    const q = query(transacoesRef, orderBy('data', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return [];
  }
};

export const observarTransacoes = (userId, callback) => {
  const transacoesRef = collection(db, 'users', userId, 'transacoes');
  const q = query(transacoesRef, orderBy('data', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const transacoes = snapshot.docs.map(doc => doc.data());
    callback(transacoes);
  });
};

export const deletarTransacao = async (userId, transacaoId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'transacoes', transacaoId.toString()));
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    throw error;
  }
};

export const deletarCartao = async (userId, cartaoId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'cartoes', cartaoId.toString()));
  } catch (error) {
    console.error("Erro ao deletar cartão:", error);
    throw error;
  }
};

// 🧾 FUNÇÕES DE DATABASE (FATURAS)
export const salvarFatura = async (userId, fatura) => {
  try {
    const faturaRef = doc(db, 'users', userId, 'faturas', fatura.id.toString());
    await setDoc(faturaRef, fatura);
    return fatura;
  } catch (error) {
    console.error("Erro ao salvar fatura:", error);
    throw error;
  }
};

export const buscarFaturas = async (userId) => {
  try {
    const faturasRef = collection(db, 'users', userId, 'faturas');
    const snapshot = await getDocs(faturasRef);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Erro ao buscar faturas:", error);
    return [];
  }
};

export const observarFaturas = (userId, callback) => {
  const faturasRef = collection(db, 'users', userId, 'faturas');
  return onSnapshot(faturasRef, (snapshot) => {
    const faturas = snapshot.docs.map(doc => doc.data());
    callback(faturas);
  });
};

export { auth, db };
