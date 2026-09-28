// Leitura da coluna CPF de uma planilha (.xlsx, .xls ou .csv) para inscrição em lote.

export const EXTENSOES_ACEITAS = '.xlsx,.xls,.csv';

/** Quantas linhas do topo são examinadas procurando o cabeçalho "CPF". */
const LINHAS_PARA_ACHAR_CABECALHO = 10;

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Encontra a linha e a coluna do cabeçalho: prefere a célula exatamente "CPF"; senão, uma que contenha "cpf". */
function acharColunaCpf(linhas) {
  const limite = Math.min(linhas.length, LINHAS_PARA_ACHAR_CABECALHO);
  for (const exato of [true, false]) {
    for (let l = 0; l < limite; l++) {
      const coluna = (linhas[l] || []).findIndex((celula) =>
        exato ? normalizar(celula) === 'cpf' : normalizar(celula).includes('cpf')
      );
      if (coluna >= 0) return { linhaCabecalho: l, coluna };
    }
  }
  return null;
}

/** Só os dígitos do CPF. Números perdem o zero à esquerda no Excel, então são completados até 11 dígitos. */
function cpfDaCelula(celula) {
  if (typeof celula === 'number') {
    return Number.isInteger(celula) ? String(celula).padStart(11, '0') : '';
  }
  return String(celula ?? '').replace(/\D/g, '');
}

/**
 * Lê o arquivo e devolve os CPFs encontrados na coluna "CPF" da primeira aba.
 *
 * @returns {Promise<{cpfs: string[], duplicados: number, invalidos: {linha: number, valor: string}[], totalLinhas: number}>}
 *   cpfs: CPFs únicos com 11 dígitos; invalidos: linhas cujo valor não é um CPF (numeração igual à da planilha)
 * @throws {Error} com mensagem para o usuário se o arquivo não puder ser lido ou não tiver a coluna CPF
 */
export async function lerCpfsDaPlanilha(arquivo) {
  // Carregada sob demanda: a biblioteca é grande e só é usada aqui
  const XLSX = await import('xlsx');

  let linhas;
  let primeiraLinha; // número (base 0) da linha da planilha que corresponde a linhas[0]
  try {
    const planilha = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellText: false });
    const primeiraAba = planilha.Sheets[planilha.SheetNames[0]];
    linhas = XLSX.utils.sheet_to_json(primeiraAba, { header: 1, raw: true, defval: '', blankrows: true });
    primeiraLinha = primeiraAba['!ref'] ? XLSX.utils.decode_range(primeiraAba['!ref']).s.r : 0;
  } catch {
    throw new Error('Não foi possível ler o arquivo. Envie uma planilha .xlsx, .xls ou .csv.');
  }

  const cabecalho = acharColunaCpf(linhas);
  if (!cabecalho) {
    throw new Error('Não encontramos a coluna "CPF" no arquivo. Confira se a primeira aba tem um cabeçalho chamado CPF.');
  }

  const vistos = new Set();
  const invalidos = [];
  let duplicados = 0;
  let totalLinhas = 0;

  linhas.slice(cabecalho.linhaCabecalho + 1).forEach((linha, i) => {
    const celula = (linha || [])[cabecalho.coluna];
    if (String(celula ?? '').trim() === '') return;

    totalLinhas++;
    const cpf = cpfDaCelula(celula);
    if (cpf.length !== 11) {
      invalidos.push({ linha: primeiraLinha + cabecalho.linhaCabecalho + i + 2, valor: String(celula) });
    } else if (vistos.has(cpf)) {
      duplicados++;
    } else {
      vistos.add(cpf);
    }
  });

  return { cpfs: [...vistos], duplicados, invalidos, totalLinhas };
}
