import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';

// 🔥 CONFIGURAÇÃO DO FIREBASE
// As credenciais são lidas do arquivo .env (nunca commitar o .env).
// Para configurar: copie .env.example para .env e preencha com seus dados do Firebase Console.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// 🔐 FUNÇÕES DE AUTENTICAÇÃO
export const loginComGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Erro ao fazer login com Google:", error);
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

export const deletarCartao = async (userId, cartaoId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'cartoes', cartaoId.toString()));
  } catch (error) {
    console.error("Erro ao deletar cartão:", error);
    throw error;
  }
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

export const deletarFatura = async (userId, faturaId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'faturas', faturaId.toString()));
  } catch (error) {
    console.error("Erro ao deletar fatura:", error);
    throw error;
  }
};

// 🎯 FUNÇÕES DE DATABASE (METAS)
export const salvarMeta = async (userId, meta) => {
  try {
    const metaRef = doc(db, 'users', userId, 'metas', meta.id.toString());
    await setDoc(metaRef, meta);
    return meta;
  } catch (error) {
    console.error("Erro ao salvar meta:", error);
    throw error;
  }
};

export const buscarMetas = async (userId) => {
  try {
    const metasRef = collection(db, 'users', userId, 'metas');
    const snapshot = await getDocs(metasRef);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Erro ao buscar metas:", error);
    return [];
  }
};

export const observarMetas = (userId, callback) => {
  const metasRef = collection(db, 'users', userId, 'metas');
  return onSnapshot(metasRef, (snapshot) => {
    const metas = snapshot.docs.map(doc => doc.data());
    callback(metas);
  });
};

export const deletarMeta = async (userId, metaId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'metas', metaId.toString()));
  } catch (error) {
    console.error("Erro ao deletar meta:", error);
    throw error;
  }
};

// 💰 FUNÇÕES DE DATABASE (ORÇAMENTOS)
export const salvarOrcamento = async (userId, orcamento) => {
  try {
    const orcamentoRef = doc(db, 'users', userId, 'orcamentos', orcamento.id.toString());
    await setDoc(orcamentoRef, orcamento);
    return orcamento;
  } catch (error) {
    console.error("Erro ao salvar orçamento:", error);
    throw error;
  }
};

export const buscarOrcamentos = async (userId) => {
  try {
    const orcamentosRef = collection(db, 'users', userId, 'orcamentos');
    const snapshot = await getDocs(orcamentosRef);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Erro ao buscar orçamentos:", error);
    return [];
  }
};

export const observarOrcamentos = (userId, callback) => {
  const orcamentosRef = collection(db, 'users', userId, 'orcamentos');
  return onSnapshot(orcamentosRef, (snapshot) => {
    const orcamentos = snapshot.docs.map(doc => doc.data());
    callback(orcamentos);
  });
};

export const deletarOrcamento = async (userId, orcamentoId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'orcamentos', orcamentoId.toString()));
  } catch (error) {
    console.error("Erro ao deletar orçamento:", error);
    throw error;
  }
};

// 🔄 FUNÇÕES DE DATABASE (DESPESAS RECORRENTES)
export const salvarDespesaRecorrente = async (userId, despesa) => {
  try {
    const despesaRef = doc(db, 'users', userId, 'despesasRecorrentes', despesa.id.toString());
    await setDoc(despesaRef, despesa);
    return despesa;
  } catch (error) {
    console.error("Erro ao salvar despesa recorrente:", error);
    throw error;
  }
};

export const buscarDespesasRecorrentes = async (userId) => {
  try {
    const despesasRef = collection(db, 'users', userId, 'despesasRecorrentes');
    const snapshot = await getDocs(despesasRef);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Erro ao buscar despesas recorrentes:", error);
    return [];
  }
};

export const observarDespesasRecorrentes = (userId, callback) => {
  const despesasRef = collection(db, 'users', userId, 'despesasRecorrentes');
  return onSnapshot(despesasRef, (snapshot) => {
    const despesas = snapshot.docs.map(doc => doc.data());
    callback(despesas);
  });
};

export const deletarDespesaRecorrente = async (userId, despesaId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'despesasRecorrentes', despesaId.toString()));
  } catch (error) {
    console.error("Erro ao deletar despesa recorrente:", error);
    throw error;
  }
};

export { auth, db };
