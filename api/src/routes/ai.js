import { Router } from 'express';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Decimal } from 'decimal.js';

const router = Router();

// In-memory cache: { [key]: { data, expiresAt } }
const cache = new Map();

const analyzeSchema = z.object({
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000).max(2100),
  transacoes: z.array(z.object({
    tipo: z.enum(['receita', 'despesa']),
    valor: z.number(),
    categoria: z.string(),
    descricao: z.string().optional(),
    data: z.string(),
    status: z.string(),
  })).max(5000),
});

const buildPrompt = (mes, ano, receitas, despesas, porCategoria) => {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const nomeMes = meses[mes - 1];
  const saldo = new Decimal(receitas).minus(despesas).toFixed(2);

  const categoriaTexto = Object.entries(porCategoria)
    .sort(([,a],[,b]) => b - a)
    .map(([cat, val]) => `  - ${cat}: R$ ${val.toFixed(2)}`)
    .join('\n');

  return `Você é um consultor financeiro pessoal. Analise os dados financeiros de ${nomeMes}/${ano} e forneça insights úteis em português brasileiro.

RESUMO DO MÊS:
- Total de Receitas: R$ ${new Decimal(receitas).toFixed(2)}
- Total de Despesas: R$ ${new Decimal(despesas).toFixed(2)}
- Saldo: R$ ${saldo}

DESPESAS POR CATEGORIA:
${categoriaTexto}

Por favor, forneça:
1. **Avaliação geral** do mês (2-3 frases)
2. **Principais pontos de atenção** (até 3 itens com emoji)
3. **Categoria com maior gasto** e se está dentro do esperado
4. **Dica prática** de economia para o próximo mês
5. **Saúde financeira**: nota de 0-10 com justificativa breve

Seja direto, use linguagem simples e forneça números concretos. Evite respostas genéricas.`;
};

router.post('/analyze', async (req, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });

  const { mes, ano, transacoes } = parsed.data;
  const cacheKey = `${req.uid}:${ano}-${String(mes).padStart(2,'0')}`;

  // Check cache (24h TTL)
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ...cached.data, fromCache: true });
  }

  const transacoesValidas = transacoes.filter(t =>
    !['pendente'].includes(t.status)
  );

  const receitas = transacoesValidas
    .filter(t => t.tipo === 'receita')
    .reduce((acc, t) => acc.plus(new Decimal(t.valor)), new Decimal(0))
    .toNumber();

  const despesas = transacoesValidas
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc.plus(new Decimal(t.valor)), new Decimal(0))
    .toNumber();

  const porCategoria = transacoesValidas
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => {
      const cat = t.categoria || 'Outros';
      acc[cat] = (acc[cat] || 0) + t.valor;
      return acc;
    }, {});

  if (!process.env.GEMINI_API_KEY) {
    // Fallback: rule-based analysis when no API key configured
    const topCategoria = Object.entries(porCategoria).sort(([,a],[,b]) => b - a)[0];
    return res.json({
      analise: `Em ${mes}/${ano} você teve R$ ${receitas.toFixed(2)} de receitas e R$ ${despesas.toFixed(2)} de despesas. Saldo: R$ ${(receitas - despesas).toFixed(2)}.`,
      insights: [
        topCategoria ? `💸 Maior gasto: ${topCategoria[0]} (R$ ${topCategoria[1].toFixed(2)})` : null,
        despesas > receitas ? '⚠️ Despesas superaram receitas este mês' : '✅ Receitas superaram despesas',
      ].filter(Boolean),
      notaSaude: receitas > despesas ? Math.min(10, Math.round((receitas / despesas) * 6)) : 3,
      resumo: { receitas, despesas, saldo: receitas - despesas, porCategoria },
      fromCache: false,
    });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = buildPrompt(mes, ano, receitas, despesas, porCategoria);
  const result = await model.generateContent(prompt);
  const analiseTexto = result.response.text();

  const responseData = {
    analise: analiseTexto,
    resumo: { receitas, despesas, saldo: receitas - despesas, porCategoria },
    fromCache: false,
  };

  cache.set(cacheKey, { data: responseData, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });

  res.json(responseData);
});

export default router;
