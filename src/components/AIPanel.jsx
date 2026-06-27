import { useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Star, Download, Loader2 } from 'lucide-react';
import { getAuth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getIdToken = async () => {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  return user.getIdToken();
};

export default function AIPanel({ transacoes }) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const transacoesMes = transacoes.filter(t => {
    const [tAno, tMes] = t.data.split('-').map(Number);
    return tMes === mes && tAno === ano && !t.deleted;
  });

  const analisar = async () => {
    setLoading(true);
    setErro('');
    setResultado(null);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mes, ano, transacoes: transacoesMes }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro na análise');
      setResultado(await res.json());
    } catch (e) {
      setErro(e.message || 'Erro ao conectar com o servidor de análise');
    } finally {
      setLoading(false);
    }
  };

  const exportarXLSX = async () => {
    setExportLoading(true);
    try {
      const token = await getIdToken();
      const mesAno = `${ano}-${String(mes).padStart(2, '0')}`;
      const res = await fetch(`${API_BASE}/api/export/xlsx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mesAno }),
      });
      if (!res.ok) throw new Error('Erro ao gerar exportação');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financeflow_${mesAno}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e.message);
    } finally {
      setExportLoading(false);
    }
  };

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-7 h-7" />
          <h2 className="text-xl font-bold">Análise com IA</h2>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-indigo-200 text-xs font-medium block mb-1">Mês</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {meses.map((m, i) => (
                <option key={i} value={i + 1} className="text-gray-800">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-indigo-200 text-xs font-medium block mb-1">Ano</label>
            <select
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="text-gray-800">{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={analisar}
            disabled={loading || transacoesMes.length === 0}
            className="flex items-center gap-2 bg-white text-indigo-700 font-semibold px-5 py-2 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {loading ? 'Analisando...' : 'Analisar'}
          </button>
          <button
            onClick={exportarXLSX}
            disabled={exportLoading || transacoesMes.length === 0}
            className="flex items-center gap-2 bg-white/20 text-white border border-white/30 font-medium px-4 py-2 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar XLSX
          </button>
        </div>

        {transacoesMes.length === 0 && (
          <p className="text-indigo-200 text-sm mt-3">Sem transações para {meses[mes-1]}/{ano}</p>
        )}
      </div>

      {/* Error */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{erro}</p>
        </div>
      )}

      {/* Results */}
      {resultado && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-600 text-xs font-medium mb-1">Receitas</p>
              <p className="text-green-700 font-bold text-lg">
                R$ {resultado.resumo.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-600 text-xs font-medium mb-1">Despesas</p>
              <p className="text-red-700 font-bold text-lg">
                R$ {resultado.resumo.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`${resultado.resumo.saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-xl p-4 text-center`}>
              <p className={`${resultado.resumo.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'} text-xs font-medium mb-1`}>Saldo</p>
              <p className={`${resultado.resumo.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'} font-bold text-lg`}>
                R$ {resultado.resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* AI Analysis text */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-800">Análise do Período</h3>
              {resultado.fromCache && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">cache</span>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {resultado.analise}
            </div>
          </div>

          {/* Top categories */}
          {resultado.resumo.porCategoria && Object.keys(resultado.resumo.porCategoria).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-800">Despesas por Categoria</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(resultado.resumo.porCategoria)
                  .sort(([,a],[,b]) => b - a)
                  .map(([cat, val]) => {
                    const pct = resultado.resumo.despesas > 0 ? (val / resultado.resumo.despesas) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{cat}</span>
                          <span className="text-gray-600 font-medium">
                            R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <span className="text-gray-400 ml-1">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {resultado.insights?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Insights Rápidos</h3>
              </div>
              <ul className="space-y-1">
                {resultado.insights.map((ins, i) => (
                  <li key={i} className="text-amber-700 text-sm">{ins}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
