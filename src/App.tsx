import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Search, Filter, MoreVertical, ChevronDown, ChevronRight, Eye, EyeOff, FileText, BarChart3, TrendingUp, CreditCard, Wallet, DollarSign, Calendar, AlertCircle, Bell, LogOut, Tag, X, Target, PieChart, Repeat, CheckCircle, TrendingDown, Edit2, Trash2, Clock } from 'lucide-react';
import LoginScreen from './LoginScreen';
import { observarAuth, logout } from './firebase';
import { useFirebaseData } from './useFirebaseData';
import { importarArquivo } from './importUtils';

// Import Components
import ContasCartoes from './components/ContasCartoes';
import AccountModal from './components/modals/AccountModal';
import CardModal from './components/modals/CardModal';
import TransactionModal from './components/modals/TransactionModal';
import MetaModal from './components/modals/MetaModal';
import BudgetModal from './components/modals/BudgetModal';
import RecurrentExpenseModal from './components/modals/RecurrentExpenseModal';

const FinanceApp = () => {
  // Estado de autenticação
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Observar mudanças de autenticação
  useEffect(() => {
    const unsubscribe = observarAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Se ainda está carregando auth, mostra loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, mostra tela de login
  if (!user) {
    return <LoginScreen onLoginSuccess={(loggedUser) => setUser(loggedUser)} />;
  }

  // Retorna o app principal se autenticado
  return <MainApp user={user} />;
};

const MainApp = ({ user }) => {
  // Hook customizado do Firebase (dados em tempo real)
  const {
    contas,
    cartoes,
    transacoes,
    faturas,
    metas,
    orcamentos,
    despesasRecorrentes,
    carregando: dadosCarregando,
    setContas,
    setCartoes,
    setTransacoes,
    setFaturas,
    setMetas,
    setOrcamentos,
    setDespesasRecorrentes,
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
    atualizarFatura,
    removerFatura,
    adicionarMeta,
    atualizarMeta,
    removerMeta,
    adicionarOrcamento,
    atualizarOrcamento,
    removerOrcamento,
    adicionarDespesaRecorrente,
    atualizarDespesaRecorrente,
    removerDespesaRecorrente
  } = useFirebaseData(user.uid);

  // Efeito para manter saldos sincronizados (Requisito do Usuário: Recalcular sempre)
  useEffect(() => {
    if (dadosCarregando || contas.length === 0) return;

    contas.forEach(conta => {
       const saldoInicial = conta.saldoInicial !== undefined ? parseFloat(conta.saldoInicial) : 0;

       // Filtrar transações desta conta (excluindo logicamente deletadas se houver flag, mas aqui parece que deletar remove do DB)
       // Se o sistema usa soft-delete (deleted: true), precisamos filtrar.
       // O código anterior usava `deleted: true` em alguns lugares. Vamos filtrar por segurança.
       const transacoesConta = transacoes.filter(t =>
         t.contaId === conta.id &&
         t.status === 'confirmado' && // Apenas confirmadas afetam saldo? Geralmente sim.
         !t.deleted // Caso use soft delete
       );

       const receitas = transacoesConta
         .filter(t => t.tipo === 'receita')
         .reduce((acc, t) => acc + t.valor, 0);

       const despesas = transacoesConta
         .filter(t => t.tipo === 'despesa')
         .reduce((acc, t) => acc + t.valor, 0);

       const saldoCalculado = saldoInicial + receitas - despesas;

       // Se houver discrepância (com margem para erro de ponto flutuante), atualiza no banco
       if (Math.abs(conta.saldo - saldoCalculado) > 0.01) {
         // Atualiza silenciosamente para não causar re-render loop infinito (Firebase listener vai disparar, mas se o valor for o mesmo...)
         // Espera, se atualizarmos, o listener dispara, contas muda, effect roda de novo.
         // A checagem `Math.abs` previne o loop se o valor convergiu.
         atualizarConta({ ...conta, saldo: saldoCalculado });
       }
    });
  }, [transacoes, contas, dadosCarregando]); // Depende de transacoes e contas

  const [activeTab, setActiveTab] = useState('visao-geral');
  const [mostrarSaldos, setMostrarSaldos] = useState(true);
  const [filtroTransacoes, setFiltroTransacoes] = useState('todos');
  const [expandedCard, setExpandedCard] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [tipoModal, setTipoModal] = useState('');
  const [contextoModal, setContextoModal] = useState(''); // 'conta' ou 'cartao'
  const [formData, setFormData] = useState({});
  const [transacaoSelecionada, setTransacaoSelecionada] = useState(null);
  const [modalPagamento, setModalPagamento] = useState(null);
  const [modalImportacao, setModalImportacao] = useState(false);
  const [arquivoImportacao, setArquivoImportacao] = useState(null);
  const [transacoesImportadas, setTransacoesImportadas] = useState([]);
  const [importandoArquivo, setImportandoArquivo] = useState(false);

  // Estados para seleção múltipla (usados em ContasCartoes mas elevados se necessário)
  // No refactor, ContasCartoes gerencia seu proprio estado de selecao, mas App gerencia `transacoes` globalmente.

  // Estados para faturas
  // const [faturaSelecionada, setFaturaSelecionada] = useState(null); // Unused in original

  // Estados para contas
  const [menuContaAberto, setMenuContaAberto] = useState(null);
  const [contaSelecionada, setContaSelecionada] = useState(null);

  // ==================== FUNÇÕES DE DESPESAS RECORRENTES ====================

  /**
   * Efetiva o pagamento de uma despesa recorrente
   * Cria uma transação automaticamente e atualiza a próxima data
   */
  const efetivarPagamentoDespesa = async (despesa) => {
    try {
      // Criar transação baseada na despesa recorrente
      const novaTransacao = {
        id: Date.now(),
        descricao: despesa.descricao,
        valor: despesa.valor,
        tipo: 'despesa',
        categoria: despesa.categoria,
        data: new Date().toISOString().split('T')[0],
        status: 'confirmado',
        contaId: despesa.contaId || null,
        tags: ['despesa-recorrente']
      };

      await adicionarTransacao(novaTransacao);
      // Saldo será atualizado automaticamente pelo useEffect

      // Calcular próxima data baseado na frequência
      const dataAtual = new Date(despesa.proximaData);
      let proximaData;

      switch (despesa.frequencia) {
        case 'diaria':
          proximaData = new Date(dataAtual.setDate(dataAtual.getDate() + 1));
          break;
        case 'semanal':
          proximaData = new Date(dataAtual.setDate(dataAtual.getDate() + 7));
          break;
        case 'mensal':
          proximaData = new Date(dataAtual.setMonth(dataAtual.getMonth() + 1));
          break;
        case 'anual':
          proximaData = new Date(dataAtual.setFullYear(dataAtual.getFullYear() + 1));
          break;
        default:
          proximaData = new Date(dataAtual.setMonth(dataAtual.getMonth() + 1));
      }

      // Atualizar despesa recorrente com nova data
      await atualizarDespesaRecorrente({
        ...despesa,
        proximaData: proximaData.toISOString().split('T')[0]
      });

      alert(`Pagamento de "${despesa.descricao}" efetuado com sucesso!\nPróxima cobrança: ${proximaData.toLocaleDateString('pt-BR')}`);

    } catch (error) {
      console.error('Erro ao efetivar pagamento:', error);
      alert('Erro ao efetivar pagamento. Tente novamente.');
    }
  };

  // ==================== FUNÇÕES UTILITÁRIAS DE CICLO DE FATURA ====================

  /**
   * Calcula o período da fatura baseado no dia de fechamento
   * Retorna { dataInicio, dataFim, dataVencimento, mesReferencia }
   */
  const calcularPeriodoFatura = (cartao, dataReferencia = new Date()) => {
    const hoje = new Date(dataReferencia);
    const diaFechamento = cartao.diaFechamento;
    const diaVencimento = cartao.diaVencimento;

    let dataFim, dataInicio, dataVencimento;

    // Se ainda não passou o fechamento deste mês, a fatura atual vai do mês passado até este mês
    if (hoje.getDate() <= diaFechamento) {
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), diaFechamento);
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, diaFechamento + 1);
      dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
    } else {
      // Se já passou o fechamento, a fatura atual vai deste mês até o próximo
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaFechamento);
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), diaFechamento + 1);
      dataVencimento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
    }

    // Se vencimento é menor que fechamento, vencimento é no mês seguinte ao fechamento
    if (diaVencimento < diaFechamento) {
      dataVencimento = new Date(dataFim.getFullYear(), dataFim.getMonth() + 1, diaVencimento);
    }

    const mesReferencia = `${dataFim.getFullYear()}-${String(dataFim.getMonth() + 1).padStart(2, '0')}`;

    return {
      dataInicio: dataInicio.toISOString().split('T')[0],
      dataFim: dataFim.toISOString().split('T')[0],
      dataVencimento: dataVencimento.toISOString().split('T')[0],
      mesReferencia
    };
  };

  /**
   * Determina em qual fatura uma transação se enquadra
   */
  const determinarFaturaTransacao = (transacao, cartao) => {
    const dataTransacao = new Date(transacao.data);
    const diaFechamento = cartao.diaFechamento;

    let mesReferencia;

    // Se a transação foi antes do fechamento, vai para a fatura do mês atual
    if (dataTransacao.getDate() <= diaFechamento) {
      mesReferencia = `${dataTransacao.getFullYear()}-${String(dataTransacao.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // Se foi depois do fechamento, vai para a fatura do próximo mês
      const proximoMes = new Date(dataTransacao.getFullYear(), dataTransacao.getMonth() + 1, 1);
      mesReferencia = `${proximoMes.getFullYear()}-${String(proximoMes.getMonth() + 1).padStart(2, '0')}`;
    }

    return mesReferencia;
  };

  /**
   * Calcula o status de uma fatura
   */
  const calcularStatusFatura = (fatura) => {
    if (fatura.pago) return 'paga';

    const hoje = new Date();
    const vencimento = new Date(fatura.dataVencimento);
    const fechamento = new Date(fatura.dataFechamento);

    if (hoje > vencimento) return 'vencida';
    if (hoje > fechamento) return 'fechada';
    return 'aberta';
  };

  /**
   * Calcula o total de uma fatura baseado nas transações do período
   */
  const calcularTotalFaturaCompleto = (cartaoId, periodo) => {
    const transacoesCartao = transacoes.filter(t => {
      if (t.cartaoId !== cartaoId) return false;
      if (t.categoria === 'Fatura Cartão') return false; // Não incluir pagamentos de fatura

      const dataT = t.data;
      return dataT >= periodo.dataInicio && dataT <= periodo.dataFim;
    });

    return transacoesCartao.reduce((acc, t) => {
      if (t.parcelamento) return acc + t.parcelamento.valorParcela;
      return acc + t.valor;
    }, 0);
  };

  /**
   * Gera faturas automaticamente para todos os cartões
   * CORRIGIDO: Agora gera faturas para TODOS os períodos com transações, não só o mês atual
   */
  const gerarFaturasAutomaticamente = async () => {
    for (const cartao of cartoes) {
      // 1. Obter todas as transações do cartão
      const transacoesCartao = transacoes.filter(t =>
        t.cartaoId === cartao.id && t.categoria !== 'Fatura Cartão'
      );

      // 2. Identificar todos os períodos únicos (meses de referência) das transações
      const periodosComTransacoes = new Set();

      transacoesCartao.forEach(transacao => {
        const mesReferencia = determinarFaturaTransacao(transacao, cartao);
        periodosComTransacoes.add(mesReferencia);
      });

      // 3. Adicionar o período atual (mesmo sem transações, para fatura aberta)
      const periodoAtual = calcularPeriodoFatura(cartao);
      periodosComTransacoes.add(periodoAtual.mesReferencia);

      // 4. Para cada período, verificar se existe fatura. Se não, criar.
      for (const mesReferencia of periodosComTransacoes) {
        const faturaExistente = faturas.find(f =>
          f.cartaoId === cartao.id && f.mes === mesReferencia
        );

        if (!faturaExistente) {
          // Calcular período completo baseado no mês de referência
          const [ano, mes] = mesReferencia.split('-').map(Number);
          const dataReferencia = new Date(ano, mes - 1, cartao.diaFechamento);
          const periodo = calcularPeriodoFatura(cartao, dataReferencia);

          const valorTotal = calcularTotalFaturaCompleto(cartao.id, periodo);

          const novaFatura = {
            id: Date.now() + Math.random(), // Garantir ID único
            cartaoId: cartao.id,
            mes: periodo.mesReferencia,
            valorTotal: valorTotal,
            dataFechamento: periodo.dataFim,
            dataVencimento: periodo.dataVencimento,
            status: calcularStatusFatura({
              dataFechamento: periodo.dataFim,
              dataVencimento: periodo.dataVencimento,
              pago: false
            }),
            pago: false,
            dataPagamento: null,
            dataCriacao: new Date().toISOString()
          };

          await adicionarFatura(novaFatura);
        } else {
          // Atualizar valor da fatura se ainda não foi paga
          if (!faturaExistente.pago) {
            const [ano, mes] = mesReferencia.split('-').map(Number);
            const dataReferencia = new Date(ano, mes - 1, cartao.diaFechamento);
            const periodo = calcularPeriodoFatura(cartao, dataReferencia);

            const valorAtualizado = calcularTotalFaturaCompleto(cartao.id, periodo);
            const statusAtualizado = calcularStatusFatura({...faturaExistente, dataFechamento: periodo.dataFim});

            await atualizarFatura({
              ...faturaExistente,
              valorTotal: valorAtualizado,
              dataFechamento: periodo.dataFim,
              status: statusAtualizado
            });
          }
        }
      }

      // 5. Limpeza: Remover faturas que não têm mais transações (ex: transações deletadas) e não estão pagas
      // Como 'periodosComTransacoes' inclui o mês atual, só removeremos faturas vazias futuras ou passadas não pagas e sem transações.
      const faturasCartao = faturas.filter(f => f.cartaoId === cartao.id);
      for (const fatura of faturasCartao) {
        if (!fatura.pago && !periodosComTransacoes.has(fatura.mes)) {
          // Se não está paga e não está na lista de períodos com transações (ou período atual), deletar.
          await removerFatura(fatura.id);
        }
      }
    }
  };

  // Gerar faturas automaticamente ao carregar dados
  // CORREÇÃO: Depender de 'transacoes' (objeto/array) em vez de apenas 'length'
  // para garantir que edições de valor ou data também atualizem as faturas.
  useEffect(() => {
    if (!dadosCarregando && cartoes.length > 0) {
      gerarFaturasAutomaticamente();
    }
  }, [dadosCarregando, cartoes.length, transacoes]);

  // Fechar menu dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuContaAberto && !event.target.closest('.relative')) {
        setMenuContaAberto(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuContaAberto]);

  // ==================== FIM FUNÇÕES CICLO DE FATURA ====================

  // Cálculos
  const saldoTotal = contas.reduce((acc, c) => acc + c.saldo, 0);
  
  const receitasMes = transacoes
    .filter(t => t.tipo === 'receita' && new Date(t.data).getMonth() === 9 && t.status === 'confirmado')
    .reduce((acc, t) => acc + t.valor, 0);

  const despesasMes = transacoes
    .filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === 9 && (t.status === 'confirmado' || t.status === 'agendado'))
    .reduce((acc, t) => {
      if (t.parcelamento) return acc + t.parcelamento.valorParcela;
      return acc + t.valor;
    }, 0);

  const faturasAbertas = faturas.filter(f => !f.pago);
  const totalFaturasAbertas = faturasAbertas.reduce((acc, f) => acc + f.valorTotal, 0);

  const exportarCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Conta/Cartão', 'Status'];
    const rows = transacoes.map(t => [
      t.data,
      t.tipo,
      t.categoria,
      t.descricao,
      t.valor,
      t.contaId ? contas.find(c => c.id === t.contaId)?.nome : cartoes.find(c => c.id === t.cartaoId)?.nome,
      t.status
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const processarImportacao = async () => {
    if (!arquivoImportacao) {
      alert('Por favor, selecione um arquivo');
      return;
    }

    setImportandoArquivo(true);
    try {
      const transacoesProcessadas = await importarArquivo(arquivoImportacao);
      setTransacoesImportadas(transacoesProcessadas);
      alert(`${transacoesProcessadas.length} transações processadas com sucesso!`);
    } catch (erro) {
      alert(`Erro ao importar arquivo: ${erro.message}`);
      console.error('Erro na importação:', erro);
    } finally {
      setImportandoArquivo(false);
    }
  };

  const confirmarImportacao = async () => {
    if (transacoesImportadas.length === 0) {
      alert('Nenhuma transação para importar');
      return;
    }

    try {
      let transacoesComConta = 0;
      let transacoesSemConta = 0;

      for (const transacao of transacoesImportadas) {
        let contaId = null;

        if (transacao.conta) {
          const contaEncontrada = contas.find(c => c.nome.toLowerCase() === transacao.conta.toLowerCase());
          if (contaEncontrada) {
            contaId = contaEncontrada.id;
          } else {
            transacoesSemConta++;
            continue; // Pula para a próxima transação se a conta não for encontrada
          }
        }

        const novaTransacao = {
          ...transacao,
          id: Date.now() + Math.random(), // Ensure unique ID
          contaId: contaId,
        };
        delete novaTransacao.conta; // Remove o campo 'conta' para evitar erro no Firebase

        await adicionarTransacao(novaTransacao);
        // Saldo atualizado automaticamente
        transacoesComConta++;
      }

      let mensagem = `${transacoesComConta} transações importadas com sucesso!`;
      if (transacoesSemConta > 0) {
        mensagem += `\n\n${transacoesSemConta} transações foram ignoradas porque a conta não foi encontrada. Verifique o nome da conta no arquivo importado.`;
      }
      alert(mensagem);


      // Limpar e fechar modal
      setModalImportacao(false);
      setArquivoImportacao(null);
      setTransacoesImportadas([]);
    } catch (error) {
      console.error('Erro ao importar transações:', error);
      alert('Erro ao importar transações. Tente novamente.');
    }
  };

  const cancelarImportacao = () => {
    setModalImportacao(false);
    setArquivoImportacao(null);
    setTransacoesImportadas([]);
  };

  const pagarFatura = async (faturaId, contaId) => {
    const fatura = faturas.find(f => f.id === faturaId);
    const conta = contas.find(c => c.id === contaId);
    const cartao = cartoes.find(c => c.id === fatura?.cartaoId);

    if (!fatura) {
      alert('Fatura não encontrada!');
      return;
    }

    if (!conta) {
      alert('Conta não encontrada!');
      return;
    }

    if (!cartao) {
      alert('Cartão não encontrado!');
      return;
    }

    if (conta.saldo < fatura.valorTotal) {
      alert(`Saldo insuficiente! Saldo: R$ ${conta.saldo.toFixed(2)} | Fatura: R$ ${fatura.valorTotal.toFixed(2)}`);
      return;
    }

    try {
      // 1. Atualizar fatura para paga
      const faturaAtualizada = {
        ...fatura,
        status: 'paga',
        pago: true,
        dataPagamento: new Date().toISOString().split('T')[0]
      };
      await atualizarFatura(faturaAtualizada);

      // 2. Atualizar saldo da conta
      // NÃO ATUALIZAMOS MANUALMENTE MAIS. A transação criada abaixo fará o useEffect recalcular o saldo.

      // 3. Criar transação de pagamento na conta corrente
      const transacaoPagamento = {
        id: Date.now(),
        tipo: 'despesa',
        valor: fatura.valorTotal,
        data: new Date().toISOString().split('T')[0],
        categoria: 'Fatura Cartão',
        descricao: `Pagamento fatura ${cartao.nome} - ${fatura.mes}`,
        contaId: contaId,
        cartaoId: null, // Importante: transação de pagamento não é do cartão
        status: 'confirmado',
        dataCriacao: new Date().toISOString(),
        tags: ['fatura', 'cartao-credito']
      };
      await adicionarTransacao(transacaoPagamento);

      setModalPagamento(null);
      alert('✅ Fatura paga com sucesso!');
    } catch (error) {
      console.error('Erro ao pagar fatura:', error);
      alert('Erro ao pagar fatura. Por favor, tente novamente.');
    }
  };

  const renderVisaoGeral = () => (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Saldo Total</span>
            <Wallet size={18} className="text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            {mostrarSaldos ? (
              <p className="text-2xl font-bold text-gray-900">
                R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-400">••••••</p>
            )}
            <button onClick={() => setMostrarSaldos(!mostrarSaldos)} className="text-gray-400 hover:text-gray-600">
              {mostrarSaldos ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        <div
          className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setActiveTab('transacoes');
            setFiltroTransacoes('receitas');
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Receitas do Mês</span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            + R$ {receitasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div
          className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setActiveTab('transacoes');
            setFiltroTransacoes('despesas');
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Despesas do Mês</span>
            <TrendingUp size={18} className="text-red-500 rotate-180" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            - R$ {despesasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Faturas Abertas</span>
            <CreditCard size={18} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            R$ {totalFaturasAbertas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Faturas pendentes */}
      {faturasAbertas.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} className="text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Faturas Pendentes</h3>
          </div>
          <div className="space-y-3">
            {faturasAbertas.map(fatura => {
              const cartao = cartoes.find(c => c.id === fatura.cartaoId);
              const diasRestantes = Math.ceil((new Date(fatura.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={fatura.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{cartao?.nome}</p>
                    <p className="text-sm text-gray-600">
                      Vencimento: {new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}
                      <span className="ml-2 text-orange-600 font-medium">
                        ({diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'})
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      R$ {fatura.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <button
                      onClick={() => setModalPagamento(fatura)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
                    >
                      Pagar agora
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transações recentes */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
            <button
              onClick={() => setActiveTab('transacoes')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todas
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {transacoes.slice(0, 5).map(t => (
            <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{t.descricao}</p>
                  <p className="text-sm text-gray-500">
                    {t.categoria} • {new Date(t.data).toLocaleDateString('pt-BR')}
                    {t.parcelamento && ` • ${t.parcelamento.parcelaAtual}/${t.parcelamento.parcelas}x`}
                  </p>
                  {t.tags && t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${t.tipo === 'receita' ? 'text-green-600' : 'text-gray-900'}`}>
                    {t.tipo === 'receita' ? '+' : '-'} R$ {(t.parcelamento ? t.parcelamento.valorParcela : t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    t.status === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Análise por Tags */}
      {(() => {
        const tagAnalysis = {};
        transacoes.forEach(t => {
          if (t.tags && t.tags.length > 0 && t.status === 'confirmado') {
            t.tags.forEach(tag => {
              if (!tagAnalysis[tag]) {
                tagAnalysis[tag] = { receitas: 0, despesas: 0, count: 0 };
              }
              const valor = t.parcelamento ? t.parcelamento.valorParcela : t.valor;
              if (t.tipo === 'receita') {
                tagAnalysis[tag].receitas += valor;
              } else {
                tagAnalysis[tag].despesas += valor;
              }
              tagAnalysis[tag].count += 1;
            });
          }
        });

        const sortedTags = Object.entries(tagAnalysis)
          .sort((a, b) => (b[1].despesas + b[1].receitas) - (a[1].despesas + a[1].receitas))
          .slice(0, 10);

        if (sortedTags.length === 0) return null;

        return (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Tag size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Análise por Tags</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">Visualize suas transações agrupadas por tags</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {sortedTags.map(([tag, data]) => {
                  const total = data.receitas + data.despesas;
                  const saldo = data.receitas - data.despesas;
                  return (
                    <div key={tag} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            <Tag size={14} />
                            {tag}
                          </span>
                          <span className="text-sm text-gray-500">
                            {data.count} {data.count === 1 ? 'transação' : 'transações'}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {saldo >= 0 ? '+' : ''} R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">Saldo</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-green-700 font-medium">Receitas</p>
                          <p className="text-green-900 font-bold text-base mt-1">
                            R$ {data.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <p className="text-red-700 font-medium">Despesas</p>
                          <p className="text-red-900 font-bold text-base mt-1">
                            R$ {data.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Widget de Metas */}
      {metas.length > 0 && (() => {
        const metasAtivas = metas.slice(0, 3);
        const calcularProgressoMeta = (meta) => {
          const transacoesMeta = transacoes.filter(t =>
            t.tags && t.tags.some(tag => meta.tags && meta.tags.includes(tag)) &&
            t.tipo === 'receita' &&
            t.status === 'confirmado'
          );
          const valorAtual = transacoesMeta.reduce((acc, t) => acc + t.valor, 0);
          return { valorAtual, percentual: (valorAtual / meta.valorAlvo) * 100 };
        };

        return (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Metas de Economia</h3>
                </div>
                <button
                  onClick={() => setActiveTab('planejamento')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver todas
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {metasAtivas.map(meta => {
                const { valorAtual, percentual } = calcularProgressoMeta(meta);
                const atingida = percentual >= 100;
                return (
                  <div key={meta.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{meta.nome}</h4>
                      {atingida && <CheckCircle size={18} className="text-green-600" />}
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          R$ {valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {meta.valorAlvo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`font-semibold ${atingida ? 'text-green-600' : 'text-blue-600'}`}>
                          {percentual.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${atingida ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(percentual, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Widget de Orçamentos */}
      {orcamentos.length > 0 && (() => {
        const mesAtual = new Date().toISOString().slice(0, 7);
        const gastosPorCategoria = {};
        transacoes
          .filter(t =>
            t.tipo === 'despesa' &&
            t.data.startsWith(mesAtual) &&
            (t.status === 'confirmado' || t.status === 'agendado')
          )
          .forEach(t => {
            const valor = t.parcelamento ? t.parcelamento.valorParcela : t.valor;
            gastosPorCategoria[t.categoria] = (gastosPorCategoria[t.categoria] || 0) + valor;
          });

        const orcamentosComAlerta = orcamentos.filter(orc => {
          const gastoAtual = gastosPorCategoria[orc.categoria] || 0;
          const percentualGasto = (gastoAtual / orc.limite) * 100;
          return percentualGasto >= 80;
        }).slice(0, 3);

        if (orcamentosComAlerta.length === 0) return null;

        return (
          <div className="bg-white border border-orange-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Alertas de Orçamento</h3>
                </div>
                <button
                  onClick={() => setActiveTab('planejamento')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver todos
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {orcamentosComAlerta.map(orc => {
                const gastoAtual = gastosPorCategoria[orc.categoria] || 0;
                const percentualGasto = (gastoAtual / orc.limite) * 100;
                const ultrapassou = percentualGasto > 100;
                return (
                  <div key={orc.id} className={`p-4 rounded-lg ${ultrapassou ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{orc.categoria}</span>
                      <span className={`font-bold ${ultrapassou ? 'text-red-600' : 'text-orange-600'}`}>
                        {percentualGasto.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      R$ {gastoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {orc.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Widget de Despesas Recorrentes */}
      {despesasRecorrentes.length > 0 && (() => {
        const proximasDespesas = despesasRecorrentes
          .filter(d => {
            const dias = Math.ceil((new Date(d.proximaData) - new Date()) / (1000 * 60 * 60 * 24));
            return d.ativa !== false && dias >= 0 && dias <= 7;
          })
          .sort((a, b) => new Date(a.proximaData) - new Date(b.proximaData))
          .slice(0, 3);

        if (proximasDespesas.length === 0) return null;

        return (
          <div className="bg-white border border-purple-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat size={20} className="text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Despesas Recorrentes Próximas</h3>
                </div>
                <button
                  onClick={() => setActiveTab('planejamento')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver todas
                </button>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {proximasDespesas.map(desp => {
                const diasRestantes = Math.ceil((new Date(desp.proximaData) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={desp.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{desp.descricao}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(desp.proximaData).toLocaleDateString('pt-BR')} • {desp.categoria}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          R$ {desp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className={`text-sm font-medium ${diasRestantes <= 3 ? 'text-orange-600' : 'text-purple-600'}`}>
                          {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
                          {diasRestantes <= 3 && ' ⚠️'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Confirma o pagamento de "${desp.descricao}"?\n\nValor: R$ ${desp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nUma transação será criada automaticamente.`)) {
                          await efetivarPagamentoDespesa(desp);
                        }
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    >
                      <CheckCircle size={16} />
                      Pagar Agora
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );

  // ==================== FUNÇÕES DE CONTAS ====================

  const handleExcluirConta = async (conta) => {
    // Verificar se há cartões vinculados
    const cartoesVinculados = cartoes.filter(c =>
      conta.cartoesVinculados && conta.cartoesVinculados.includes(c.id)
    );

    // Verificar se há transações vinculadas
    const transacoesVinculadas = transacoes.filter(t => t.contaId === conta.id);

    let mensagemConfirmacao = `Deseja realmente excluir a conta "${conta.nome}"?\n\n`;

    if (cartoesVinculados.length > 0) {
      mensagemConfirmacao += `⚠️ ATENÇÃO: Esta conta possui ${cartoesVinculados.length} cartão(ões) vinculado(s).\n`;
    }

    if (transacoesVinculadas.length > 0) {
      mensagemConfirmacao += `⚠️ ATENÇÃO: Esta conta possui ${transacoesVinculadas.length} transação(ões) vinculada(s).\n`;
    }

    mensagemConfirmacao += `\nSaldo atual: R$ ${conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nEsta ação não pode ser desfeita!`;

    if (window.confirm(mensagemConfirmacao)) {
      try {
        await removerConta(conta.id);
        setMenuContaAberto(null);
        alert('Conta excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir conta:', error);
        alert('Erro ao excluir conta. Tente novamente.');
      }
    }
  };

  const handleEditarConta = (conta) => {
    setFormData(conta);
    setTipoModal('conta');
    setModalAberto(true);
    setMenuContaAberto(null);
  };

  // ==================== FUNÇÕES DE CARTÕES ====================

  const handleExcluirCartao = async (cartao) => {
    // Verificar se há faturas vinculadas
    const faturasVinculadas = faturas.filter(f => f.cartaoId === cartao.id);

    // Verificar se há transações vinculadas
    const transacoesVinculadas = transacoes.filter(t => t.cartaoId === cartao.id);

    let mensagemConfirmacao = `Deseja realmente excluir o cartão "${cartao.nome}"?\n\n`;

    if (faturasVinculadas.length > 0) {
      mensagemConfirmacao += `⚠️ ATENÇÃO: Este cartão possui ${faturasVinculadas.length} fatura(s) vinculada(s).\n`;
    }

    if (transacoesVinculadas.length > 0) {
      mensagemConfirmacao += `⚠️ ATENÇÃO: Este cartão possui ${transacoesVinculadas.length} transação(ões) vinculada(s).\n`;
    }

    mensagemConfirmacao += `\nLimite: R$ ${cartao.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nEsta ação não pode ser desfeita!`;

    if (window.confirm(mensagemConfirmacao)) {
      try {
        await removerCartao(cartao.id);
        setMenuCartaoAberto(null);
        alert('Cartão excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir cartão:', error);
        alert('Erro ao excluir cartão. Tente novamente.');
      }
    }
  };

  const handleEditarCartao = (cartao) => {
    setFormData(cartao);
    setTipoModal('cartao');
    setModalAberto(true);
    setMenuCartaoAberto(null);
  };

  const renderPlanejamento = () => {
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Calcular progresso das metas
    const calcularProgressoMeta = (meta) => {
      const transacoesMeta = transacoes.filter(t =>
        t.tags && t.tags.some(tag => meta.tags && meta.tags.includes(tag)) &&
        t.tipo === 'receita' &&
        t.status === 'confirmado'
      );
      const valorAtual = transacoesMeta.reduce((acc, t) => acc + t.valor, 0);
      return { valorAtual, percentual: (valorAtual / meta.valorAlvo) * 100 };
    };

    // Calcular gastos por categoria no mês
    const calcularGastosPorCategoria = () => {
      const gastos = {};
      transacoes
        .filter(t =>
          t.tipo === 'despesa' &&
          t.data.startsWith(mesAtual) &&
          (t.status === 'confirmado' || t.status === 'agendado')
        )
        .forEach(t => {
          const valor = t.parcelamento ? t.parcelamento.valorParcela : t.valor;
          gastos[t.categoria] = (gastos[t.categoria] || 0) + valor;
        });
      return gastos;
    };

    const gastosPorCategoria = calcularGastosPorCategoria();

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target size={28} className="text-blue-600" />
          Planejamento Financeiro
        </h2>

        {/* Seção de Metas */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={20} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Metas de Economia</h3>
              </div>
              <button
                onClick={() => {
                  setTipoModal('meta');
                  setFormData({});
                  setModalAberto(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                Nova Meta
              </button>
            </div>
          </div>

          <div className="p-6">
            {metas.length === 0 ? (
              <div className="text-center py-12">
                <Target size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">Nenhuma meta cadastrada</p>
                <p className="text-sm text-gray-400">Crie metas para acompanhar seus objetivos financeiros</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metas.map(meta => {
                  const { valorAtual, percentual } = calcularProgressoMeta(meta);
                  const diasRestantes = Math.ceil((new Date(meta.prazo) - new Date()) / (1000 * 60 * 60 * 24));
                  const atingida = percentual >= 100;

                  return (
                    <div key={meta.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 text-lg">{meta.nome}</h4>
                            {atingida && (
                              <CheckCircle size={20} className="text-green-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{meta.descricao}</p>
                          {meta.categoria && (
                            <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {meta.categoria}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Deseja realmente excluir a meta "${meta.nome}"?`)) {
                              await removerMeta(meta.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">
                            R$ {valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {meta.valorAlvo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`font-semibold ${atingida ? 'text-green-600' : 'text-blue-600'}`}>
                            {percentual.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              atingida ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(percentual, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Prazo</p>
                          <p className="font-medium">{new Date(meta.prazo).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Dias restantes</p>
                          <p className={`font-medium ${diasRestantes < 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {diasRestantes > 0 ? diasRestantes : 0} dias
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Falta economizar</p>
                          <p className="font-medium text-gray-900">
                            R$ {Math.max(meta.valorAlvo - valorAtual, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {diasRestantes > 0 && !atingida && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            💡 Economize <strong>R$ {((meta.valorAlvo - valorAtual) / diasRestantes * 30).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> por mês para atingir sua meta
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Seção de Orçamentos */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart size={20} className="text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Orçamento Mensal por Categoria</h3>
              </div>
              <button
                onClick={() => {
                  setTipoModal('orcamento');
                  setFormData({});
                  setModalAberto(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                Novo Orçamento
              </button>
            </div>
          </div>

          <div className="p-6">
            {orcamentos.length === 0 ? (
              <div className="text-center py-12">
                <PieChart size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">Nenhum orçamento definido</p>
                <p className="text-sm text-gray-400">Defina limites de gastos por categoria para controlar suas finanças</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orcamentos.map(orc => {
                  const gastoAtual = gastosPorCategoria[orc.categoria] || 0;
                  const percentualGasto = (gastoAtual / orc.limite) * 100;
                  const ultrapassou = percentualGasto > 100;
                  const proximo80 = percentualGasto >= 80 && !ultrapassou;

                  return (
                    <div key={orc.id} className={`border rounded-lg p-5 hover:shadow-md transition-shadow ${
                      ultrapassou ? 'border-red-300 bg-red-50' :
                      proximo80 ? 'border-orange-300 bg-orange-50' :
                      'border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                            {orc.categoria}
                            {ultrapassou && (
                              <AlertCircle size={18} className="text-red-600" />
                            )}
                            {proximo80 && (
                              <AlertCircle size={18} className="text-orange-600" />
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Orçamento para {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Deseja realmente excluir o orçamento de "${orc.categoria}"?`)) {
                              await removerOrcamento(orc.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">
                            R$ {gastoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {orc.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`font-semibold ${
                            ultrapassou ? 'text-red-600' :
                            proximo80 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {percentualGasto.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              ultrapassou ? 'bg-red-500' :
                              proximo80 ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentualGasto, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Disponível</p>
                          <p className={`font-medium text-lg ${
                            ultrapassou ? 'text-red-600' : 'text-green-600'
                          }`}>
                            R$ {Math.max(orc.limite - gastoAtual, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className={`font-medium ${
                            ultrapassou ? 'text-red-600' :
                            proximo80 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {ultrapassou ? '🚨 Ultrapassado' :
                             proximo80 ? '⚠️ Atenção' :
                             '✅ No limite'}
                          </p>
                        </div>
                      </div>

                      {ultrapassou && (
                        <div className="mt-4 pt-4 border-t border-red-200">
                          <p className="text-sm text-red-700">
                            ⚠️ Você ultrapassou o orçamento em <strong>R$ {(gastoAtual - orc.limite).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Seção de Despesas Recorrentes */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={20} className="text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Despesas Recorrentes</h3>
              </div>
              <button
                onClick={() => {
                  setTipoModal('despesaRecorrente');
                  setFormData({});
                  setModalAberto(true);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                Nova Despesa Recorrente
              </button>
            </div>
          </div>

          <div className="p-6">
            {despesasRecorrentes.length === 0 ? (
              <div className="text-center py-12">
                <Repeat size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">Nenhuma despesa recorrente cadastrada</p>
                <p className="text-sm text-gray-400">Cadastre despesas fixas como aluguel, contas e assinaturas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {despesasRecorrentes.map(desp => {
                  const proximaData = new Date(desp.proximaData);
                  const diasAteProxima = Math.ceil((proximaData - new Date()) / (1000 * 60 * 60 * 24));
                  const ativa = desp.ativa !== false;

                  return (
                    <div key={desp.id} className={`border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow ${
                      !ativa ? 'opacity-50' : ''
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 text-lg">{desp.descricao}</h4>
                            {!ativa && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                                Inativa
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{desp.categoria}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await atualizarDespesaRecorrente({
                                ...desp,
                                ativa: !ativa
                              });
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              ativa ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            title={ativa ? 'Desativar' : 'Ativar'}
                          >
                            {ativa ? <CheckCircle size={18} /> : <X size={18} />}
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Deseja realmente excluir "${desp.descricao}"?`)) {
                                await removerDespesaRecorrente(desp.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 transition-colors p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Valor</p>
                          <p className="font-semibold text-gray-900 text-lg">
                            R$ {desp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Frequência</p>
                          <p className="font-medium capitalize">{desp.frequencia}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Próxima data</p>
                          <p className="font-medium">{proximaData.toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Dias restantes</p>
                          <p className={`font-medium ${diasAteProxima <= 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {diasAteProxima > 0 ? diasAteProxima : 0} dias
                            {diasAteProxima <= 3 && ' ⚠️'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


  const imprimirRecibo = (transacao) => {
    const conta = transacao.contaId ? contas.find(c => c.id === transacao.contaId) : null;
    const cartao = transacao.cartaoId ? cartoes.find(c => c.id === transacao.cartaoId) : null;
    
    const recibo = `
      ========================================
                   RECIBO
      ========================================

      Data: ${new Date(transacao.data).toLocaleDateString('pt-BR')}
      Descrição: ${transacao.descricao}
      Categoria: ${transacao.categoria}
      
      Tipo: ${transacao.tipo === 'receita' ? 'RECEITA' : 'DESPESA'}
      Valor: R$ ${transacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      
      ${transacao.parcelamento ? `Parcelamento: ${transacao.parcelamento.parcelas}x de R$ ${transacao.parcelamento.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
      
      ${conta ? `Conta: ${conta.nome} - ${conta.banco}` : ''}
      ${cartao ? `Cartão: ${cartao.nome} - ${cartao.numero}` : ''}

      Status: ${transacao.status.toUpperCase()}

      ========================================
      ID da Transação: #${transacao.id}
      Gerado em: ${new Date().toLocaleString('pt-BR')}
      ========================================
    `;
    
    const printWindow = window.open('', '', 'width=600,height=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo - Transação #${transacao.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 40px; }
            pre { white-space: pre-wrap; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <pre>${recibo}</pre>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderModalDetalhesTransacao = () => {
    if (!transacaoSelecionada) return null;

    const t = transacaoSelecionada;
    const conta = t.contaId ? contas.find(c => c.id === t.contaId) : null;
    const cartao = t.cartaoId ? cartoes.find(c => c.id === t.cartaoId) : null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Detalhes da Transação</h3>
            <button
              onClick={() => setTransacaoSelecionada(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Valor</span>
                <p className={`text-3xl font-bold ${t.tipo === 'receita' ? 'text-green-600' : 'text-gray-900'}`}>
                  {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {t.parcelamento && (
                <p className="text-sm text-purple-600 font-medium text-right">
                  {t.parcelamento.parcelas}x de R$ {t.parcelamento.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Data</p>
                <p className="font-medium">{new Date(t.data).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block text-xs px-2 py-1 rounded ${
                  t.status === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {t.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Descrição</p>
              <p className="font-medium">{t.descricao}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Categoria</p>
              <p className="font-medium">{t.categoria}</p>
            </div>

            {conta && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Conta</p>
                <p className="font-medium">{conta.nome} - {conta.banco}</p>
              </div>
            )}

            {cartao && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Cartão</p>
                <p className="font-medium">{cartao.nome} - {cartao.numero}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">ID da Transação: #{t.id}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setTransacaoSelecionada(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                imprimirRecibo(t);
                setTransacaoSelecionada(null);
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              Imprimir Recibo
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModalPagamento = () => {
    if (!modalPagamento) return null;

    const cartao = cartoes.find(c => c.id === modalPagamento.cartaoId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Pagar Fatura</h3>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">{cartao?.nome}</p>
            <p className="text-3xl font-bold text-gray-900">
              R$ {modalPagamento.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Vencimento: {new Date(modalPagamento.dataVencimento).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <label className="block text-sm font-medium text-gray-700">Pagar com qual conta?</label>
            {contas.map(conta => (
              <button
                key={conta.id}
                onClick={() => {
                  if (window.confirm(`Confirmar pagamento de R$ ${modalPagamento.valorTotal.toFixed(2)} usando ${conta.nome}?`)) {
                    pagarFatura(modalPagamento.id, conta.id);
                  }
                }}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{conta.nome}</p>
                    <p className="text-sm text-gray-500">{conta.banco}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      R$ {conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {conta.saldo < modalPagamento.valorTotal && (
                      <p className="text-xs text-red-600">Saldo insuficiente</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setModalPagamento(null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const renderModalDetalhesConta = () => {
    if (!contaSelecionada) return null;

    // Filtrar transações da conta
    const transacoesConta = transacoes.filter(t => t.contaId === contaSelecionada.id);

    // Ordenar por data (mais recente primeiro)
    const transacoesOrdenadas = [...transacoesConta].sort((a, b) =>
      new Date(b.data) - new Date(a.data)
    );

    // Calcular estatísticas
    const totalReceitas = transacoesConta
      .filter(t => t.tipo === 'receita')
      .reduce((acc, t) => acc + t.valor, 0);

    const totalDespesas = transacoesConta
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, t) => acc + t.valor, 0);

    const saldoMovimentacoes = totalReceitas - totalDespesas;

    // Buscar cartões vinculados
    const cartoesVinculados = cartoes.filter(c =>
      contaSelecionada.cartoesVinculados && contaSelecionada.cartoesVinculados.includes(c.id)
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{contaSelecionada.nome}</h3>
                <p className="text-sm text-gray-500 mt-1">{contaSelecionada.banco}</p>
              </div>
              <button
                onClick={() => setContaSelecionada(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Informações da conta */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Agência</p>
                <p className="font-mono text-lg font-medium">{contaSelecionada.agencia}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Conta</p>
                <p className="font-mono text-lg font-medium">{contaSelecionada.numero}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Tipo</p>
                <p className="text-lg font-medium capitalize">{contaSelecionada.tipo}</p>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Saldo Atual</p>
                <p className="text-xl font-bold text-gray-900">
                  R$ {contaSelecionada.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Receitas</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Despesas</p>
                <p className="text-xl font-bold text-red-600">
                  R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Movimentações</p>
                <p className={`text-xl font-bold ${saldoMovimentacoes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {saldoMovimentacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {cartoesVinculados.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Cartões Vinculados ({cartoesVinculados.length})</p>
                <div className="flex flex-wrap gap-2">
                  {cartoesVinculados.map(c => (
                    <span key={c.id} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                      {c.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Histórico de Transações */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900">
                Histórico de Transações ({transacoesConta.length})
              </h4>
            </div>

            {transacoesOrdenadas.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Nenhuma transação encontrada nesta conta</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transacoesOrdenadas.map(transacao => (
                  <div
                    key={transacao.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{transacao.descricao}</p>
                        {transacao.tags && transacao.tags.length > 0 && (
                          <div className="flex gap-1">
                            {transacao.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-500">
                          {new Date(transacao.data).toLocaleDateString('pt-BR')}
                        </p>
                        <span className="text-gray-300">•</span>
                        <p className="text-sm text-gray-500">{transacao.categoria}</p>
                        <span className="text-gray-300">•</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          transacao.status === 'confirmado'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {transacao.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`text-lg font-bold ${
                        transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transacao.tipo === 'receita' ? '+' : '-'}
                        R$ {transacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleEditarConta(contaSelecionada);
                  setContaSelecionada(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Editar Conta
              </button>
              <button
                onClick={() => setContaSelecionada(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModalImportacao = () => {
    if (!modalImportacao) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Importar Transações</h3>

          {/* Seleção de arquivo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione um arquivo OFX, CSV ou XLSX
            </label>
            <input
              type="file"
              accept=".ofx,.csv,.xlsx,.xls"
              onChange={(e) => setArquivoImportacao(e.target.files[0])}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
            <p className="mt-2 text-sm text-gray-500">
              Formatos aceitos: .OFX (extratos bancários), .CSV (planilhas) e .XLSX/.XLS (Excel)
            </p>
            <p className="mt-2 text-sm text-blue-600 font-medium">
              Para XLSX: Colunas esperadas - Data, Estabelecimento, Descrição, Categoria, Conta, Valor
            </p>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={processarImportacao}
              disabled={!arquivoImportacao || importandoArquivo}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importandoArquivo ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processando...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Processar Arquivo
                </>
              )}
            </button>
          </div>

          {/* Preview das transações importadas */}
          {transacoesImportadas.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  {transacoesImportadas.length} transações encontradas
                </h4>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transacoesImportadas.map((t, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(t.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            t.tipo === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {t.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{t.categoria}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{t.descricao}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          <span className={t.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}>
                            R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botões finais */}
          <div className="flex gap-3">
            <button
              onClick={confirmarImportacao}
              disabled={transacoesImportadas.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Confirmar Importação ({transacoesImportadas.length})
            </button>
            <button
              onClick={cancelarImportacao}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FinanceFlow</h1>
              <p className="text-sm text-gray-500">Gestão Financeira Profissional</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell size={20} className="text-gray-600" />
                {/* Badge de notificações (opcional) */}
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName || user.email?.split('@')[0] || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-full border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (window.confirm('Deseja sair da sua conta?')) {
                      await logout();
                    }
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                  title="Sair"
                >
                  <LogOut size={18} className="text-gray-600 group-hover:text-red-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            {[
              { id: 'visao-geral', label: 'Visão Geral', icon: <BarChart3 size={18} /> },
              { id: 'contas-cartoes', label: 'Contas & Cartões', icon: <Wallet size={18} /> },
              { id: 'planejamento', label: 'Planejamento', icon: <Target size={18} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'visao-geral' && renderVisaoGeral()}
        {activeTab === 'contas-cartoes' && (
          <ContasCartoes
            contas={contas}
            cartoes={cartoes}
            transacoes={transacoes}
            faturas={faturas}
            setTransacoes={setTransacoes}
            onOpenModal={(type, data, context) => {
              setTipoModal(type);
              setContextoModal(context);
              setFormData(data || {});
              setModalAberto(true);
            }}
            onEditAccount={handleEditarConta}
            onDeleteAccount={handleExcluirConta}
            onEditCard={handleEditarCartao}
            onDeleteCard={handleExcluirCartao}
            onPayInvoice={(fatura) => setModalPagamento(fatura)}
            onExportCSV={exportarCSV}
            onImport={() => setModalImportacao(true)}
            onSelectTransaction={setTransacaoSelecionada}
            mostrarSaldos={mostrarSaldos}
            atualizarTransacao={atualizarTransacao}
            calcularPeriodoFatura={calcularPeriodoFatura}
          />
        )}
        {activeTab === 'planejamento' && renderPlanejamento()}
      </div>

      <AccountModal
        isOpen={modalAberto && tipoModal === 'conta'}
        onClose={() => setModalAberto(false)}
        onSave={async (data) => {
          if (data.id) await atualizarConta(data);
          else await adicionarConta({...data, id: Date.now(), dataCriacao: new Date().toISOString()});
        }}
        initialData={formData}
      />

      <CardModal
        isOpen={modalAberto && tipoModal === 'cartao'}
        onClose={() => setModalAberto(false)}
        onSave={async (data) => {
          if (data.id) await atualizarCartao(data);
          else await adicionarCartao({...data, id: Date.now(), dataCriacao: new Date().toISOString()});
        }}
        initialData={formData}
        contas={contas}
      />

      <TransactionModal
        isOpen={modalAberto && tipoModal === 'transacao'}
        onClose={() => setModalAberto(false)}
        onSave={async (transacao) => {
          // Check if it's an update or create
          // We can check if it exists in the list or if we passed an ID
          // The modal logic ensures `id` is present
          const exists = transacoes.some(t => t.id === transacao.id);

          if (exists) {
            await atualizarTransacao(transacao);
          } else {
            await adicionarTransacao(transacao);
            // Saldo atualizado automaticamente
          }
        }}
        initialData={formData}
        contas={contas}
        cartoes={cartoes}
        context={contextoModal}
      />

      <MetaModal
        isOpen={modalAberto && tipoModal === 'meta'}
        onClose={() => setModalAberto(false)}
        onSave={async (data) => {
          if (data.id) await atualizarMeta(data);
          else await adicionarMeta({...data, id: Date.now(), dataCriacao: new Date().toISOString()});
        }}
        initialData={formData}
      />

      <BudgetModal
        isOpen={modalAberto && tipoModal === 'orcamento'}
        onClose={() => setModalAberto(false)}
        onSave={async (data) => {
          if (data.id) await atualizarOrcamento(data);
          else await adicionarOrcamento({...data, id: Date.now(), mes: new Date().toISOString().slice(0, 7), dataCriacao: new Date().toISOString()});
        }}
        initialData={formData}
      />

      <RecurrentExpenseModal
        isOpen={modalAberto && tipoModal === 'despesaRecorrente'}
        onClose={() => setModalAberto(false)}
        onSave={async (data) => {
          if (data.id) await atualizarDespesaRecorrente(data);
          else await adicionarDespesaRecorrente({...data, id: Date.now(), dataCriacao: new Date().toISOString()});
        }}
        initialData={formData}
        contas={contas}
      />

      {renderModalDetalhesTransacao()}
      {renderModalPagamento()}
      {renderModalImportacao()}
      {renderModalDetalhesConta()}

      {/* Botão Flutuante Global */}
      <button
        onClick={() => {
          setTipoModal('transacao');
          setFormData({});
          setModalAberto(true);
        }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center z-50 group"
        title="Nova Transação"
      >
        <Plus size={28} className="group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
};

export default FinanceApp;
