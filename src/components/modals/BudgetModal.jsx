import React, { useState, useEffect } from 'react';

const BudgetModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.categoria || !formData.limite) {
      alert('Por favor, preencha todos os campos obrigatórios (Categoria e Limite)');
      return;
    }

    onSave({
      ...formData,
      limite: parseFloat(formData.limite)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {initialData?.id ? 'Editar Orçamento' : 'Novo Orçamento'}
        </h3>

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

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;
