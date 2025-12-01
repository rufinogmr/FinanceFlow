import React, { useState, useEffect } from 'react';

const AccountModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validar campos obrigatórios
    if (!formData.nome || !formData.banco || !formData.tipo) {
      alert('Por favor, preencha todos os campos obrigatórios (Nome, Banco e Tipo)');
      return;
    }

    onSave({
      ...formData,
      saldo: parseFloat(formData.saldo) || 0
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {initialData?.id ? 'Editar Conta' : 'Nova Conta'}
        </h3>

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
          <div className="space-y-1">
            <label className="text-xs text-gray-500 ml-1">Saldo Inicial (Base para cálculo)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Saldo inicial"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={formData.saldoInicial !== undefined ? formData.saldoInicial : (formData.saldo || '')}
              onChange={(e) => setFormData({...formData, saldoInicial: e.target.value})}
            />
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

export default AccountModal;
