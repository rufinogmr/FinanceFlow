import { useEffect, useState } from 'react';
import {
  observarContas,
  observarCartoes,
  observarTransacoes,
  observarFaturas,
  observarMetas,
  observarOrcamentos,
  observarDespesasRecorrentes,
  salvarConta,
  salvarCartao,
  salvarTransacao,
  salvarFatura,
  salvarMeta,
  salvarOrcamento,
  salvarDespesaRecorrente,
  deletarConta,
  deletarMeta,
  deletarOrcamento,
  deletarDespesaRecorrente
} from './firebase';

// Hook para gerenciar dados do usuário com Firebase
export const useFirebaseData = (userId) => {
  const [contas, setContas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [faturas, setFaturas] = useState([]);
  const [metas, setMetas] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [despesasRecorrentes, setDespesasRecorrentes] = useState([]);
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
    });

    const unsubMetas = observarMetas(userId, (data) => {
      setMetas(data);
    });

    const unsubOrcamentos = observarOrcamentos(userId, (data) => {
      setOrcamentos(data);
    });

    const unsubDespesasRecorrentes = observarDespesasRecorrentes(userId, (data) => {
      setDespesasRecorrentes(data);
      setCarregando(false);
    });

    // Cleanup: cancela observadores ao desmontar
    return () => {
      unsubContas();
      unsubCartoes();
      unsubTransacoes();
      unsubFaturas();
      unsubMetas();
      unsubOrcamentos();
      unsubDespesasRecorrentes();
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

  const adicionarMeta = async (meta) => {
    await salvarMeta(userId, meta);
  };

  const atualizarMeta = async (meta) => {
    await salvarMeta(userId, meta);
  };

  const removerMeta = async (metaId) => {
    await deletarMeta(userId, metaId);
  };

  const adicionarOrcamento = async (orcamento) => {
    await salvarOrcamento(userId, orcamento);
  };

  const atualizarOrcamento = async (orcamento) => {
    await salvarOrcamento(userId, orcamento);
  };

  const removerOrcamento = async (orcamentoId) => {
    await deletarOrcamento(userId, orcamentoId);
  };

  const adicionarDespesaRecorrente = async (despesa) => {
    await salvarDespesaRecorrente(userId, despesa);
  };

  const atualizarDespesaRecorrente = async (despesa) => {
    await salvarDespesaRecorrente(userId, despesa);
  };

  const removerDespesaRecorrente = async (despesaId) => {
    await deletarDespesaRecorrente(userId, despesaId);
  };

  return {
    contas,
    cartoes,
    transacoes,
    faturas,
    metas,
    orcamentos,
    despesasRecorrentes,
    carregando,
    adicionarConta,
    atualizarConta,
    removerConta,
    adicionarCartao,
    atualizarCartao,
    adicionarTransacao,
    atualizarTransacao,
    adicionarFatura,
    atualizarFatura,
    adicionarMeta,
    atualizarMeta,
    removerMeta,
    adicionarOrcamento,
    atualizarOrcamento,
    removerOrcamento,
    adicionarDespesaRecorrente,
    atualizarDespesaRecorrente,
    removerDespesaRecorrente,
    setContas,
    setCartoes,
    setTransacoes,
    setFaturas,
    setMetas,
    setOrcamentos,
    setDespesasRecorrentes
  };
};
