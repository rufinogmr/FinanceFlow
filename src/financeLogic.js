// Pure business logic functions extracted from App.tsx for testability.
// These functions have no React or Firebase dependencies.

/**
 * Calculates the current balance of a bank account.
 * Only confirmed, non-deleted transactions that belong to the account
 * and are NOT credit card transactions affect the balance.
 */
export const calcularSaldoConta = (conta, transacoes) => {
  const saldoInicial = conta.saldoInicial !== undefined ? parseFloat(conta.saldoInicial) : 0;

  const transacoesConta = transacoes.filter(t =>
    t.contaId === conta.id &&
    !t.cartaoId &&
    t.status === 'confirmado' &&
    !t.deleted
  );

  const receitas = transacoesConta
    .filter(t => t.tipo === 'receita')
    .reduce((acc, t) => acc + t.valor, 0);

  const despesas = transacoesConta
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc + t.valor, 0);

  return saldoInicial + receitas - despesas;
};

/**
 * Determines which invoice month (mesReferencia) a credit card transaction belongs to.
 * Transactions on or before closing day → current month's invoice.
 * Transactions after closing day → next month's invoice.
 */
export const determinarFaturaTransacao = (transacao, cartao) => {
  const [ano, mes, dia] = transacao.data.split('-').map(Number);
  const diaFechamento = cartao.diaFechamento;

  if (dia <= diaFechamento) {
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  let proximoMes = mes + 1;
  let proximoAno = ano;
  if (proximoMes > 12) {
    proximoMes = 1;
    proximoAno++;
  }
  return `${proximoAno}-${String(proximoMes).padStart(2, '0')}`;
};

/**
 * Calculates the status of a credit card invoice.
 * Accepts an optional `hoje` parameter for deterministic testing.
 */
export const calcularStatusFatura = (fatura, hoje = new Date()) => {
  if (fatura.pago) return 'paga';

  // Parse as local time to avoid UTC-offset issues with YYYY-MM-DD strings
  const vencimento = new Date(fatura.dataVencimento + 'T00:00:00');
  const fechamento = new Date(fatura.dataFechamento + 'T00:00:00');

  if (hoje > vencimento) return 'vencida';
  if (hoje > fechamento) return 'fechada';
  return 'aberta';
};

/**
 * Calculates the total value of a credit card invoice based on transactions in a period.
 * Excludes invoice-payment transactions and soft-deleted transactions.
 */
export const calcularTotalFatura = (cartaoId, periodo, transacoes) => {
  const transacoesCartao = transacoes.filter(t => {
    if (t.cartaoId !== cartaoId) return false;
    if (t.categoria === 'Fatura Cartão') return false;
    if (t.deleted) return false;
    return t.data >= periodo.dataInicio && t.data <= periodo.dataFim;
  });

  return transacoesCartao.reduce((acc, t) => acc + t.valor, 0);
};

const formatDateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Calculates the full invoice period for a credit card given a reference date.
 * Returns { dataInicio, dataFim, dataVencimento, mesReferencia }.
 *
 * Fixed: the original App.tsx version referenced an undefined `hoje` variable.
 * Here we build `hoje` from the parsed dataReferencia.
 */
export const calcularPeriodoFatura = (cartao, dataReferencia = new Date()) => {
  let ano, mes, dia;

  if (typeof dataReferencia === 'string' && dataReferencia.includes('-')) {
    [ano, mes, dia] = dataReferencia.split('-').map(Number);
    mes = mes - 1; // JS months are 0-indexed
  } else {
    const d = new Date(dataReferencia);
    ano = d.getFullYear();
    mes = d.getMonth();
    dia = d.getDate();
  }

  // Build local Date so comparisons are consistent (fixes the undefined `hoje` bug)
  const hoje = new Date(ano, mes, dia);
  const diaFechamento = cartao.diaFechamento;
  const diaVencimento = cartao.diaVencimento;

  let dataFim, dataInicio, dataVencimento;

  if (hoje.getDate() <= diaFechamento) {
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), diaFechamento);
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, diaFechamento + 1);
  } else {
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaFechamento);
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), diaFechamento + 1);
  }

  if (diaVencimento >= diaFechamento) {
    dataVencimento = new Date(dataFim.getFullYear(), dataFim.getMonth(), diaVencimento);
  } else {
    dataVencimento = new Date(dataFim.getFullYear(), dataFim.getMonth() + 1, diaVencimento);
  }

  const mesReferencia = `${dataFim.getFullYear()}-${String(dataFim.getMonth() + 1).padStart(2, '0')}`;

  return {
    dataInicio: formatDateLocal(dataInicio),
    dataFim: formatDateLocal(dataFim),
    dataVencimento: formatDateLocal(dataVencimento),
    mesReferencia,
  };
};

/**
 * Calculates total income for a given month/year.
 * mes is 0-indexed (same as Date.getMonth()).
 * Only confirmed, non-deleted transactions count.
 */
export const calcularReceitasMes = (transacoes, mes, ano) => {
  return transacoes
    .filter(t => {
      const [tAno, tMes] = t.data.split('-').map(Number);
      return t.tipo === 'receita' &&
             tMes - 1 === mes &&
             tAno === ano &&
             t.status === 'confirmado' &&
             !t.deleted;
    })
    .reduce((acc, t) => acc + t.valor, 0);
};

/**
 * Calculates total expenses for a given month/year.
 * mes is 0-indexed (same as Date.getMonth()).
 * Includes both confirmed AND scheduled (agendado) transactions.
 */
export const calcularDespesasMes = (transacoes, mes, ano) => {
  return transacoes
    .filter(t => {
      const [tAno, tMes] = t.data.split('-').map(Number);
      return t.tipo === 'despesa' &&
             tMes - 1 === mes &&
             tAno === ano &&
             (t.status === 'confirmado' || t.status === 'agendado') &&
             !t.deleted;
    })
    .reduce((acc, t) => acc + t.valor, 0);
};
