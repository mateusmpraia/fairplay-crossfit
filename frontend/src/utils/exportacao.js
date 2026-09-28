// Geração de planilhas Excel no navegador (a biblioteca é carregada só quando usada).

/** Remove caracteres que não podem aparecer em nome de arquivo. */
const nomeSeguro = (nome) => nome.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Gera e baixa um arquivo .xlsx.
 *
 * @param nomeArquivo nome do arquivo, sem extensão
 * @param nomeAba     nome da aba da planilha (até 31 caracteres)
 * @param linhas      lista de objetos; as chaves do primeiro objeto viram o cabeçalho
 * @param larguras    largura (em caracteres) de cada coluna, opcional
 */
export async function baixarPlanilha(nomeArquivo, nomeAba, linhas, larguras = []) {
  const XLSX = await import('xlsx');
  const aba = XLSX.utils.json_to_sheet(linhas);
  aba['!cols'] = larguras.map((wch) => ({ wch }));
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, aba, nomeAba.slice(0, 31));
  XLSX.writeFile(livro, `${nomeSeguro(nomeArquivo)}.xlsx`);
}

/** Modelo para a importação de inscrições: a coluna CPF é a única obrigatória. */
export function baixarModeloImportacao() {
  return baixarPlanilha('modelo-inscricao-fairplay', 'Inscrições', [
    { CPF: '123.456.789-09', 'Nome (opcional)': 'Exemplo — apague esta linha' },
  ], [18, 32]);
}
