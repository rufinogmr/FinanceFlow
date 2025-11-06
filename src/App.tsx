import React, { useState, useEffect } from 'react';
import { Plus, Download, Upload, Search, Filter, MoreVertical, ChevronDown, ChevronRight, Eye, EyeOff, FileText, BarChart3, TrendingUp, CreditCard, Wallet, DollarSign, Calendar, AlertCircle, Bell, LogOut } from 'lucide-react';
import LoginScreen from './LoginScreen';
import { observarAuth, logout } from './firebase';
import { useFirebaseData } from './useFirebaseData';

const FinanceApp = () => {
  // Estado de autenticação
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Observar mudanças de autenticação
  useEffect(() => {
    const unsubscribe = observarAuth((currentUser) => {
      console.log('Auth state changed:', currentUser?.email || 'no user');
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
    carregando: dadosCarregando,
    setContas,
    setCartoes,
    setTransacoes,
    setFaturas,
    atualizarConta,
    atualizarTransacao,
    atualizarFatura
  } = useFirebaseData(user.uid);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mostrarSaldos, setMostrarSaldos] = useState(true);
  const [filtroTransacoes, setFiltroTransacoes] = useState('todos');
  const [expandedCard, setExpandedCard] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [tipoModal, setTipoModal] = useState('');
  const [formData, setFormData] = useState({});
  const [transacaoSelecionada, setTransacaoSelecionada] = useState(null);
  const [modalPagamento, setModalPagamento] = useState(null);

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

  const pagarFatura = (faturaId, contaId) => {
    const fatura = faturas.find(f => f.id === faturaId);
    const conta = contas.find(c => c.id === contaId);

    if (!fatura) {
      alert('Fatura não encontrada!');
      return;
    }

    if (!conta) {
      alert('Conta não encontrada!');
      return;
    }

    if (conta.saldo < fatura.valorTotal) {
      alert(`Saldo insuficiente! Saldo: R$ ${conta.saldo.toFixed(2)} | Fatura: R$ ${fatura.valorTotal.toFixed(2)}`);
      return;
    }

    setFaturas(faturas.map(f => 
      f.id === faturaId 
        ? { ...f, status: 'paga', pago: true, dataPagamento: new Date().toISOString().split('T')[0] }
        : f
    ));

    setContas(contas.map(c => 
      c.id === contaId 
        ? { ...c, saldo: c.saldo - fatura.valorTotal }
        : c
    ));

    const novaTrans = {
      id: transacoes.length + 1,
      tipo: 'despesa',
      valor: fatura.valorTotal,
      data: new Date().toISOString().split('T')[0],
      categoria: 'Fatura Cartão',
      descricao: `Pagamento fatura ${cartoes.find(c => c.id === fatura.cartaoId)?.nome}`,
      contaId: contaId,
      status: 'confirmado'
    };

    setTransacoes([...transacoes, novaTrans]);
    setModalPagamento(null);
    alert('✅ Fatura paga com sucesso!');
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
        const cartaosDaConta = cartoes.filter(c => conta.cartoesVinculados.includes(c.id));
        
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

  const renderTransacoes = () => {
    const transacoesFiltradas = transacoes.filter(t => {
      if (filtroTransacoes === 'todos') return true;
      if (filtroTransacoes === 'receitas') return t.tipo === 'receita';
      if (filtroTransacoes === 'despesas') return t.tipo === 'despesa';
      return true;
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
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {transacoesFiltradas.map(t => (
            <div 
              key={t.id} 
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setTransacaoSelecionada(t)}
            >
              <div className="flex items-center justify-between">
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
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </div>
            </div>
          ))}
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
              <input
                type="text"
                placeholder="Nome do cartão"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.nome || ''}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
              />
              <input
                type="text"
                placeholder="Número do cartão"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.numero || ''}
                onChange={(e) => setFormData({...formData, numero: e.target.value})}
              />
              <input
                type="number"
                placeholder="Limite"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.limite || ''}
                onChange={(e) => setFormData({...formData, limite: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Dia fechamento"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.diaFechamento || ''}
                  onChange={(e) => setFormData({...formData, diaFechamento: e.target.value})}
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Dia vencimento"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.diaVencimento || ''}
                  onChange={(e) => setFormData({...formData, diaVencimento: e.target.value})}
                />
              </div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.bandeira || ''}
                onChange={(e) => setFormData({...formData, bandeira: e.target.value})}
              >
                <option value="">Bandeira</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Elo">Elo</option>
                <option value="American Express">American Express</option>
              </select>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formData.contaVinculada || ''}
                onChange={(e) => setFormData({...formData, contaVinculada: parseInt(e.target.value)})}
              >
                <option value="">Conta vinculada</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
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
              onClick={() => {
                // Aqui iria a lógica de salvar
                setModalAberto(false);
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
              { id: 'transacoes', label: 'Transações', icon: <DollarSign size={18} /> },
              { id: 'contas', label: 'Contas', icon: <Wallet size={18} /> },
              { id: 'cartoes', label: 'Cartões', icon: <CreditCard size={18} /> }
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
        {activeTab === 'contas' && renderContas()}
        {activeTab === 'cartoes' && renderCartoes()}
        {activeTab === 'transacoes' && renderTransacoes()}
      </div>

      {renderModal()}
      {renderModalDetalhesTransacao()}
      {renderModalPagamento()}
    </div>
  );
};

export default FinanceApp;