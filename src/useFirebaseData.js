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
  deletarConta,
  deletarTransacao,
  deletarCartao,
  salvarMeta,
  salvarOrcamento,
  salvarDespesaRecorrente,
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

    // Flags para rastrear se cada observador já retornou dados pela primeira vez
    const loaded = {
      contas: false,
      cartoes: false,
      transacoes: false,
      faturas: false,
      metas: false,
      orcamentos: false,
      despesasRecorrentes: false
    };

    const checkAllLoaded = () => {
      if (Object.values(loaded).every(v => v === true)) {
        setCarregando(false);
      }
    };

    // Observadores em tempo real
    const unsubContas = observarContas(userId, (data) => {
      setContas(data);
      if (!loaded.contas) {
        loaded.contas = true;
        checkAllLoaded();
      }
    });

    const unsubCartoes = observarCartoes(userId, (data) => {
      setCartoes(data);
      if (!loaded.cartoes) {
        loaded.cartoes = true;
        checkAllLoaded();
      }
    });

    const unsubTransacoes = observarTransacoes(userId, (data) => {
      setTransacoes(data);
      if (!loaded.transacoes) {
        loaded.transacoes = true;
        checkAllLoaded();
      }
    });

    const unsubFaturas = observarFaturas(userId, (data) => {
      setFaturas(data);
      if (!loaded.faturas) {
        loaded.faturas = true;
        checkAllLoaded();
      }
    });

    const unsubMetas = observarMetas(userId, (data) => {
      setMetas(data);
      if (!loaded.metas) {
        loaded.metas = true;
        checkAllLoaded();
      }
    });

    const unsubOrcamentos = observarOrcamentos(userId, (data) => {
      setOrcamentos(data);
      if (!loaded.orcamentos) {
        loaded.orcamentos = true;
        checkAllLoaded();
      }
    });

    const unsubDespesasRecorrentes = observarDespesasRecorrentes(userId, (data) => {
      setDespesasRecorrentes(data);
      if (!loaded.despesasRecorrentes) {
        loaded.despesasRecorrentes = true;
        checkAllLoaded();
      }
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

  const removerCartao = async (cartaoId) => {
    await deletarCartao(userId, cartaoId);
  };

  const adicionarTransacao = async (transacao) => {
    await salvarTransacao(userId, transacao);
  };

  const atualizarTransacao = async (transacao) => {
    await salvarTransacao(userId, transacao);
  };

  const removerTransacao = async (transacaoId) => {
    await deletarTransacao(userId, transacaoId);
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
    removerCartao,
    adicionarTransacao,
    atualizarTransacao,
    removerTransacao,
    adicionarFatura,
    adicionarFatura, // Já estava aqui
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
