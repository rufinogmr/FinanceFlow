import { describe, it, expect } from 'vitest';
import {
  calcularSaldoConta,
  determinarFaturaTransacao,
  calcularStatusFatura,
  calcularTotalFatura,
  calcularPeriodoFatura,
  calcularReceitasMes,
  calcularDespesasMes,
} from '../financeLogic';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTransaction = (overrides) => ({
  id: Math.random(),
  tipo: 'despesa',
  valor: 100,
  data: '2024-04-15',
  status: 'confirmado',
  contaId: 1,
  cartaoId: null,
  categoria: 'Alimentação',
  deleted: false,
  ...overrides,
});

const makeAccount = (overrides) => ({
  id: 1,
  saldoInicial: 1000,
  saldo: 1000,
  ...overrides,
});

const makeCard = (overrides) => ({
  id: 1,
  diaFechamento: 20,
  diaVencimento: 5,
  ...overrides,
});

// ─── calcularSaldoConta ───────────────────────────────────────────────────────

describe('calcularSaldoConta', () => {
  it('returns saldoInicial when there are no transactions', () => {
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 500 }), [])).toBe(500);
  });

  it('adds income to saldoInicial', () => {
    const t = makeTransaction({ tipo: 'receita', valor: 300, contaId: 1, cartaoId: null });
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 1000 }), [t])).toBe(1300);
  });

  it('subtracts expenses from saldoInicial', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 200, contaId: 1, cartaoId: null });
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 1000 }), [t])).toBe(800);
  });

  it('ignores transactions from other accounts', () => {
    const t = makeTransaction({ tipo: 'receita', valor: 999, contaId: 99 });
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 500 }), [t])).toBe(500);
  });

  it('ignores credit card transactions (cartaoId set)', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 500, contaId: 1, cartaoId: 7 });
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 1000 }), [t])).toBe(1000);
  });

  it('ignores soft-deleted transactions', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 200, contaId: 1, deleted: true });
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 1000 }), [t])).toBe(1000);
  });

  it('ignores pending/scheduled transactions', () => {
    const pending = makeTransaction({ tipo: 'receita', valor: 400, contaId: 1, status: 'agendado' });
    const pendente = makeTransaction({ tipo: 'receita', valor: 400, contaId: 1, status: 'pendente' });
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 1000 }), [pending, pendente])).toBe(1000);
  });

  it('handles missing saldoInicial gracefully (defaults to 0)', () => {
    const conta = { id: 1, saldo: 0 };
    const t = makeTransaction({ tipo: 'receita', valor: 100, contaId: 1 });
    expect(calcularSaldoConta(conta, [t])).toBe(100);
  });

  it('handles floating point precision correctly', () => {
    const transactions = [
      makeTransaction({ tipo: 'receita', valor: 100.10, contaId: 1 }),
      makeTransaction({ tipo: 'despesa', valor: 50.05, contaId: 1 }),
    ];
    const result = calcularSaldoConta(makeAccount({ saldoInicial: 0 }), transactions);
    expect(result).toBeCloseTo(50.05, 10);
  });

  it('does not count invoice payments as credit card transactions', () => {
    // Invoice payment: contaId set, cartaoId: null — SHOULD affect balance
    const payment = makeTransaction({
      tipo: 'despesa',
      valor: 800,
      contaId: 1,
      cartaoId: null,
      categoria: 'Fatura Cartão',
    });
    expect(calcularSaldoConta(makeAccount({ saldoInicial: 1000 }), [payment])).toBe(200);
  });
});

// ─── determinarFaturaTransacao ────────────────────────────────────────────────

describe('determinarFaturaTransacao', () => {
  const card = makeCard({ diaFechamento: 20 });

  it('assigns transaction on closing day to current month', () => {
    const t = makeTransaction({ data: '2024-04-20' });
    expect(determinarFaturaTransacao(t, card)).toBe('2024-04');
  });

  it('assigns transaction before closing day to current month', () => {
    const t = makeTransaction({ data: '2024-04-10' });
    expect(determinarFaturaTransacao(t, card)).toBe('2024-04');
  });

  it('assigns transaction after closing day to next month', () => {
    const t = makeTransaction({ data: '2024-04-21' });
    expect(determinarFaturaTransacao(t, card)).toBe('2024-05');
  });

  it('correctly wraps December to January of next year', () => {
    const t = makeTransaction({ data: '2024-12-25' }); // after closing day 20
    expect(determinarFaturaTransacao(t, card)).toBe('2025-01');
  });

  it('handles January before closing day (stays in January)', () => {
    const t = makeTransaction({ data: '2024-01-15' }); // before closing day 20
    expect(determinarFaturaTransacao(t, card)).toBe('2024-01');
  });

  it('pads single-digit months', () => {
    const t = makeTransaction({ data: '2024-03-05' });
    expect(determinarFaturaTransacao(t, card)).toBe('2024-03');
  });
});

// ─── calcularStatusFatura ────────────────────────────────────────────────────

describe('calcularStatusFatura', () => {
  const BASE = {
    dataFechamento: '2024-04-20',
    dataVencimento: '2024-05-05',
    pago: false,
  };

  it('returns "paga" when fatura.pago is true, regardless of dates', () => {
    const hoje = new Date('2024-06-01');
    expect(calcularStatusFatura({ ...BASE, pago: true }, hoje)).toBe('paga');
  });

  it('returns "aberta" when hoje is before fechamento', () => {
    const hoje = new Date('2024-04-10T12:00:00');
    expect(calcularStatusFatura(BASE, hoje)).toBe('aberta');
  });

  it('returns "fechada" when hoje is after fechamento but before vencimento', () => {
    const hoje = new Date('2024-04-25T12:00:00');
    expect(calcularStatusFatura(BASE, hoje)).toBe('fechada');
  });

  it('returns "vencida" when hoje is after vencimento', () => {
    const hoje = new Date('2024-05-10T12:00:00');
    expect(calcularStatusFatura(BASE, hoje)).toBe('vencida');
  });
});

// ─── calcularTotalFatura ─────────────────────────────────────────────────────

describe('calcularTotalFatura', () => {
  const periodo = { dataInicio: '2024-03-21', dataFim: '2024-04-20' };
  const cartaoId = 5;

  it('sums transactions within the period for the given card', () => {
    const transactions = [
      makeTransaction({ cartaoId, valor: 200, data: '2024-04-10' }),
      makeTransaction({ cartaoId, valor: 150, data: '2024-03-25' }),
    ];
    expect(calcularTotalFatura(cartaoId, periodo, transactions)).toBe(350);
  });

  it('excludes transactions outside the period', () => {
    const transactions = [
      makeTransaction({ cartaoId, valor: 500, data: '2024-03-15' }), // before start
      makeTransaction({ cartaoId, valor: 500, data: '2024-04-25' }), // after end
    ];
    expect(calcularTotalFatura(cartaoId, periodo, transactions)).toBe(0);
  });

  it('excludes transactions from other cards', () => {
    const t = makeTransaction({ cartaoId: 99, valor: 300, data: '2024-04-10' });
    expect(calcularTotalFatura(cartaoId, periodo, [t])).toBe(0);
  });

  it('excludes invoice payment transactions (categoria "Fatura Cartão")', () => {
    const t = makeTransaction({ cartaoId, valor: 800, data: '2024-04-10', categoria: 'Fatura Cartão' });
    expect(calcularTotalFatura(cartaoId, periodo, [t])).toBe(0);
  });

  it('excludes soft-deleted transactions', () => {
    const t = makeTransaction({ cartaoId, valor: 300, data: '2024-04-10', deleted: true });
    expect(calcularTotalFatura(cartaoId, periodo, [t])).toBe(0);
  });

  it('includes transactions on boundary dates (inclusive)', () => {
    const start = makeTransaction({ cartaoId, valor: 100, data: '2024-03-21' });
    const end = makeTransaction({ cartaoId, valor: 100, data: '2024-04-20' });
    expect(calcularTotalFatura(cartaoId, periodo, [start, end])).toBe(200);
  });

  it('returns 0 when no transactions exist', () => {
    expect(calcularTotalFatura(cartaoId, periodo, [])).toBe(0);
  });
});

// ─── calcularPeriodoFatura ───────────────────────────────────────────────────

describe('calcularPeriodoFatura', () => {
  // Card closes on day 20, due on day 5 (next month relative to closing)
  const card = makeCard({ diaFechamento: 20, diaVencimento: 5 });

  it('when date is before closing day: period ends on closing day of current month', () => {
    const result = calcularPeriodoFatura(card, '2024-04-10');
    expect(result.dataFim).toBe('2024-04-20');
    expect(result.mesReferencia).toBe('2024-04');
  });

  it('when date is on closing day: period ends on closing day of current month', () => {
    const result = calcularPeriodoFatura(card, '2024-04-20');
    expect(result.dataFim).toBe('2024-04-20');
    expect(result.mesReferencia).toBe('2024-04');
  });

  it('when date is after closing day: period ends on closing day of next month', () => {
    const result = calcularPeriodoFatura(card, '2024-04-25');
    expect(result.dataFim).toBe('2024-05-20');
    expect(result.mesReferencia).toBe('2024-05');
  });

  it('calculates dataInicio as day after closing of previous period', () => {
    // Before closing: period starts on closing+1 of previous month
    const result = calcularPeriodoFatura(card, '2024-04-10');
    expect(result.dataInicio).toBe('2024-03-21');
  });

  it('calculates dataVencimento when diaVencimento < diaFechamento (next month)', () => {
    // diaVencimento=5 < diaFechamento=20, so due date is in month after closing
    const result = calcularPeriodoFatura(card, '2024-04-10');
    expect(result.dataVencimento).toBe('2024-05-05');
  });

  it('calculates dataVencimento when diaVencimento >= diaFechamento (same month)', () => {
    const cardSameMonth = makeCard({ diaFechamento: 10, diaVencimento: 25 });
    const result = calcularPeriodoFatura(cardSameMonth, '2024-04-05');
    // Period ends April 10, due April 25
    expect(result.dataVencimento).toBe('2024-04-25');
  });

  it('handles year boundary correctly (December → January)', () => {
    const result = calcularPeriodoFatura(card, '2024-12-25');
    expect(result.dataFim).toBe('2025-01-20');
    expect(result.mesReferencia).toBe('2025-01');
  });

  it('accepts Date object as dataReferencia', () => {
    const result = calcularPeriodoFatura(card, new Date(2024, 3, 10)); // April 10
    expect(result.mesReferencia).toBe('2024-04');
  });
});

// ─── calcularReceitasMes ──────────────────────────────────────────────────────

describe('calcularReceitasMes', () => {
  it('sums confirmed income for the given month/year', () => {
    const transactions = [
      makeTransaction({ tipo: 'receita', valor: 1000, data: '2024-04-01', status: 'confirmado' }),
      makeTransaction({ tipo: 'receita', valor: 500, data: '2024-04-30', status: 'confirmado' }),
    ];
    expect(calcularReceitasMes(transactions, 3, 2024)).toBe(1500); // mes=3 → April
  });

  it('excludes income from other months', () => {
    const t = makeTransaction({ tipo: 'receita', valor: 999, data: '2024-03-15', status: 'confirmado' });
    expect(calcularReceitasMes([t], 3, 2024)).toBe(0);
  });

  it('excludes income from other years', () => {
    const t = makeTransaction({ tipo: 'receita', valor: 999, data: '2023-04-10', status: 'confirmado' });
    expect(calcularReceitasMes([t], 3, 2024)).toBe(0);
  });

  it('excludes scheduled/pending income', () => {
    const t = makeTransaction({ tipo: 'receita', valor: 999, data: '2024-04-10', status: 'agendado' });
    expect(calcularReceitasMes([t], 3, 2024)).toBe(0);
  });

  it('excludes deleted income', () => {
    const t = makeTransaction({ tipo: 'receita', valor: 999, data: '2024-04-10', deleted: true });
    expect(calcularReceitasMes([t], 3, 2024)).toBe(0);
  });

  it('excludes expenses (only income counts)', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 500, data: '2024-04-10', status: 'confirmado' });
    expect(calcularReceitasMes([t], 3, 2024)).toBe(0);
  });
});

// ─── calcularDespesasMes ─────────────────────────────────────────────────────

describe('calcularDespesasMes', () => {
  it('sums confirmed expenses for the given month/year', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 300, data: '2024-04-10', status: 'confirmado' });
    expect(calcularDespesasMes([t], 3, 2024)).toBe(300);
  });

  it('includes scheduled (agendado) expenses — unlike income', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 200, data: '2024-04-15', status: 'agendado' });
    expect(calcularDespesasMes([t], 3, 2024)).toBe(200);
  });

  it('excludes pending expenses', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 200, data: '2024-04-15', status: 'pendente' });
    expect(calcularDespesasMes([t], 3, 2024)).toBe(0);
  });

  it('excludes expenses from other months', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 999, data: '2024-03-10', status: 'confirmado' });
    expect(calcularDespesasMes([t], 3, 2024)).toBe(0);
  });

  it('excludes deleted expenses', () => {
    const t = makeTransaction({ tipo: 'despesa', valor: 999, data: '2024-04-10', deleted: true });
    expect(calcularDespesasMes([t], 3, 2024)).toBe(0);
  });

  it('excludes income (only expenses count)', () => {
    const t = makeTransaction({ tipo: 'receita', valor: 500, data: '2024-04-10', status: 'confirmado' });
    expect(calcularDespesasMes([t], 3, 2024)).toBe(0);
  });
});
