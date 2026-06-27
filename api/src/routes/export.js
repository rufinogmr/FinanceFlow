import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { getUserTransacoes } from '../services/firebase.js';

const router = Router();

const CATEGORIA_CORES = {
  Alimentação: 'FFD9534F',
  Transporte: 'FF5BC0DE',
  Moradia: 'FF5CB85C',
  Saúde: 'FFFF0000',
  Educação: 'FF9B59B6',
  Lazer: 'FFF0AD4E',
  Assinaturas: 'FF1ABC9C',
  Salário: 'FF27AE60',
  Investimento: 'FF2980B9',
  Outros: 'FF95A5A6',
};

const filtrosSchema = z.object({
  mesAno: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  categoria: z.string().optional(),
  tipo: z.enum(['receita', 'despesa']).optional(),
});

router.post('/xlsx', async (req, res) => {
  const parsed = filtrosSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Filtros inválidos', details: parsed.error.issues });

  const transacoes = await getUserTransacoes(req.uid, parsed.data);

  const filtradas = transacoes.filter(t => {
    if (parsed.data.categoria && t.categoria !== parsed.data.categoria) return false;
    if (parsed.data.tipo && t.tipo !== parsed.data.tipo) return false;
    return true;
  }).sort((a, b) => a.data.localeCompare(b.data));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FinanceFlow';
  wb.created = new Date();

  const ws = wb.addWorksheet('Transações', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Data', key: 'data', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Descrição', key: 'descricao', width: 35 },
    { header: 'Categoria', key: 'categoria', width: 18 },
    { header: 'Valor (R$)', key: 'valor', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Tags', key: 'tags', width: 20 },
  ];

  // Header styling
  ws.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF2980B9' } } };
  });
  ws.getRow(1).height = 22;

  let totalReceitas = 0;
  let totalDespesas = 0;

  filtradas.forEach((t, i) => {
    const row = ws.addRow({
      data: t.data,
      tipo: t.tipo === 'receita' ? 'Receita' : 'Despesa',
      descricao: t.descricao || '',
      categoria: t.categoria || '',
      valor: t.valor,
      status: t.status || '',
      tags: Array.isArray(t.tags) ? t.tags.join(', ') : '',
    });

    const isReceita = t.tipo === 'receita';
    if (isReceita) totalReceitas += t.valor;
    else totalDespesas += t.valor;

    const bgColor = i % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { vertical: 'middle' };
    });

    // Valor cell: green for income, red for expense
    const valorCell = row.getCell('valor');
    valorCell.numFmt = 'R$ #,##0.00';
    valorCell.font = { color: { argb: isReceita ? 'FF27AE60' : 'FFE74C3C' }, bold: true };

    // Categoria color badge
    const catColor = CATEGORIA_CORES[t.categoria] || 'FF95A5A6';
    row.getCell('categoria').font = { color: { argb: catColor }, bold: true };
  });

  // Summary row
  const summaryRow = filtradas.length + 3;
  ws.getCell(`D${summaryRow}`).value = 'Total Receitas';
  ws.getCell(`D${summaryRow}`).font = { bold: true };
  ws.getCell(`E${summaryRow}`).value = totalReceitas;
  ws.getCell(`E${summaryRow}`).numFmt = 'R$ #,##0.00';
  ws.getCell(`E${summaryRow}`).font = { color: { argb: 'FF27AE60' }, bold: true };

  ws.getCell(`D${summaryRow + 1}`).value = 'Total Despesas';
  ws.getCell(`D${summaryRow + 1}`).font = { bold: true };
  ws.getCell(`E${summaryRow + 1}`).value = totalDespesas;
  ws.getCell(`E${summaryRow + 1}`).numFmt = 'R$ #,##0.00';
  ws.getCell(`E${summaryRow + 1}`).font = { color: { argb: 'FFE74C3C' }, bold: true };

  ws.getCell(`D${summaryRow + 2}`).value = 'Saldo';
  ws.getCell(`D${summaryRow + 2}`).font = { bold: true };
  const saldo = totalReceitas - totalDespesas;
  ws.getCell(`E${summaryRow + 2}`).value = saldo;
  ws.getCell(`E${summaryRow + 2}`).numFmt = 'R$ #,##0.00';
  ws.getCell(`E${summaryRow + 2}`).font = {
    color: { argb: saldo >= 0 ? 'FF27AE60' : 'FFE74C3C' },
    bold: true,
    size: 12,
  };

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `financeflow_${parsed.data.mesAno || 'exportacao'}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export default router;
