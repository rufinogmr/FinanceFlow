// Utilitários para formatação de datas e valores

/**
 * Formata uma string de data "YYYY-MM-DD" para o formato brasileiro "DD/MM/YYYY"
 * Evita problemas de timezone que ocorrem ao usar new Date(string)
 */
export const formatDateToBr = (dateString, options = {}) => {
  if (!dateString) return '-';

  // Se já for um objeto Date, converter (com risco de timezone, mas aceitável se for local)
  if (dateString instanceof Date) {
    return dateString.toLocaleDateString('pt-BR', options);
  }

  // Se for string YYYY-MM-DD
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);

    // Se a opção pedir nome do mês, precisamos usar Date, mas construindo localmente
    if (options.month === 'short' || options.month === 'long') {
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('pt-BR', options);
    }

    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  // Fallback para outros formatos
  return new Date(dateString).toLocaleDateString('pt-BR', options);
};
