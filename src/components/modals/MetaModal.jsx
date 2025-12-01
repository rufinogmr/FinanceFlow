import React, { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';

const MetaModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.nome || !formData.valorAlvo || !formData.prazo) {
      alert('Por favor, preencha todos os campos obrigatórios (Nome, Valor Alvo e Prazo)');
      return;
    }

    onSave({
      ...formData,
      valorAlvo: parseFloat(formData.valorAlvo),
      tags: formData.tags || []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {initialData?.id ? 'Editar Meta' : 'Nova Meta de Economia'}
        </h3>

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

export default MetaModal;
