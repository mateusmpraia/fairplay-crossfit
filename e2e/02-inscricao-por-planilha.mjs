// Inscrição em lote por planilha (Excel e CSV), com prévia, resultado e modelo para baixar.
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { BASE, gerarCpf, cadastrar, logar, chamar, executarTeste } from './apoio.mjs';

const PASTA = new URL('./tmp/', import.meta.url);
const caminho = (nome) => fileURLToPath(new URL(nome, PASTA));

const CPF_ANA = gerarCpf(12345678);      // começa com zero: testa o zero perdido pelo Excel
const CPF_BIA = gerarCpf(902000003);
const CPF_CAIO = gerarCpf(902000004);
const CPF_DESCONHECIDO = gerarCpf(555555555);

export default () => executarTeste('inscricao-por-planilha', async (t) => {
  const { page } = t;
  if (!existsSync(PASTA)) mkdirSync(PASTA);

  await cadastrar({ nomeCompleto: 'E2E Org Planilha', cpf: gerarCpf(902000001), celular: '21902000001', email: 'e2e.orgplan@t.com', perfil: 'ORGANIZADOR', genero: 'MASCULINO' });
  await cadastrar({ nomeCompleto: 'E2E Ana Planilha', cpf: CPF_ANA, celular: '21902000002', email: 'e2e.ana@t.com' });
  await cadastrar({ nomeCompleto: 'E2E Bia Planilha', cpf: CPF_BIA, celular: '21902000003', email: 'e2e.bia@t.com' });
  await cadastrar({ nomeCompleto: 'E2E Caio Planilha', cpf: CPF_CAIO, celular: '21902000004', email: 'e2e.caio@t.com', genero: 'MASCULINO' });
  const org = await logar('e2e.orgplan@t.com', 'ORGANIZADOR');
  await chamar('POST', '/eventos', {
    nome: 'E2E Evento Planilha', dataInicio: '2026-12-01', regraCampeaoSobe: true, regraTresPodiosSobe: true,
    regraTresParticipacoesSobe: false, categorias: [{ formato: 'Individual', genero: 'Feminino', nivel: 'RX' }],
  }, org.token);

  const aba = XLSX.utils.aoa_to_sheet([
    ['Nome', 'CPF', 'Observação'],
    ['Ana', Number(CPF_ANA.replace(/\D/g, '')), 'CPF numérico, sem o zero à esquerda'],
    ['Bia', CPF_BIA, ''],
    ['Caio', CPF_CAIO.replace(/\D/g, ''), 'masculino numa categoria feminina'],
    ['Desconhecido', CPF_DESCONHECIDO, 'não cadastrado'],
    ['Erro', 'abc', 'inválido'],
    ['Bia de novo', CPF_BIA.replace(/\D/g, ''), 'repetida'],
  ]);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, aba, 'Inscritos');
  writeFileSync(caminho('inscritos.xlsx'), XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' }));
  writeFileSync(caminho('inscritos.csv'), `nome;cpf\nAna;${CPF_ANA}\n`);
  writeFileSync(caminho('sem-cpf.csv'), 'nome;box\nAna;X\n');

  const enviarArquivo = async (nome) => (await page.$('input[type=file]')).uploadFile(caminho(nome));
  const linhasTabela = () => page.evaluate(() => [...document.querySelectorAll('tbody tr')].filter((tr) => tr.cells.length > 1).length);

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await t.clicar('ORGANIZADOR');
  await page.type('input[name=login]', 'e2e.orgplan@t.com');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ORGANIZADOR');
  await t.esperarTexto('Inscrições:');
  t.ok('Organizador logado com a categoria feminina selecionada');

  await t.clicar('Importar planilha');
  await t.esperarTexto('Importar atletas por planilha');

  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: caminho('') });
  await t.clicar('Baixar modelo');
  await page.waitForFunction(() => true, { timeout: 500 }).catch(() => {});
  for (let i = 0; i < 20 && !readdirSync(PASTA).includes('modelo-inscricao-fairplay.xlsx'); i++) await new Promise((r) => setTimeout(r, 250));
  const modelo = XLSX.read(readFileSync(caminho('modelo-inscricao-fairplay.xlsx')));
  const cabecalho = XLSX.utils.sheet_to_json(modelo.Sheets[modelo.SheetNames[0]], { header: 1 })[0];
  if (cabecalho[0] !== 'CPF') throw new Error('Modelo sem coluna CPF: ' + cabecalho);
  t.ok('Modelo de planilha baixado com a coluna CPF');

  await enviarArquivo('sem-cpf.csv');
  await t.esperarTexto('Não encontramos a coluna "CPF"');
  t.ok('Arquivo sem coluna CPF mostra erro claro');

  await enviarArquivo('inscritos.xlsx');
  await t.esperarTexto('4 CPFs prontos para inscrição');
  await t.esperarTexto('1 CPF repetido foi ignorado');
  await t.esperarTexto('Linha 6: “abc”');
  await t.capturar('previa');
  t.ok('Prévia: 4 CPFs prontos, 1 repetido ignorado, linha 6 inválida apontada');

  await t.clicar('Inscrever 4 atletas');
  await t.esperarTexto('✓ 2 atletas inscritos');
  await t.esperarTexto('Atletas do sexo masculino não podem ser inscritos');
  await t.esperarTexto('Nenhum atleta cadastrado com este CPF');
  await t.capturar('resultado');
  t.ok('Ana (zero à esquerda recuperado) e Bia inscritas; Caio e CPF desconhecido recusados com motivo');

  await t.clicar('Concluir');
  await t.esperarTexto('2 atletas inscritos pela planilha.');
  if ((await linhasTabela()) !== 2) throw new Error('A tabela deveria ter 2 inscritos');

  await t.clicar('Importar planilha');
  await enviarArquivo('inscritos.csv');
  await t.esperarTexto('1 CPF pronto para inscrição');
  await t.clicar('Inscrever 1 atleta');
  await t.esperarTexto('Este atleta já está inscrito nesta categoria.');
  await t.clicar('Concluir');
  if ((await linhasTabela()) !== 2) throw new Error('Reimportação duplicou inscrição');
  t.ok('CSV com ";" reimportando a mesma atleta não duplica a inscrição');
});
