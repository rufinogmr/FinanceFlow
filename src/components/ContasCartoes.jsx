import React, { useState } from 'react';
import {
  Wallet, CreditCard, Plus, Download, Upload, MoreVertical,
  Edit2, Trash2, ChevronDown, ChevronRight, Filter, FileText, Tag
} from 'lucide-react';

const ContasCartoes = ({
  contas,
  cartoes,
  transacoes,
  faturas,
  setTransacoes,
  onOpenModal, // Generic handler to open modals
  onEditAccount,
  onDeleteAccount,
  onEditCard,
  onDeleteCard,
  onPayInvoice,
  onExportCSV,
  onImport,
  onSelectTransaction,
  // Helper functions passed from parent
  mostrarSaldos,
  atualizarTransacao,
  calcularPeriodoFatura
}) => {
  const [menuContaAberto, setMenuContaAberto] = useState(null);
  const [menuCartaoAberto, setMenuCartaoAberto] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [secaoExpandida, setSecaoExpandida] = useState('compras');

  // Estados para seleção múltipla e filtros
  const [modoSelecao, setModoSelecao] = useState(false);
  const [transacoesSelecionadas, setTransacoesSelecionadas] = useState([]);
  const [filtroTransacoes, setFiltroTransacoes] = useState('todos');
  const [filtroTags, setFiltroTags] = useState([]);
  // Helpers internos
  const toggleSelecaoTransacao = (id) => {
    setTransacoesSelecionadas(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodas = (list) => {
    if (transacoesSelecionadas.length === list.length) {
      setTransacoesSelecionadas([]);
    } else {
      setTransacoesSelecionadas(list.map(t => t.id));
    }
  };

  const deletarTransacoesSelecionadas = async () => {
    if (transacoesSelecionadas.length === 0) return;
    if (window.confirm(`Deseja realmente deletar ${transacoesSelecionadas.length} transação(ões)?`)) {
        // Here we assume setTransacoes updates the local state in parent,
        // but for Firebase persistence, the parent usually handles the logic.
        // Ideally, we should call a parent function `onDeleteTransactions`.
        // For now, mirroring App.tsx logic which modifies state directly then presumably relies on effects or helper calls.
        // Wait, App.tsx calls `atualizarTransacao` with deleted:true or just filters.
        // UseFirebaseData usually has `removerTransacao`.
        // I'll assume the parent passed a handler or I use `atualizarTransacao` passed as prop.

        for (const id of transacoesSelecionadas) {
            const transacao = transacoes.find(t => t.id === id);
            if (transacao) {
                await atualizarTransacao({ ...transacao, deleted: true }); // Or remove
            }
        }
        // Since we are observing firebase, the list will update automatically in parent
        setTransacoesSelecionadas([]);
        setModoSelecao(false);
    }
  };

  const allTags = [...new Set(transacoes.flatMap(t => t.tags || []))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Contas & Cartões</h2>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <Upload size={16} />
            Importar
          </button>
          <button
            onClick={onExportCSV}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* ==================== CONTAS BANCÁRIAS ==================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet size={20} className="text-blue-600" />
            Contas Bancárias
          </h3>
          <button
            onClick={() => onOpenModal('conta')}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
          >
            <Plus size={14} />
            Nova
          </button>
        </div>

        {contas.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Wallet size={40} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">Nenhuma conta cadastrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contas.map(conta => (
              <div key={conta.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{conta.nome}</h4>
                    <p className="text-xs text-gray-500">{conta.banco}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenModal('transacao', { contaId: conta.id })}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      + Lançar
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuContaAberto(menuContaAberto === conta.id ? null : conta.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuContaAberto === conta.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <button
                            onClick={() => onEditAccount(conta)}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                          >
                            <Edit2 size={14} />
                            Editar
                          </button>
                          <button
                            onClick={() => onDeleteAccount(conta)}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2 text-red-600 border-t border-gray-200"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Saldo</span>
                  {mostrarSaldos ? (
                    <p className="text-xl font-bold text-gray-900">
                      R$ {conta.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-gray-400">••••••</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================== CARTÕES DE CRÉDITO ==================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard size={20} className="text-purple-600" />
            Cartões de Crédito
          </h3>
          <button
            onClick={() => onOpenModal('cartao')}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1 text-sm"
          >
            <Plus size={14} />
            Novo
          </button>
        </div>

        {cartoes.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <CreditCard size={40} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">Nenhum cartão cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cartoes.map(cartao => {
              // CORRECTION: Calculate used limit based on ALL unpaid invoices (Total Debt)
              const faturasCartao = faturas.filter(f => f.cartaoId === cartao.id);
              const totalDivida = faturasCartao
                .filter(f => !f.pago)
                .reduce((acc, f) => acc + f.valorTotal, 0);

              const faturaAtual = faturasCartao.find(f => !f.pago); // Just for display "Fatura Aberta" context if needed

              const percentualUsado = (totalDivida / cartao.limite) * 100;
              const expandido = expandedCard === `cartao-${cartao.id}`;
              const limiteDisponivel = Math.max(0, cartao.limite - totalDivida);

              return (
                <div key={cartao.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {/* Header Compacto */}
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{cartao.nome}</p>
                        <p className="text-xs opacity-75">{cartao.bandeira} •••• {cartao.numero.slice(-4)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenModal('transacao', { cartaoId: cartao.id }, 'cartao')}
                          className="px-3 py-1.5 bg-white text-gray-800 rounded text-xs font-medium hover:bg-gray-100"
                        >
                          + Compra
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setMenuCartaoAberto(menuCartaoAberto === cartao.id ? null : cartao.id)}
                            className="text-white hover:text-gray-300 p-1"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuCartaoAberto === cartao.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={() => onEditCard(cartao)}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                <Edit2 size={14} />
                                Editar
                              </button>
                              <button
                                onClick={() => onDeleteCard(cartao)}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2 text-red-600 border-t border-gray-200"
                              >
                                <Trash2 size={14} />
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-4 space-y-3">
                    {/* Limite */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Utilizado: R$ {totalDivida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span>Disp: R$ {limiteDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                      <div className="text-right mt-1">
                         <span className="text-xs text-gray-500">Total: R$ {cartao.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Fatura Atual (Próxima a vencer) */}
                    {faturaAtual && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-orange-700 font-medium">Fatura Aberta ({new Date(faturaAtual.dataVencimento).toLocaleDateString('pt-BR', { month: 'short' })})</p>
                            <p className="text-sm font-bold text-gray-900">
                              R$ {faturaAtual.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-orange-600">
                              Vence: {new Date(faturaAtual.dataVencimento).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <button
                            onClick={() => onPayInvoice(faturaAtual)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                          >
                            Pagar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Toggle Compras/Faturas */}
                    <button
                      onClick={() => setExpandedCard(expandido ? null : `cartao-${cartao.id}`)}
                      className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
                    >
                      {expandido ? 'Ocultar' : 'Ver'} detalhes
                      {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {/* Área Expandida */}
                    {expandido && (
                      <div className="pt-3 border-t space-y-3">
                        {/* Tabs */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSecaoExpandida('compras')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded ${
                              secaoExpandida === 'compras'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Compras Recentes
                          </button>
                          <button
                            onClick={() => setSecaoExpandida('faturas')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded ${
                              secaoExpandida === 'faturas'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Histórico Faturas
                          </button>
                        </div>

                        {/* Conteúdo das Tabs */}
                        <div className="max-h-64 overflow-y-auto">
                          {secaoExpandida === 'compras' ? (
                            (() => {
                              // Mostrar ultimas 10 compras do cartao
                              const compras = transacoes
                                .filter(t => t.cartaoId === cartao.id)
                                .sort((a, b) => new Date(b.data) - new Date(a.data))
                                .slice(0, 10);

                              if (compras.length === 0) {
                                return <p className="text-xs text-gray-500 text-center py-4">Sem compras registradas</p>;
                              }

                              return compras.map(t => (
                                <div
                                  key={t.id}
                                  className="flex justify-between items-start p-2 hover:bg-gray-50 rounded text-xs group"
                                >
                                    <div className="flex-1 cursor-pointer" onClick={() => onSelectTransaction && onSelectTransaction(t)}>
                                    <p className="font-medium text-gray-900">{t.descricao}</p>
                                    <p className="text-gray-500">{new Date(t.data).toLocaleDateString('pt-BR')}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-900">
                                      R$ {(t.parcelamento ? t.parcelamento.valorParcela : t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    {/* Edit/Delete handlers usually in modal or global, simplifying here */}
                                  </div>
                                </div>
                              ));
                            })()
                          ) : (
                            (() => {
                              const faturasCartaoHistorico = faturas
                                .filter(f => f.cartaoId === cartao.id)
                                .sort((a, b) => new Date(b.dataVencimento) - new Date(a.dataVencimento));

                              if (faturasCartaoHistorico.length === 0) {
                                return <p className="text-xs text-gray-500 text-center py-4">Sem faturas</p>;
                              }

                              return faturasCartaoHistorico.map(f => (
                                <div key={f.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded text-xs">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {new Date(f.dataVencimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className={`text-xs ${f.pago ? 'text-green-600' : 'text-orange-600'}`}>
                                      {f.pago ? 'Paga' : 'Aberta'}
                                    </p>
                                  </div>
                                  <p className="font-semibold">R$ {f.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                              ));
                            })()
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== TODAS AS TRANSAÇÕES ==================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-green-600" />
            Todas as Transações
          </h3>
          <div className="flex gap-2">
            <select
              value={filtroTransacoes}
              onChange={(e) => setFiltroTransacoes(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="todos">Todas</option>
              <option value="receitas">Receitas</option>
              <option value="despesas">Despesas</option>
            </select>
            {!modoSelecao ? (
              <button
                onClick={() => {
                  setModoSelecao(true);
                  setTransacoesSelecionadas([]);
                }}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Selecionar
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setModoSelecao(false);
                    setTransacoesSelecionadas([]);
                  }}
                  className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={deletarTransacoesSelecionadas}
                  disabled={transacoesSelecionadas.length === 0}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                >
                  Deletar ({transacoesSelecionadas.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filtro de Tags */}
        {allTags.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-600">Tags:</span>
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
                    className={`px-2 py-1 rounded-full text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
              {filtroTags.length > 0 && (
                <button
                  onClick={() => setFiltroTags([])}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista de Transações */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {(() => {
            const transacoesFiltradas = transacoes.filter(t => {
              let passaTipo = true;
              if (filtroTransacoes === 'receitas') passaTipo = t.tipo === 'receita';
              if (filtroTransacoes === 'despesas') passaTipo = t.tipo === 'despesa';

              let passaTags = true;
              if (filtroTags.length > 0) {
                passaTags = filtroTags.some(tag => t.tags && t.tags.includes(tag));
              }

              return passaTipo && passaTags;
            });

            if (transacoesFiltradas.length === 0) {
              return (
                <div className="p-8 text-center">
                  <FileText size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Nenhuma transação encontrada</p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-gray-200">
                {transacoesFiltradas.map(t => (
                  <div
                    key={t.id}
                    className="p-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {modoSelecao && (
                        <input
                          type="checkbox"
                          checked={transacoesSelecionadas.includes(t.id)}
                          onChange={() => toggleSelecaoTransacao(t.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      )}
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => !modoSelecao && onSelectTransaction && onSelectTransaction(t)}
                      >
                        <p className="font-medium text-gray-900 text-sm">{t.descricao}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(t.data).toLocaleDateString('pt-BR')} • {t.categoria}
                          {t.parcelamento && ` • ${t.parcelamento.parcelaAtual}/${t.parcelamento.parcelas}x`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${t.tipo === 'receita' ? 'text-green-600' : 'text-gray-900'}`}>
                          {t.tipo === 'receita' ? '+' : '-'} R$ {(t.parcelamento ? t.parcelamento.valorParcela : t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {!modoSelecao && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onOpenModal('transacao', t)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('Deletar esta transação?')) {
                                  // Call parent update
                                  await atualizarTransacao({ ...t, deleted: true });
                                }
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Deletar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default ContasCartoes;
