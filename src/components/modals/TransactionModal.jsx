import React, { useState, useEffect } from 'react';
import { Tag, X, Wallet, CreditCard } from 'lucide-react';

const TransactionModal = ({ isOpen, onClose, onSave, initialData, contas, cartoes, context }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Se for contexto de cartão, o tipo é sempre 'despesa' e não precisa validar
    const tipoFinal = context === 'cartao' ? 'despesa' : formData.tipo;

    if (!tipoFinal || !formData.descricao || !formData.valor || !formData.data || !formData.categoria) {
      alert('Por favor, preencha todos os campos obrigatórios (Tipo, Descrição, Valor, Data e Categoria)');
      return;
    }

    if (!formData.contaId && !formData.cartaoId) {
      alert('Por favor, selecione uma forma de pagamento (Conta Bancária ou Cartão de Crédito)');
      return;
    }

    // VALIDAÇÃO IMPORTANTE: Não permitir receita com cartão de crédito
    if (formData.cartaoId && tipoFinal === 'receita') {
      alert('❌ Erro: Não é possível ter uma RECEITA em cartão de crédito! Cartões só podem ter DESPESAS.');
      return;
    }

    const baseTransaction = {
      id: formData.id || Date.now(),
      tipo: tipoFinal,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      data: formData.data,
      categoria: formData.categoria,
      contaId: formData.contaId || null,
      cartaoId: formData.cartaoId || null,
      status: formData.status || 'confirmado',
      dataCriacao: formData.dataCriacao || new Date().toISOString(),
      tags: formData.tags || []
    };

    // Lógica de Parcelamento (CORREÇÃO DE BUG)
    if (formData.parcelado && formData.numeroParcelas && !formData.id) { // Só aplica para novas transações
      const numParcelas = parseInt(formData.numeroParcelas);
      const valorTotal = parseFloat(formData.valor);
      const valorParcela = valorTotal / numParcelas;

      const transactionsToSave = [];

      for (let i = 0; i < numParcelas; i++) {
        const parcelaAtual = i + 1;

        // Calcular data da parcela (incrementar mês)
        const dataParcela = new Date(formData.data);
        dataParcela.setMonth(dataParcela.getMonth() + i);

        const transacaoParcela = {
          ...baseTransaction,
          id: Date.now() + i, // IDs únicos sequenciais
          descricao: `${baseTransaction.descricao} (${parcelaAtual}/${numParcelas})`,
          valor: valorParcela, // O valor da transação é o valor da parcela
          data: dataParcela.toISOString().split('T')[0],
          parcelamento: {
            parcelas: numParcelas,
            valorParcela: valorParcela,
            parcelaAtual: parcelaAtual
          }
        };

        transactionsToSave.push(transacaoParcela);
      }

      // Enviar lista de transações para o onSave
      // Note: onSave precisa saber lidar com array ou chamar múltiplas vezes
      // Para manter compatibilidade simples, vou assumir que onSave pode receber um array ou único objeto
      // Mas o App.tsx espera um objeto. Vou modificar o comportamento:

      // Como não posso mudar a assinatura do onSave no App.tsx facilmente sem refatorar tudo,
      // vou chamar onSave para cada parcela.

      for (const t of transactionsToSave) {
        await onSave(t);
      }
    } else {
      // Se for edição ou não for parcelado
      if (formData.parcelado && formData.numeroParcelas) {
        // Se for edição e tiver dados de parcelamento, mantém
        baseTransaction.parcelamento = {
            parcelas: parseInt(formData.numeroParcelas),
            valorParcela: parseFloat(formData.valor) / parseInt(formData.numeroParcelas),
            parcelaAtual: formData.parcelaAtual || 1
        };
      }
      await onSave(baseTransaction);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {initialData?.id ? 'Editar Transação' : (context === 'cartao' ? 'Nova Compra no Cartão' : 'Nova Transação')}
        </h3>

        <div className="space-y-4">
          {/* Mostrar campo Tipo apenas se NÃO for contexto de cartão */}
          {context !== 'cartao' && (
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
          )}

          {/* Mostrar aviso se for cartão */}
          {context === 'cartao' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Compra no cartão de crédito</strong> - Será lançada como despesa na fatura
              </p>
            </div>
          )}

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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
              {(formData.contaId || formData.cartaoId) && (
                <button
                  type="button"
                  onClick={() => setFormData({...formData, contaId: null, cartaoId: null})}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Alterar
                </button>
              )}
            </div>

            {!formData.contaId && !formData.cartaoId ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, contaId: contas[0]?.id, cartaoId: null})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-blue-600" />
                    <span className="font-medium text-gray-900">Conta Bancária</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, cartaoId: cartoes[0]?.id, contaId: null})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-purple-600" />
                    <span className="font-medium text-gray-900">Cartão de Crédito</span>
                  </div>
                </button>
              </div>
            ) : formData.contaId ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Conta Bancária</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.contaId || ''}
                  onChange={(e) => setFormData({...formData, contaId: parseInt(e.target.value)})}
                >
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            ) : formData.cartaoId ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Cartão de Crédito</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    value={formData.cartaoId || ''}
                    onChange={(e) => setFormData({...formData, cartaoId: parseInt(e.target.value)})}
                  >
                    {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.parcelado || false}
                    onChange={(e) => setFormData({...formData, parcelado: e.target.checked})}
                  />
                  <span className="text-sm">Parcelado</span>
                </label>

                {formData.parcelado && (
                  <div>
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
            ) : null}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
