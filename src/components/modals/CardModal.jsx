import React, { useState, useEffect } from 'react';

const CardModal = ({ isOpen, onClose, onSave, initialData, contas }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validar campos obrigatórios
    if (!formData.nome || !formData.numero || !formData.limite || !formData.bandeira) {
      alert('Por favor, preencha todos os campos obrigatórios (Nome, Número, Limite e Bandeira)');
      return;
    }

    onSave({
      ...formData,
      limite: parseFloat(formData.limite),
      diaFechamento: parseInt(formData.diaFechamento) || 1,
      diaVencimento: parseInt(formData.diaVencimento) || 10,
      contaVinculada: formData.contaVinculada ? parseInt(formData.contaVinculada) : null
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {initialData?.id ? 'Editar Cartão' : 'Novo Cartão'}
        </h3>

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
              onChange={(e) => setFormData({...formData, contaVinculada: e.target.value})}
            >
              <option value="">Selecione a conta</option>
              {contas && contas.map(c => <option key={c.id} value={c.id}>{c.nome} - {c.banco}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">A conta que será debitada ao pagar a fatura</p>
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

export default CardModal;
