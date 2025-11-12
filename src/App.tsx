import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Search, Filter, MoreVertical, ChevronDown, ChevronRight, Eye, EyeOff, FileText, BarChart3, TrendingUp, CreditCard, Wallet, DollarSign, Calendar, AlertCircle, Bell, LogOut, Tag, X, Target, PieChart, Repeat, CheckCircle, TrendingDown, Edit2, Trash2, Clock } from 'lucide-react';
import LoginScreen from './LoginScreen';
import { observarAuth, logout } from './firebase';
import { useFirebaseData } from './useFirebaseData';
import { importarArquivo } from './importUtils';

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
    removerDespesaRecorrente
  } = useFirebaseData(user.uid);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mostrarSaldos, setMostrarSaldos] = useState(true);
  const [filtroTransacoes, setFiltroTransacoes] = useState('todos');
  const [filtroTags, setFiltroTags] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [tipoModal, setTipoModal] = useState('');
  const [formData, setFormData] = useState({});
  const [transacaoSelecionada, setTransacaoSelecionada] = useState(null);
  const [modalPagamento, setModalPagamento] = useState(null);
  const [modalImportacao, setModalImportacao] = useState(false);
  const [arquivoImportacao, setArquivoImportacao] = useState(null);
  const [transacoesImportadas, setTransacoesImportadas] = useState([]);
  const [importandoArquivo, setImportandoArquivo] = useState(false);

  // Estados para seleção múltipla
  const [transacoesSelecionadas, setTransacoesSelecionadas] = useState([]);
  const [modoSelecao, setModoSelecao] = useState(false);

  // Estados para faturas
  const [faturaSelecionada, setFaturaSelecionada] = useState(null);

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
   */
  const gerarFaturasAutomaticamente = async () => {
    for (const cartao of cartoes) {
      const periodo = calcularPeriodoFatura(cartao);

      // Verificar se já existe fatura para este período
      const faturaExistente = faturas.find(f =>
        f.cartaoId === cartao.id && f.mes === periodo.mesReferencia
      );

      if (!faturaExistente) {
        const valorTotal = calcularTotalFaturaCompleto(cartao.id, periodo);

        const novaFatura = {
          id: Date.now() + Math.random(), // Garantir ID único
          cartaoId: cartao.id,
          mes: periodo.mesReferencia,
          valorTotal: valorTotal,
          dataFechamento: periodo.dataFim,
          dataVencimento: periodo.dataVencimento,
          status: 'aberta',
          pago: false,
          dataPagamento: null,
          dataCriacao: new Date().toISOString()
        };

        await adicionarFatura(novaFatura);
      } else {
        // Atualizar valor da fatura se ainda não foi paga
        if (!faturaExistente.pago) {
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
  };

  // Gerar faturas automaticamente ao carregar dados
  useEffect(() => {
    if (!dadosCarregando && cartoes.length > 0) {
      gerarFaturasAutomaticamente();
    }
  }, [dadosCarregando, cartoes.length, transacoes.length]);

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

  const calcularTotalFatura = (cartaoId, mesRef) => {
    return transacoes
      .filter(t => t.cartaoId === cartaoId && t.data.startsWith(mesRef))
      .reduce((acc, t) => {
        if (t.parcelamento) return acc + t.parcelamento.valorParcela;
        return acc + t.valor;
      }, 0);
  };

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

  const confirmarImportacao = () => {
    if (transacoesImportadas.length === 0) {
      alert('Nenhuma transação para importar');
      return;
    }

    const novasTransacoes = transacoesImportadas.map((t, index) => ({
      ...t,
      id: transacoes.length + index + 1
    }));

    setTransacoes([...transacoes, ...novasTransacoes]);
    alert(`${novasTransacoes.length} transações importadas com sucesso!`);

    // Limpar e fechar modal
    setModalImportacao(false);
    setArquivoImportacao(null);
    setTransacoesImportadas([]);
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
      const contaAtualizada = {
        ...conta,
        saldo: conta.saldo - fatura.valorTotal
      };
      await atualizarConta(contaAtualizada);

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

  const renderDashboard = () => (
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

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 font-medium">Receitas do Mês</span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            + R$ {receitasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
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

  const renderContas = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Contas Bancárias</h2>
        <div className="flex gap-2">
          <button
            onClick={exportarCSV}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={() => {
              setTipoModal('conta');
              setFormData({});
              setModalAberto(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            Nova Conta
          </button>
        </div>
      </div>

      {contas.map(conta => {
        const cartaosDaConta = cartoes.filter(c => conta.cartoesVinculados && conta.cartoesVinculados.includes(c.id));
        
        return (
          <div key={conta.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{conta.nome}</h3>
                  <p className="text-sm text-gray-500 mt-1">{conta.banco}</p>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Agência</p>
                  <p className="font-mono text-sm font-medium">{conta.agencia}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Conta</p>
                  <p className="font-mono text-sm font-medium">{conta.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                  <p className="text-sm font-medium capitalize">{conta.tipo}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">Saldo Disponível</span>
                <div className="flex items-center gap-2">
                  {mostrarSaldos ? (
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-400">••••••</p>
                  )}
                </div>
              </div>

              {cartaosDaConta.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Cartões Vinculados</p>
                  <div className="flex flex-wrap gap-2">
                    {cartaosDaConta.map(c => (
                      <span key={c.id} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                        {c.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ==================== RENDER FATURAS ====================
  const renderFaturas = () => {
    // Ordenar faturas por data de vencimento
    const faturasOrdenadas = [...faturas].sort((a, b) =>
      new Date(a.dataVencimento) - new Date(b.dataVencimento)
    );

    const faturasAgrupadasPorStatus = {
      vencida: faturasOrdenadas.filter(f => calcularStatusFatura(f) === 'vencida'),
      fechada: faturasOrdenadas.filter(f => calcularStatusFatura(f) === 'fechada'),
      aberta: faturasOrdenadas.filter(f => calcularStatusFatura(f) === 'aberta'),
      paga: faturasOrdenadas.filter(f => calcularStatusFatura(f) === 'paga')
    };

    const renderCardFatura = (fatura) => {
      const cartao = cartoes.find(c => c.id === fatura.cartaoId);
      const status = calcularStatusFatura(fatura);
      const diasRestantes = Math.ceil((new Date(fatura.dataVencimento) - new Date()) / (1000 * 60 * 60 * 24));

      // Buscar transações da fatura
      const periodo = cartao ? calcularPeriodoFatura(cartao, new Date(fatura.dataVencimento)) : null;
      const transacoesFatura = periodo ? transacoes.filter(t => {
        if (t.cartaoId !== fatura.cartaoId) return false;
        if (t.categoria === 'Fatura Cartão') return false;
        const dataT = t.data;
        return dataT >= periodo.dataInicio && dataT <= periodo.dataFim;
      }) : [];

      const statusConfig = {
        vencida: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
        fechada: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
        aberta: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
        paga: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', badge: 'bg-green-100 text-green-700' }
      };

      const config = statusConfig[status];
      const expandido = expandedCard === fatura.id;

      return (
        <div key={fatura.id} className={`border ${config.border} rounded-lg overflow-hidden ${config.bg}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard size={24} className={config.text} />
                <div>
                  <h3 className="font-bold text-gray-900">{cartao?.nome || 'Cartão'}</h3>
                  <p className="text-sm text-gray-600">
                    Período: {periodo ? `${new Date(periodo.dataInicio).toLocaleDateString('pt-BR')} - ${new Date(periodo.dataFim).toLocaleDateString('pt-BR')}` : fatura.mes}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.badge}`}>
                {status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Fechamento</p>
                <p className="font-medium">{new Date(fatura.dataFechamento || fatura.dataVencimento).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Vencimento</p>
                <p className="font-medium">{new Date(fatura.dataVencimento).toLocaleDateString('pt-BR')}</p>
                {status !== 'paga' && status !== 'vencida' && (
                  <p className={`text-xs ${diasRestantes <= 3 ? 'text-red-600' : 'text-gray-500'} mt-0.5`}>
                    {diasRestantes > 0 ? `${diasRestantes} dias` : 'Hoje'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                <p className={`text-2xl font-bold ${config.text}`}>
                  R$ {fatura.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-2">
                {status !== 'paga' && (
                  <button
                    onClick={() => setModalPagamento(fatura)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Pagar
                  </button>
                )}
                <button
                  onClick={() => setExpandedCard(expandido ? null : fatura.id)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                >
                  {expandido ? 'Ocultar' : 'Ver detalhes'}
                </button>
              </div>
            </div>

            {expandido && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Transações ({transacoesFatura.length})</h4>
                {transacoesFatura.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhuma transação nesta fatura</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transacoesFatura.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{t.descricao}</p>
                          <p className="text-xs text-gray-500">{new Date(t.data).toLocaleDateString('pt-BR')} • {t.categoria}</p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          R$ {(t.parcelamento ? t.parcelamento.valorParcela : t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Faturas de Cartão de Crédito</h2>
            <p className="text-sm text-gray-600 mt-1">Gerencie todas as faturas dos seus cartões</p>
          </div>
        </div>

        {/* Resumo por status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Vencidas</span>
              <AlertCircle size={18} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{faturasAgrupadasPorStatus.vencida.length}</p>
            <p className="text-xs text-gray-600 mt-1">
              R$ {faturasAgrupadasPorStatus.vencida.reduce((acc, f) => acc + f.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Fechadas</span>
              <FileText size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{faturasAgrupadasPorStatus.fechada.length}</p>
            <p className="text-xs text-gray-600 mt-1">
              R$ {faturasAgrupadasPorStatus.fechada.reduce((acc, f) => acc + f.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Abertas</span>
              <Calendar size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{faturasAgrupadasPorStatus.aberta.length}</p>
            <p className="text-xs text-gray-600 mt-1">
              R$ {faturasAgrupadasPorStatus.aberta.reduce((acc, f) => acc + f.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Pagas</span>
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{faturasAgrupadasPorStatus.paga.length}</p>
            <p className="text-xs text-gray-600 mt-1">
              R$ {faturasAgrupadasPorStatus.paga.reduce((acc, f) => acc + f.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Faturas Vencidas */}
        {faturasAgrupadasPorStatus.vencida.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3">⚠️ Faturas Vencidas</h3>
            <div className="space-y-3">
              {faturasAgrupadasPorStatus.vencida.map(renderCardFatura)}
            </div>
          </div>
        )}

        {/* Faturas Fechadas */}
        {faturasAgrupadasPorStatus.fechada.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-orange-600 mb-3">📋 Faturas Fechadas</h3>
            <div className="space-y-3">
              {faturasAgrupadasPorStatus.fechada.map(renderCardFatura)}
            </div>
          </div>
        )}

        {/* Faturas Abertas */}
        {faturasAgrupadasPorStatus.aberta.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-blue-600 mb-3">📅 Faturas Abertas</h3>
            <div className="space-y-3">
              {faturasAgrupadasPorStatus.aberta.map(renderCardFatura)}
            </div>
          </div>
        )}

        {/* Faturas Pagas */}
        {faturasAgrupadasPorStatus.paga.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-600 mb-3">✅ Faturas Pagas</h3>
            <div className="space-y-3">
              {faturasAgrupadasPorStatus.paga.slice(0, 5).map(renderCardFatura)}
            </div>
            {faturasAgrupadasPorStatus.paga.length > 5 && (
              <p className="text-sm text-gray-500 text-center mt-3">
                Mostrando 5 de {faturasAgrupadasPorStatus.paga.length} faturas pagas
              </p>
            )}
          </div>
        )}

        {faturas.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhuma fatura encontrada</p>
            <p className="text-sm text-gray-400 mt-2">As faturas serão geradas automaticamente ao adicionar cartões</p>
          </div>
        )}
      </div>
    );
  };

  const renderCartoes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h2>
        <button
          onClick={() => {
            setTipoModal('cartao');
            setFormData({});
            setModalAberto(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} />
          Novo Cartão
        </button>
      </div>

      {cartoes.map(cartao => {
        const faturaAtual = faturas.find(f => f.cartaoId === cartao.id && !f.pago);
        const valorFatura = faturaAtual?.valorTotal || 0;
        const percentualUsado = (valorFatura / cartao.limite) * 100;

        return (
          <div key={cartao.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm opacity-75 mb-1">{cartao.bandeira}</p>
                  <p className="font-mono text-lg">{cartao.numero}</p>
                </div>
                <CreditCard size={32} className="opacity-75" />
              </div>
              <p className="text-lg font-semibold">{cartao.nome}</p>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Fatura Atual</span>
                  <span className="font-medium">
                    R$ {valorFatura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                    R$ {cartao.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      percentualUsado > 80 ? 'bg-red-500' : 
                      percentualUsado > 50 ? 'bg-yellow-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentualUsado, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Fechamento</p>
                  <p className="font-medium">Dia {cartao.diaFechamento}</p>
                </div>
                <div>
                  <p className="text-gray-500">Vencimento</p>
                  <p className="font-medium">Dia {cartao.diaVencimento}</p>
                </div>
              </div>

              <button
                onClick={() => setExpandedCard(expandedCard === cartao.id ? null : cartao.id)}
                className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
              >
                {expandedCard === cartao.id ? 'Ocultar' : 'Ver'} detalhes da fatura
                {expandedCard === cartao.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {expandedCard === cartao.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  {transacoes
                    .filter(t => t.cartaoId === cartao.id)
                    .map(t => (
                      <div key={t.id} className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{t.descricao}</p>
                          <p className="text-gray-500 text-xs">
                            {new Date(t.data).toLocaleDateString('pt-BR')}
                            {t.parcelamento && ` • ${t.parcelamento.parcelaAtual}/${t.parcelamento.parcelas}x`}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900">
                          R$ {(t.parcelamento ? t.parcelamento.valorParcela : t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Funções para seleção múltipla de transações
  const toggleSelecaoTransacao = (transacaoId) => {
    setTransacoesSelecionadas(prev => {
      if (prev.includes(transacaoId)) {
        return prev.filter(id => id !== transacaoId);
      } else {
        return [...prev, transacaoId];
      }
    });
  };

  const toggleSelecionarTodas = (transacoesFiltradas) => {
    const todosIds = transacoesFiltradas.map(t => t.id);
    if (transacoesSelecionadas.length === todosIds.length) {
      setTransacoesSelecionadas([]);
    } else {
      setTransacoesSelecionadas(todosIds);
    }
  };

  const deletarTransacoesSelecionadas = async () => {
    if (transacoesSelecionadas.length === 0) return;

    if (window.confirm(`Deseja realmente deletar ${transacoesSelecionadas.length} transação(ões)?`)) {
      const transacoesRestantes = transacoes.filter(t => !transacoesSelecionadas.includes(t.id));
      setTransacoes(transacoesRestantes);
      setTransacoesSelecionadas([]);
      setModoSelecao(false);
    }
  };

  // ==================== RENDER CONTA CORRENTE ====================
  const renderContaCorrente = () => {
    // Filtrar apenas transações de conta corrente (não são de cartão)
    const transacoesContaCorrente = transacoes.filter(t =>
      t.contaId !== null && t.contaId !== undefined
    );

    // Obter todas as tags únicas das transações
    const allTags = [...new Set(transacoesContaCorrente.flatMap(t => t.tags || []))].sort();

    const transacoesFiltradas = transacoesContaCorrente.filter(t => {
      // Filtro por tipo
      let passaTipo = true;
      if (filtroTransacoes === 'receitas') passaTipo = t.tipo === 'receita';
      if (filtroTransacoes === 'despesas') passaTipo = t.tipo === 'despesa';

      // Filtro por tags
      let passaTags = true;
      if (filtroTags.length > 0) {
        passaTags = filtroTags.some(tag => t.tags && t.tags.includes(tag));
      }

      return passaTipo && passaTags;
    });

    console.log('Transações filtradas:', transacoesFiltradas.length);
    console.log('Detalhes das filtradas:', transacoesFiltradas);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Conta Corrente</h2>
            <p className="text-sm text-gray-600 mt-1">Transações diretas em contas bancárias e pagamentos de faturas</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filtroTransacoes}
              onChange={(e) => setFiltroTransacoes(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="todos">Todas</option>
              <option value="receitas">Receitas</option>
              <option value="despesas">Despesas</option>
            </select>
            {!modoSelecao ? (
              <>
                <button
                  onClick={() => {
                    setModoSelecao(true);
                    setTransacoesSelecionadas([]);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"
                  title="Selecionar múltiplas transações"
                >
                  <Filter size={16} />
                  Selecionar
                </button>
                <button
                  onClick={() => setModalImportacao(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                  title="Importar transações de arquivo OFX ou CSV"
                >
                  <Upload size={16} />
                  Importar
                </button>
                <button
                  onClick={exportarCSV}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm font-medium"
                  title="Exportar transações para CSV"
                >
                  <Download size={16} />
                  Exportar
                </button>
                <button
                  onClick={() => {
                    setTipoModal('transacao');
                    setFormData({});
                    setModalAberto(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Nova Transação
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setModoSelecao(false);
                    setTransacoesSelecionadas([]);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={deletarTransacoesSelecionadas}
                  disabled={transacoesSelecionadas.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deletar ({transacoesSelecionadas.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filtro por Tags */}
        {allTags.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtrar por Tags:</span>
              {filtroTags.length > 0 && (
                <button
                  onClick={() => setFiltroTags([])}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => {
                const isSelected = filtroTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isSelected) {
                        setFiltroTags(filtroTags.filter(t => t !== tag));
                      } else {
                        setFiltroTags([...filtroTags, tag]);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500 hover:text-blue-600'
                    }`}
                  >
                    <Tag size={12} />
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {modoSelecao && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={transacoesSelecionadas.length === transacoesFiltradas.length && transacoesFiltradas.length > 0}
                onChange={() => toggleSelecionarTodas(transacoesFiltradas)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-blue-900">
                {transacoesSelecionadas.length > 0
                  ? `${transacoesSelecionadas.length} transação(ões) selecionada(s)`
                  : 'Selecionar todas'}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {transacoesFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhuma transação encontrada</p>
              </div>
            ) : (
              transacoesFiltradas.map(t => (
                <div
                  key={t.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${modoSelecao ? 'cursor-pointer' : ''}`}
                  onClick={modoSelecao ? () => toggleSelecaoTransacao(t.id) : () => setTransacaoSelecionada(t)}
                >
                  <div className="flex items-center gap-4">
                    {modoSelecao && (
                      <input
                        type="checkbox"
                        checked={transacoesSelecionadas.includes(t.id)}
                        onChange={() => toggleSelecaoTransacao(t.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{t.descricao}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>{t.categoria}</span>
                        <span className="text-gray-300">•</span>
                        <span>{new Date(t.data).toLocaleDateString('pt-BR')}</span>
                        {t.parcelamento && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-purple-600 font-medium">
                              {t.parcelamento.parcelaAtual}/{t.parcelamento.parcelas}x
                            </span>
                          </>
                        )}
                      </div>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {t.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs"
                            >
                              <Tag size={10} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`font-semibold ${t.tipo === 'receita' ? 'text-green-600' : 'text-gray-900'}`}>
                          {t.tipo === 'receita' ? '+' : '-'} R$ {(t.parcelamento ? t.parcelamento.valorParcela : t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          t.status === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      {!modoSelecao && <ChevronRight size={18} className="text-gray-400" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTransacoes = () => {
    // Obter todas as tags únicas das transações
    const allTags = [...new Set(transacoes.flatMap(t => t.tags || []))].sort();

    const transacoesFiltradas = transacoes.filter(t => {
      // Filtro por tipo
      let passaTipo = true;
      if (filtroTransacoes === 'receitas') passaTipo = t.tipo === 'receita';
      if (filtroTransacoes === 'despesas') passaTipo = t.tipo === 'despesa';

      // Filtro por tags
      let passaTags = true;
      if (filtroTags.length > 0) {
        passaTags = filtroTags.some(tag => t.tags && t.tags.includes(tag));
      }

      return passaTipo && passaTags;
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Transações</h2>
          <div className="flex gap-2">
            <select
              value={filtroTransacoes}
              onChange={(e) => setFiltroTransacoes(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="todos">Todas</option>
              <option value="receitas">Receitas</option>
              <option value="despesas">Despesas</option>
            </select>
            {!modoSelecao ? (
              <>
                <button
                  onClick={() => {
                    setModoSelecao(true);
                    setTransacoesSelecionadas([]);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"
                  title="Selecionar múltiplas transações"
                >
                  <Filter size={16} />
                  Selecionar
                </button>
                <button
                  onClick={() => setModalImportacao(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                  title="Importar transações de arquivo OFX ou CSV"
                >
                  <Upload size={16} />
                  Importar
                </button>
                <button
                  onClick={exportarCSV}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm font-medium"
                  title="Exportar transações para CSV"
                >
                  <Download size={16} />
                  Exportar
                </button>
                <button
                  onClick={() => {
                    setTipoModal('transacao');
                    setFormData({});
                    setModalAberto(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Nova Transação
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setModoSelecao(false);
                    setTransacoesSelecionadas([]);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={deletarTransacoesSelecionadas}
                  disabled={transacoesSelecionadas.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Deletar ({transacoesSelecionadas.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filtro por Tags */}
        {allTags.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtrar por Tags:</span>
              {filtroTags.length > 0 && (
                <button
                  onClick={() => setFiltroTags([])}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => {
                const isSelected = filtroTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isSelected) {
                        setFiltroTags(filtroTags.filter(t => t !== tag));
                      } else {
                        setFiltroTags([...filtroTags, tag]);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500 hover:text-blue-600'
                    }`}
                  >
                    <Tag size={12} />
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {modoSelecao && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={transacoesSelecionadas.length === transacoesFiltradas.length && transacoesFiltradas.length > 0}
                onChange={() => toggleSelecionarTodas(transacoesFiltradas)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-blue-900">
                {transacoesSelecionadas.length === transacoesFiltradas.length && transacoesFiltradas.length > 0
                  ? 'Desmarcar todas'
                  : 'Selecionar todas'}
              </span>
            </div>
            <span className="text-sm text-blue-700">
              {transacoesSelecionadas.length} de {transacoesFiltradas.length} selecionadas
            </span>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {transacoesFiltradas.map(t => (
            <div
              key={t.id}
              className={`p-4 transition-colors ${modoSelecao ? 'hover:bg-blue-50' : 'hover:bg-gray-50 cursor-pointer'}`}
              onClick={() => {
                if (modoSelecao) {
                  toggleSelecaoTransacao(t.id);
                } else {
                  setTransacaoSelecionada(t);
                }
              }}
            >
              <div className="flex items-center justify-between">
                {modoSelecao && (
                  <input
                    type="checkbox"
                    checked={transacoesSelecionadas.includes(t.id)}
                    onChange={() => toggleSelecaoTransacao(t.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mr-4"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{t.descricao}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{t.categoria}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">{new Date(t.data).toLocaleDateString('pt-BR')}</span>
                    {t.parcelamento && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-purple-600 font-medium">
                          {t.parcelamento.parcelaAtual}/{t.parcelamento.parcelas}x
                        </span>
                      </>
                    )}
                  </div>
                  {t.tags && t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className={`font-semibold ${t.tipo === 'receita' ? 'text-green-600' : 'text-gray-900'}`}>
                      {t.tipo === 'receita' ? '+' : '-'} R$ {(t.parcelamento ? t.parcelamento.valorParcela : t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      t.status === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  {!modoSelecao && <ChevronRight size={18} className="text-gray-400" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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

                      {desp.contaId && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Conta: <span className="font-medium text-gray-700">
                              {contas.find(c => c.id === desp.contaId)?.nome || 'N/A'}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Botão de pagamento rápido */}
                      {ativa && diasAteProxima <= 7 && diasAteProxima >= 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={async () => {
                              if (window.confirm(`Confirma o pagamento de "${desp.descricao}"?\n\nValor: R$ ${desp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nUma transação será criada automaticamente e a próxima data será atualizada.`)) {
                                await efetivarPagamentoDespesa(desp);
                              }
                            }}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                          >
                            <CheckCircle size={16} />
                            Pagar Agora
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Resumo mensal */}
                <div className="mt-6 pt-6 border-t-2 border-gray-300">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                    <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <Calendar size={18} />
                      Resumo Mensal de Despesas Recorrentes
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-purple-700">Total Mensal</p>
                        <p className="font-bold text-purple-900 text-2xl">
                          R$ {despesasRecorrentes
                            .filter(d => d.ativa !== false && d.frequencia === 'mensal')
                            .reduce((acc, d) => acc + d.valor, 0)
                            .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-purple-700">Despesas Ativas</p>
                        <p className="font-bold text-purple-900 text-2xl">
                          {despesasRecorrentes.filter(d => d.ativa !== false).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-purple-700">Próximas 7 dias</p>
                        <p className="font-bold text-purple-900 text-2xl">
                          {despesasRecorrentes.filter(d => {
                            const dias = Math.ceil((new Date(d.proximaData) - new Date()) / (1000 * 60 * 60 * 24));
                            return d.ativa !== false && dias >= 0 && dias <= 7;
                          }).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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

  const renderModal = () => {
    if (!modalAberto) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {tipoModal === 'transacao' && 'Nova Transação'}
            {tipoModal === 'conta' && 'Nova Conta'}
            {tipoModal === 'cartao' && 'Novo Cartão'}
            {tipoModal === 'meta' && 'Nova Meta de Economia'}
            {tipoModal === 'orcamento' && 'Novo Orçamento'}
            {tipoModal === 'despesaRecorrente' && 'Nova Despesa Recorrente'}
          </h3>

          {tipoModal === 'transacao' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.tipo || ''}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                >
                  <option value="">Selecione</option>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.descricao || ''}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.valor || ''}
                  onChange={(e) => setFormData({...formData, valor: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.data || ''}
                  onChange={(e) => setFormData({...formData, data: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.categoria || ''}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                >
                  <option value="">Selecione</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Moradia">Moradia</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Educação">Educação</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Eletrônicos">Eletrônicos</option>
                  <option value="Assinaturas">Assinaturas</option>
                  <option value="Salário">Salário</option>
                  <option value="Investimento">Investimento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar tag (pressione Enter)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const tagInput = e.target.value.trim();
                        if (tagInput && (!formData.tags || !formData.tags.includes(tagInput))) {
                          setFormData({
                            ...formData,
                            tags: [...(formData.tags || []), tagInput]
                          });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                      >
                        <Tag size={12} />
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = formData.tags.filter((_, i) => i !== index);
                            setFormData({...formData, tags: newTags});
                          }}
                          className="ml-1 hover:text-blue-900"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="formaPagamento"
                    className="mr-2"
                    checked={formData.contaId && !formData.cartaoId}
                    onChange={() => setFormData({...formData, contaId: contas[0]?.id, cartaoId: null})}
                  />
                  <span className="text-sm">Conta Bancária</span>
                </label>

                {formData.contaId && !formData.cartaoId && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg ml-6"
                    value={formData.contaId || ''}
                    onChange={(e) => setFormData({...formData, contaId: parseInt(e.target.value)})}
                  >
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="formaPagamento"
                    className="mr-2"
                    checked={formData.cartaoId}
                    onChange={() => setFormData({...formData, cartaoId: cartoes[0]?.id, contaId: null})}
                  />
                  <span className="text-sm">Cartão de Crédito</span>
                </label>

                {formData.cartaoId && (
                  <>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg ml-6"
                      value={formData.cartaoId || ''}
                      onChange={(e) => setFormData({...formData, cartaoId: parseInt(e.target.value)})}
                    >
                      {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>

                    <label className="flex items-center ml-6">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.parcelado || false}
                        onChange={(e) => setFormData({...formData, parcelado: e.target.checked})}
                      />
                      <span className="text-sm">Parcelado</span>
                    </label>

                    {formData.parcelado && (
                      <div className="ml-6">
                        <input
                          type="number"
                          min="2"
                          max="24"
                          placeholder="Número de parcelas"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={formData.numeroParcelas || ''}
                          onChange={(e) => setFormData({...formData, numeroParcelas: e.target.value})}
                        />
                        {formData.numeroParcelas && formData.valor && (
                          <p className="text-sm text-gray-600 mt-1">
                            {formData.numeroParcelas}x de R$ {(parseFloat(formData.valor) / parseInt(formData.numeroParcelas)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {tipoModal === 'conta' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome da conta"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.nome || ''}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
              />
              <input
                type="text"
                placeholder="Banco"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.banco || ''}
                onChange={(e) => setFormData({...formData, banco: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Agência"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.agencia || ''}
                  onChange={(e) => setFormData({...formData, agencia: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Número da conta"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData({...formData, numero: e.target.value})}
                />
              </div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.tipo || ''}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="">Tipo de conta</option>
                <option value="corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
              <input
                type="number"
                placeholder="Saldo inicial"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.saldo || ''}
                onChange={(e) => setFormData({...formData, saldo: e.target.value})}
              />
            </div>
          )}

          {tipoModal === 'cartao' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cartão</label>
                <input
                  type="text"
                  placeholder="Ex: Nubank Platinum"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número do Cartão (últimos 4 dígitos)</label>
                <input
                  type="text"
                  placeholder="Ex: **** 1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData({...formData, numero: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Crédito</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.limite || ''}
                  onChange={(e) => setFormData({...formData, limite: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dia Fechamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.diaFechamento || ''}
                    onChange={(e) => setFormData({...formData, diaFechamento: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Dia do mês que a fatura fecha</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dia Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 25"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.diaVencimento || ''}
                    onChange={(e) => setFormData({...formData, diaVencimento: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Dia do mês para pagamento</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bandeira</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.bandeira || ''}
                  onChange={(e) => setFormData({...formData, bandeira: e.target.value})}
                >
                  <option value="">Selecione a bandeira</option>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Elo">Elo</option>
                  <option value="American Express">American Express</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conta Vinculada para Pagamento</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.contaVinculada || ''}
                  onChange={(e) => setFormData({...formData, contaVinculada: parseInt(e.target.value)})}
                >
                  <option value="">Selecione a conta</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.banco}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">A conta que será debitada ao pagar a fatura</p>
              </div>
            </div>
          )}

          {tipoModal === 'meta' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome da meta (ex: Viagem para Europa)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.nome || ''}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
              />
              <textarea
                placeholder="Descrição (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows="2"
                value={formData.descricao || ''}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Valor alvo (R$)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.valorAlvo || ''}
                onChange={(e) => setFormData({...formData, valorAlvo: e.target.value})}
              />
              <input
                type="date"
                placeholder="Prazo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.prazo || ''}
                onChange={(e) => setFormData({...formData, prazo: e.target.value})}
              />
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.categoria || ''}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              >
                <option value="">Categoria (opcional)</option>
                <option value="Viagem">Viagem</option>
                <option value="Casa Própria">Casa Própria</option>
                <option value="Carro">Carro</option>
                <option value="Emergência">Emergência</option>
                <option value="Investimento">Investimento</option>
                <option value="Educação">Educação</option>
                <option value="Outro">Outro</option>
              </select>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags relacionadas (opcional)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar tag (pressione Enter)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const tagInput = e.target.value.trim();
                        if (tagInput && (!formData.tags || !formData.tags.includes(tagInput))) {
                          setFormData({
                            ...formData,
                            tags: [...(formData.tags || []), tagInput]
                          });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                      >
                        <Tag size={12} />
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = formData.tags.filter((_, i) => i !== index);
                            setFormData({...formData, tags: newTags});
                          }}
                          className="ml-1 hover:text-blue-900"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tipoModal === 'orcamento' && (
            <div className="space-y-4">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.categoria || ''}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              >
                <option value="">Selecione a Categoria</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Moradia">Moradia</option>
                <option value="Saúde">Saúde</option>
                <option value="Educação">Educação</option>
                <option value="Lazer">Lazer</option>
                <option value="Eletrônicos">Eletrônicos</option>
                <option value="Assinaturas">Assinaturas</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Limite mensal (R$)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.limite || ''}
                onChange={(e) => setFormData({...formData, limite: e.target.value})}
              />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  💡 Defina um limite de gastos para esta categoria. Você receberá alertas ao atingir 80% e 100% do orçamento.
                </p>
              </div>
            </div>
          )}

          {tipoModal === 'despesaRecorrente' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Descrição (ex: Aluguel, Netflix, Academia)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.descricao || ''}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              />
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.categoria || ''}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              >
                <option value="">Categoria</option>
                <option value="Moradia">Moradia</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Assinaturas">Assinaturas</option>
                <option value="Saúde">Saúde</option>
                <option value="Educação">Educação</option>
                <option value="Lazer">Lazer</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Valor (R$)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.valor || ''}
                onChange={(e) => setFormData({...formData, valor: e.target.value})}
              />
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.frequencia || ''}
                onChange={(e) => setFormData({...formData, frequencia: e.target.value})}
              >
                <option value="">Frequência</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="semanal">Semanal</option>
              </select>
              <input
                type="date"
                placeholder="Próxima data"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.proximaData || ''}
                onChange={(e) => setFormData({...formData, proximaData: e.target.value})}
              />
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.contaId || ''}
                onChange={(e) => setFormData({...formData, contaId: e.target.value ? parseInt(e.target.value) : null})}
              >
                <option value="">Conta vinculada (opcional)</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-900">
                  ℹ️ As despesas recorrentes servem para lembrar você de pagamentos fixos. Você pode ativá-las/desativá-las quando necessário.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setModalAberto(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                try {
                  // Validação e salvamento baseado no tipo de modal
                  if (tipoModal === 'conta') {
                    // Validar campos obrigatórios
                    if (!formData.nome || !formData.banco || !formData.tipo) {
                      alert('Por favor, preencha todos os campos obrigatórios (Nome, Banco e Tipo)');
                      return;
                    }

                    const novaConta = {
                      id: Date.now(),
                      nome: formData.nome,
                      banco: formData.banco,
                      agencia: formData.agencia || '',
                      numero: formData.numero || '',
                      tipo: formData.tipo,
                      saldo: parseFloat(formData.saldo) || 0,
                      dataCriacao: new Date().toISOString()
                    };

                    await adicionarConta(novaConta);
                    alert('Conta criada com sucesso!');
                  }
                  else if (tipoModal === 'cartao') {
                    // Validar campos obrigatórios
                    if (!formData.nome || !formData.numero || !formData.limite || !formData.bandeira) {
                      alert('Por favor, preencha todos os campos obrigatórios (Nome, Número, Limite e Bandeira)');
                      return;
                    }

                    const novoCartao = {
                      id: Date.now(),
                      nome: formData.nome,
                      numero: formData.numero,
                      limite: parseFloat(formData.limite),
                      diaFechamento: parseInt(formData.diaFechamento) || 1,
                      diaVencimento: parseInt(formData.diaVencimento) || 10,
                      bandeira: formData.bandeira,
                      contaVinculada: formData.contaVinculada || null,
                      dataCriacao: new Date().toISOString()
                    };

                    await adicionarCartao(novoCartao);
                    alert('Cartão criado com sucesso!');
                  }
                  else if (tipoModal === 'transacao') {
                    // Validar campos obrigatórios
                    if (!formData.tipo || !formData.descricao || !formData.valor || !formData.data || !formData.categoria) {
                      alert('Por favor, preencha todos os campos obrigatórios (Tipo, Descrição, Valor, Data e Categoria)');
                      return;
                    }

                    if (!formData.contaId && !formData.cartaoId) {
                      alert('Por favor, selecione uma forma de pagamento (Conta Bancária ou Cartão de Crédito)');
                      return;
                    }

                    const novaTransacao = {
                      id: Date.now(),
                      tipo: formData.tipo,
                      descricao: formData.descricao,
                      valor: parseFloat(formData.valor),
                      data: formData.data,
                      categoria: formData.categoria,
                      contaId: formData.contaId || null,
                      cartaoId: formData.cartaoId || null,
                      status: 'confirmado',
                      dataCriacao: new Date().toISOString(),
                      tags: formData.tags || []
                    };

                    // Adicionar informações de parcelamento se for parcelado
                    if (formData.parcelado && formData.numeroParcelas) {
                      novaTransacao.parcelamento = {
                        parcelas: parseInt(formData.numeroParcelas),
                        valorParcela: parseFloat(formData.valor) / parseInt(formData.numeroParcelas),
                        parcelaAtual: 1
                      };
                    }

                    await adicionarTransacao(novaTransacao);
                    alert('Transação criada com sucesso!');
                  }
                  else if (tipoModal === 'meta') {
                    // Validar campos obrigatórios
                    if (!formData.nome || !formData.valorAlvo || !formData.prazo) {
                      alert('Por favor, preencha todos os campos obrigatórios (Nome, Valor Alvo e Prazo)');
                      return;
                    }

                    const novaMeta = {
                      id: Date.now(),
                      nome: formData.nome,
                      descricao: formData.descricao || '',
                      valorAlvo: parseFloat(formData.valorAlvo),
                      prazo: formData.prazo,
                      categoria: formData.categoria || '',
                      tags: formData.tags || [],
                      dataCriacao: new Date().toISOString()
                    };

                    await adicionarMeta(novaMeta);
                    alert('Meta criada com sucesso!');
                  }
                  else if (tipoModal === 'orcamento') {
                    // Validar campos obrigatórios
                    if (!formData.categoria || !formData.limite) {
                      alert('Por favor, preencha todos os campos obrigatórios (Categoria e Limite)');
                      return;
                    }

                    // Verificar se já existe orçamento para esta categoria
                    const orcamentoExistente = orcamentos.find(o => o.categoria === formData.categoria);
                    if (orcamentoExistente) {
                      alert('Já existe um orçamento para esta categoria. Exclua o orçamento existente antes de criar um novo.');
                      return;
                    }

                    const novoOrcamento = {
                      id: Date.now(),
                      categoria: formData.categoria,
                      limite: parseFloat(formData.limite),
                      mes: new Date().toISOString().slice(0, 7), // YYYY-MM
                      dataCriacao: new Date().toISOString()
                    };

                    await adicionarOrcamento(novoOrcamento);
                    alert('Orçamento criado com sucesso!');
                  }
                  else if (tipoModal === 'despesaRecorrente') {
                    // Validar campos obrigatórios
                    if (!formData.descricao || !formData.categoria || !formData.valor || !formData.frequencia || !formData.proximaData) {
                      alert('Por favor, preencha todos os campos obrigatórios');
                      return;
                    }

                    const novaDespesa = {
                      id: Date.now(),
                      descricao: formData.descricao,
                      categoria: formData.categoria,
                      valor: parseFloat(formData.valor),
                      frequencia: formData.frequencia,
                      proximaData: formData.proximaData,
                      contaId: formData.contaId || null,
                      ativa: true,
                      dataCriacao: new Date().toISOString()
                    };

                    await adicionarDespesaRecorrente(novaDespesa);
                    alert('Despesa recorrente criada com sucesso!');
                  }

                  // Fechar modal e limpar form
                  setModalAberto(false);
                  setFormData({});
                } catch (error) {
                  console.error('Erro ao salvar:', error);
                  alert('Erro ao salvar. Por favor, tente novamente.');
                }
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
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
              { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
              { id: 'conta-corrente', label: 'Conta Corrente', icon: <DollarSign size={18} /> },
              { id: 'faturas', label: 'Faturas', icon: <FileText size={18} /> },
              { id: 'contas', label: 'Contas', icon: <Wallet size={18} /> },
              { id: 'cartoes', label: 'Cartões', icon: <CreditCard size={18} /> },
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
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'conta-corrente' && renderContaCorrente()}
        {activeTab === 'faturas' && renderFaturas()}
        {activeTab === 'contas' && renderContas()}
        {activeTab === 'cartoes' && renderCartoes()}
        {activeTab === 'planejamento' && renderPlanejamento()}
      </div>

      {renderModal()}
      {renderModalDetalhesTransacao()}
      {renderModalPagamento()}
      {renderModalImportacao()}
    </div>
  );
};

export default FinanceApp;