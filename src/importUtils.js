import OFXParser from 'ofx-js';
import Papa from 'papaparse';

/**
 * Mapeia categoria do extrato para categoria do sistema
 */
const mapearCategoria = (descricao) => {
  const descricaoLower = descricao.toLowerCase();

  // Mapeamento baseado em palavras-chave
  if (descricaoLower.includes('mercado') || descricaoLower.includes('supermercado') ||
      descricaoLower.includes('restaurante') || descricaoLower.includes('ifood') ||
      descricaoLower.includes('uber eats') || descricaoLower.includes('alimenta')) {
    return 'Alimentação';
  }
  if (descricaoLower.includes('uber') || descricaoLower.includes('99') ||
      descricaoLower.includes('transporte') || descricaoLower.includes('combustivel') ||
      descricaoLower.includes('gasolina') || descricaoLower.includes('metro') ||
      descricaoLower.includes('onibus')) {
    return 'Transporte';
  }
  if (descricaoLower.includes('aluguel') || descricaoLower.includes('condominio') ||
      descricaoLower.includes('luz') || descricaoLower.includes('agua') ||
      descricaoLower.includes('gas') || descricaoLower.includes('energia')) {
    return 'Moradia';
  }
  if (descricaoLower.includes('farmacia') || descricaoLower.includes('hospital') ||
      descricaoLower.includes('medic') || descricaoLower.includes('saude') ||
      descricaoLower.includes('clinica')) {
    return 'Saúde';
  }
  if (descricaoLower.includes('escola') || descricaoLower.includes('curso') ||
      descricaoLower.includes('faculdade') || descricaoLower.includes('educacao') ||
      descricaoLower.includes('livro')) {
    return 'Educação';
  }
  if (descricaoLower.includes('cinema') || descricaoLower.includes('show') ||
      descricaoLower.includes('lazer') || descricaoLower.includes('spotify') ||
      descricaoLower.includes('streaming')) {
    return 'Lazer';
  }
  if (descricaoLower.includes('netflix') || descricaoLower.includes('amazon prime') ||
      descricaoLower.includes('disney') || descricaoLower.includes('assinatura')) {
    return 'Assinaturas';
  }
  if (descricaoLower.includes('salario') || descricaoLower.includes('pagamento')) {
    return 'Salário';
  }
  if (descricaoLower.includes('investimento') || descricaoLower.includes('aplicacao') ||
      descricaoLower.includes('renda fixa') || descricaoLower.includes('tesouro')) {
    return 'Investimento';
  }

  // Default para categoria genérica
  return 'Outros';
};

/**
 * Converte data de diferentes formatos para YYYY-MM-DD
 */
const formatarData = (data) => {
  if (!data) return new Date().toISOString().split('T')[0];

  // Se já está no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }

  // Tenta parsear como Date
  let dataObj;
  if (data instanceof Date) {
    dataObj = data;
  } else if (typeof data === 'string') {
    // Formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      const [dia, mes, ano] = data.split('/');
      dataObj = new Date(ano, mes - 1, dia);
    }
    // Formato YYYYMMDD (comum em OFX)
    else if (/^\d{8}$/.test(data)) {
      const ano = data.substring(0, 4);
      const mes = data.substring(4, 6);
      const dia = data.substring(6, 8);
      dataObj = new Date(ano, mes - 1, dia);
    }
    // Tenta parsear diretamente
    else {
      dataObj = new Date(data);
    }
  }

  if (dataObj && !isNaN(dataObj.getTime())) {
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // Fallback: data atual
  return new Date().toISOString().split('T')[0];
};

/**
 * Parser para arquivos OFX
 * @param {string} conteudo - Conteúdo do arquivo OFX
 * @returns {Promise<Array>} Array de transações
 */
export const parseOFX = async (conteudo) => {
  try {
    const parser = new OFXParser();
    const ofxData = parser.parse(conteudo);

    const transacoes = [];

    // OFX pode ter múltiplas contas
    const statements = ofxData.OFX?.BANKMSGSRSV1?.STMTTRNRS ||
                       ofxData.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS || [];

    // Normaliza para array
    const statementsArray = Array.isArray(statements) ? statements : [statements];

    for (const statement of statementsArray) {
      const stmtrs = statement.STMTRS || statement.CCSTMTRS;
      if (!stmtrs) continue;

      const transactionList = stmtrs.BANKTRANLIST || stmtrs.BANKTRANLIST;
      if (!transactionList || !transactionList.STMTTRN) continue;

      const transactions = Array.isArray(transactionList.STMTTRN)
        ? transactionList.STMTTRN
        : [transactionList.STMTTRN];

      for (const trn of transactions) {
        const valor = Math.abs(parseFloat(trn.TRNAMT || 0));
        const tipo = parseFloat(trn.TRNAMT || 0) >= 0 ? 'receita' : 'despesa';
        const descricao = trn.MEMO || trn.NAME || 'Transação importada';

        transacoes.push({
          tipo,
          valor,
          data: formatarData(trn.DTPOSTED),
          categoria: mapearCategoria(descricao),
          descricao,
          status: 'confirmado'
        });
      }
    }

    return transacoes;
  } catch (erro) {
    console.error('Erro ao parsear OFX:', erro);
    throw new Error(`Erro ao processar arquivo OFX: ${erro.message}`);
  }
};

/**
 * Parser para arquivos CSV
 * Formatos aceitos:
 * - Formato FinanceFlow: data,tipo,valor,categoria,descricao
 * - Formato Banco: data,descricao,valor (deduz tipo pelo sinal)
 * @param {string} conteudo - Conteúdo do arquivo CSV
 * @returns {Promise<Array>} Array de transações
 */
export const parseCSV = async (conteudo) => {
  return new Promise((resolve, reject) => {
    Papa.parse(conteudo, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transacoes = [];

          for (const row of results.data) {
            // Normaliza nomes das colunas (case-insensitive)
            const rowNormalizada = {};
            for (const [key, value] of Object.entries(row)) {
              rowNormalizada[key.toLowerCase().trim()] = value;
            }

            let transacao = {};

            // Formato FinanceFlow (exportado pelo próprio sistema)
            if (rowNormalizada.data && rowNormalizada.tipo && rowNormalizada.valor) {
              transacao = {
                data: formatarData(rowNormalizada.data),
                tipo: rowNormalizada.tipo.toLowerCase() === 'receita' ? 'receita' : 'despesa',
                valor: Math.abs(parseFloat(rowNormalizada.valor.toString().replace(/[^\d.,]/g, '').replace(',', '.'))),
                categoria: rowNormalizada.categoria || 'Outros',
                descricao: rowNormalizada.descricao || rowNormalizada.descrição || 'Importado',
                status: 'confirmado'
              };
            }
            // Formato genérico de banco (data, descrição, valor)
            else if (rowNormalizada.data && rowNormalizada.valor) {
              const valorStr = rowNormalizada.valor.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
              const valor = parseFloat(valorStr);
              const descricao = rowNormalizada.descricao ||
                               rowNormalizada.descrição ||
                               rowNormalizada.historico ||
                               rowNormalizada.memo ||
                               'Importado';

              transacao = {
                data: formatarData(rowNormalizada.data),
                tipo: valor >= 0 ? 'receita' : 'despesa',
                valor: Math.abs(valor),
                categoria: mapearCategoria(descricao),
                descricao,
                status: 'confirmado'
              };
            }
            // Tenta outros formatos comuns
            else if ((rowNormalizada.data || rowNormalizada.date) &&
                     (rowNormalizada.amount || rowNormalizada.value)) {
              const valorStr = (rowNormalizada.amount || rowNormalizada.value).toString()
                .replace(/[^\d.,-]/g, '').replace(',', '.');
              const valor = parseFloat(valorStr);
              const descricao = rowNormalizada.description ||
                               rowNormalizada.memo ||
                               rowNormalizada.descricao ||
                               'Importado';

              transacao = {
                data: formatarData(rowNormalizada.data || rowNormalizada.date),
                tipo: valor >= 0 ? 'receita' : 'despesa',
                valor: Math.abs(valor),
                categoria: mapearCategoria(descricao),
                descricao,
                status: 'confirmado'
              };
            }

            // Valida se a transação tem os campos obrigatórios
            if (transacao.data && transacao.valor && transacao.tipo) {
              transacoes.push(transacao);
            }
          }

          if (transacoes.length === 0) {
            reject(new Error('Nenhuma transação válida encontrada no arquivo CSV. Verifique o formato.'));
          } else {
            resolve(transacoes);
          }
        } catch (erro) {
          reject(new Error(`Erro ao processar CSV: ${erro.message}`));
        }
      },
      error: (erro) => {
        reject(new Error(`Erro ao parsear CSV: ${erro.message}`));
      }
    });
  });
};

/**
 * Importa arquivo e retorna transações processadas
 * @param {File} arquivo - Arquivo a ser importado
 * @returns {Promise<Array>} Array de transações
 */
export const importarArquivo = async (arquivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const conteudo = e.target.result;
        const nomeArquivo = arquivo.name.toLowerCase();

        let transacoes = [];

        if (nomeArquivo.endsWith('.ofx')) {
          transacoes = await parseOFX(conteudo);
        } else if (nomeArquivo.endsWith('.csv')) {
          transacoes = await parseCSV(conteudo);
        } else {
          reject(new Error('Formato de arquivo não suportado. Use .ofx ou .csv'));
          return;
        }

        resolve(transacoes);
      } catch (erro) {
        reject(erro);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };

    reader.readAsText(arquivo);
  });
};
