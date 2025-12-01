import React, { useState, useEffect } from 'react';

const RecurrentExpenseModal = ({ isOpen, onClose, onSave, initialData, contas }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.descricao || !formData.categoria || !formData.valor || !formData.frequencia || !formData.proximaData) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    onSave({
      ...formData,
      valor: parseFloat(formData.valor),
      contaId: formData.contaId ? parseInt(formData.contaId) : null,
      ativa: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {initialData?.id ? 'Editar Despesa Recorrente' : 'Nova Despesa Recorrente'}
        </h3>

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
            onChange={(e) => setFormData({...formData, contaId: e.target.value})}
          >
            <option value="">Conta vinculada (opcional)</option>
            {contas && contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-900">
              ℹ️ As despesas recorrentes servem para lembrar você de pagamentos fixos. Você pode ativá-las/desativá-las quando necessário.
            </p>
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
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurrentExpenseModal;
