import { useEffect, useState } from 'react';
import { 
  observarContas, 
  observarCartoes, 
  observarTransacoes, 
  observarFaturas,
  salvarConta,
  salvarCartao,
  salvarTransacao,
  salvarFatura,
  deletarConta
} from './firebase';

// Hook para gerenciar dados do usuário com Firebase
export const useFirebaseData = (userId) => {
  const [contas, setContas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCarregando(false);
      return;
    }

    setCarregando(true);

    // Observadores em tempo real
    const unsubContas = observarContas(userId, (data) => {
      setContas(data);
    });

    const unsubCartoes = observarCartoes(userId, (data) => {
      setCartoes(data);
    });

    const unsubTransacoes = observarTransacoes(userId, (data) => {
      setTransacoes(data);
    });

    const unsubFaturas = observarFaturas(userId, (data) => {
      setFaturas(data);
      setCarregando(false);
    });

    // Cleanup: cancela observadores ao desmontar
    return () => {
      unsubContas();
      unsubCartoes();
      unsubTransacoes();
      unsubFaturas();
    };
  }, [userId]);

  // Funções de manipulação de dados
  const adicionarConta = async (conta) => {
    await salvarConta(userId, conta);
  };

  const atualizarConta = async (conta) => {
    await salvarConta(userId, conta);
  };

  const removerConta = async (contaId) => {
    await deletarConta(userId, contaId);
  };

  const adicionarCartao = async (cartao) => {
    await salvarCartao(userId, cartao);
  };

  const atualizarCartao = async (cartao) => {
    await salvarCartao(userId, cartao);
  };

  const adicionarTransacao = async (transacao) => {
    await salvarTransacao(userId, transacao);
  };

  const atualizarTransacao = async (transacao) => {
    await salvarTransacao(userId, transacao);
  };

  const adicionarFatura = async (fatura) => {
    await salvarFatura(userId, fatura);
  };

  const atualizarFatura = async (fatura) => {
    await salvarFatura(userId, fatura);
  };

  return {
    contas,
    cartoes,
    transacoes,
    faturas,
    carregando,
    adicionarConta,
    atualizarConta,
    removerConta,
    adicionarCartao,
    atualizarCartao,
    adicionarTransacao,
    atualizarTransacao,
    adicionarFatura, // Já estava aqui
    atualizarFatura,
    setContas,
    setCartoes,
    setTransacoes,
    setFaturas
  };
};
