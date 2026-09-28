// Resultados do evento, área do atleta, exportação, gênero "Outro", atleta pendente do histórico,
// troca e recuperação de senha e layout no celular.
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { BASE, gerarCpf, cadastrar, logar, chamar, executarTeste } from './apoio.mjs';

const PASTA = new URL('./tmp/', import.meta.url);
const caminho = (nome) => fileURLToPath(new URL(nome, PASTA));

export default () => executarTeste('resultados-e-conta', async (t) => {
  const { page } = t;
  if (!existsSync(PASTA)) mkdirSync(PASTA);

  // ---------------------------------------------------------------- Preparação pela API
  await cadastrar({ nomeCompleto: 'E2E Org Resultados', cpf: gerarCpf(903000001), celular: '21903000001', email: 'e2e.orgres@t.com', perfil: 'ORGANIZADOR', genero: 'MASCULINO' });
  await cadastrar({ nomeCompleto: 'E2E Rita Resultados', cpf: gerarCpf(903000002), celular: '21903000002', email: 'e2e.rita@t.com' });
  await cadastrar({ nomeCompleto: 'E2E Alex Outro', cpf: gerarCpf(903000003), celular: '21903000003', email: 'e2e.alex@t.com', genero: 'OUTRO' });
  const org = await logar('e2e.orgres@t.com', 'ORGANIZADOR');
  const rita = await logar('e2e.rita@t.com');
  const alex = await logar('e2e.alex@t.com');

  const criarEvento = (nome, data, categorias) => chamar('POST', '/eventos', {
    nome, dataInicio: data, regraCampeaoSobe: true, regraTresPodiosSobe: true, regraTresParticipacoesSobe: false, categorias,
  }, org.token).then((r) => r.data);

  // Evento antigo (Scale) e evento novo (Scale feminino + Masculino RX) para testar resultados e auditoria
  const antigo = await criarEvento('E2E Evento Antigo', '2026-01-10', [{ formato: 'Individual', genero: 'Feminino', nivel: 'Scale' }]);
  const novo = await criarEvento('E2E Evento Novo', '2026-12-10', [
    { formato: 'Individual', genero: 'Feminino', nivel: 'Scale' },
    { formato: 'Individual', genero: 'Masculino', nivel: 'RX' },
  ]);
  const catAntiga = antigo.categorias[0].id;
  const catMasculina = novo.categorias.find((c) => c.genero === 'Masculino').id;

  const inscAntiga = await chamar('POST', '/eventos/inscricoes', { categoriaEventoId: catAntiga, atletaId: rita.id }, org.token);
  if (inscAntiga.status !== 201) throw new Error('Inscrição no evento antigo falhou: ' + JSON.stringify(inscAntiga.data));

  const outroNaMasculina = await chamar('POST', '/eventos/inscricoes', { categoriaEventoId: catMasculina, atletaId: alex.id }, org.token);
  if (outroNaMasculina.status !== 201) throw new Error('Gênero Outro recusado em categoria masculina: ' + JSON.stringify(outroNaMasculina.data));
  t.ok('Atleta com gênero "Outro" inscrito em categoria masculina');

  // Atleta pendente do histórico: inscrever alguém que só existe no histórico importado
  const { data: busca } = await chamar('GET', '/eventos/atletas/buscar?termo=Faggian', null, org.token);
  const doHistorico = busca.find((a) => a.perfil === 'HISTORICO');
  if (!doHistorico) throw new Error('Nenhum atleta só do histórico encontrado para "Faggian"');
  if (doHistorico.genero || doHistorico.cidade) throw new Error('Atleta do histórico veio com gênero/cidade inventados');
  const inscHistorico = await chamar('POST', '/eventos/inscricoes', { categoriaEventoId: novo.categorias[0].id, atletaId: doHistorico.id }, org.token);
  const pendente = inscHistorico.data.atleta;
  t.idsParaApagar.push(pendente.id);
  if (pendente.perfil !== 'HISTORICO' || pendente.email || pendente.celular || pendente.cidade) {
    throw new Error('Atleta pendente criado com dados inventados: ' + JSON.stringify(pendente));
  }
  t.ok('Atleta só do histórico é inscrito como pendente, sem e-mail, celular ou cidade inventados');

  // ---------------------------------------------------------------- Lançar resultados pela tela
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await t.clicar('ORGANIZADOR');
  await page.type('input[name=login]', 'e2e.orgres@t.com');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ORGANIZADOR');
  await t.esperarTexto('E2E Evento Novo');
  await t.clicar('E2E Evento Antigo', 'h4');
  await t.esperarTexto('E2E Rita Resultados');
  await page.type('input[aria-label="Colocação de E2E Rita Resultados"]', '1');
  await t.esperarTexto('Há colocações não salvas.');
  await t.clicar('Salvar resultados');
  await t.esperarTexto('Resultados salvos');
  await t.capturar('resultados');
  t.ok('Organizador lança a colocação (1º lugar) e salva os resultados');

  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: caminho('') });
  await t.clicar('Exportar Excel');
  const arquivo = 'E2E Evento Antigo - Individual Feminino SCALE.xlsx';
  for (let i = 0; i < 20 && !readdirSync(PASTA).includes(arquivo); i++) await new Promise((r) => setTimeout(r, 250));
  const planilha = XLSX.read(readFileSync(caminho(arquivo)));
  const linhas = XLSX.utils.sheet_to_json(planilha.Sheets[planilha.SheetNames[0]]);
  if (linhas.length !== 1 || linhas[0].Atleta !== 'E2E Rita Resultados' || linhas[0]['Colocação'] !== 1) {
    throw new Error('Exportação inesperada: ' + JSON.stringify(linhas));
  }
  t.ok('Exportação para Excel traz a inscrita com status e colocação');

  // O resultado passa a contar na auditoria de outros eventos: Rita campeã no Scale → irregular no Scale do evento novo
  const inscNova = await chamar('POST', '/eventos/inscricoes', { categoriaEventoId: novo.categorias[0].id, atletaId: rita.id }, org.token);
  if (inscNova.data.statusElegibilidade !== 'IRREGULAR' || inscNova.data.categoriaRecomendada !== 'Intermediário') {
    throw new Error('Resultado do evento não entrou na auditoria: ' + JSON.stringify(inscNova.data));
  }
  t.ok('Campeã no evento anterior fica irregular no Scale do evento seguinte (recomendação: Intermediário)');

  // ---------------------------------------------------------------- Área do atleta e troca de senha
  await t.clicar('Sair');
  await page.waitForSelector('input[name=login]');
  await page.type('input[name=login]', 'e2e.rita@t.com');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ATLETA');
  await t.esperarTexto('Minhas inscrições');
  await t.esperarTexto('E2E Evento Novo');
  await t.esperarTexto('Recomendada: Intermediário');
  await t.esperarTexto('Evento FairPlay');
  await t.esperarTexto('1º Lugar (Campeão)');
  await t.capturar('area-atleta');
  t.ok('Atleta vê as inscrições (com a auditoria) e o resultado do evento no histórico');

  // A senha atual errada e o link inválido abaixo respondem 400 de propósito
  t.esperarErroConsole('status of 400');
  await t.clicar('Trocar senha');
  const senhas = await page.$$('.modal input[type=password]');
  await senhas[0].type('errada');
  await senhas[1].type('nova123');
  await senhas[2].type('nova123');
  await t.clicar('Salvar nova senha');
  await t.esperarTexto('A senha atual está incorreta.');
  await t.digitar('.modal input[type=password]', 'abc123');
  await t.clicar('Salvar nova senha');
  await t.esperarTexto('Senha alterada com sucesso!');
  await page.waitForFunction(() => !document.querySelector('.modal'), { timeout: 5000 });
  await page.reload({ waitUntil: 'networkidle0' });
  await t.esperarTexto('Minhas inscrições');
  t.ok('Troca de senha valida a senha atual e mantém o atleta logado');

  const loginAntigo = await chamar('POST', '/atletas/login', { login: 'e2e.rita@t.com', senha: 'abc123', perfil: 'ATLETA' });
  const loginNovo = await chamar('POST', '/atletas/login', { login: 'e2e.rita@t.com', senha: 'nova123', perfil: 'ATLETA' });
  if (loginAntigo.status !== 401 || loginNovo.status !== 200) throw new Error('A senha nova não passou a valer');
  const sessaoAntiga = await chamar('GET', `/atletas/${rita.id}/dashboard`, null, rita.token);
  if (sessaoAntiga.status !== 401) throw new Error('A sessão aberta antes da troca de senha continuou válida');
  t.ok('Depois da troca, só a senha nova funciona e as outras sessões são encerradas');

  // ---------------------------------------------------------------- Recuperação de senha
  await t.clicar('Sair');
  await page.waitForFunction(() => location.pathname === '/login');
  await t.clicar('Esqueci minha senha');
  await t.esperarTexto('Funcionalidade ainda não implementada.');
  await t.clicar('Entendi');
  await page.waitForFunction(() => !document.querySelector('.modal'), { timeout: 5000 });
  t.ok('"Esqueci minha senha" mostra o aviso de funcionalidade ainda não implementada');

  await page.goto(`${BASE}/redefinir-senha?token=token-invalido`, { waitUntil: 'networkidle0' });
  const novas = await page.$$('input[type=password]');
  await novas[0].type('outra123');
  await novas[1].type('outra123');
  await t.clicar('Salvar nova senha');
  await t.esperarTexto('Link inválido ou expirado');
  t.ok('Link de redefinição inválido é recusado');

  // ---------------------------------------------------------------- Celular
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  const larguraExcedente = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const bannerVisivel = await page.evaluate(() => getComputedStyle(document.querySelector('.cartao-acesso-banner')).display !== 'none');
  await t.capturar('login-celular');
  if (larguraExcedente > 0 || bannerVisivel) throw new Error(`Login não se adapta ao celular (sobra ${larguraExcedente}px, banner visível: ${bannerVisivel})`);
  await page.type('input[name=login]', 'e2e.orgres@t.com');
  await t.clicar('ORGANIZADOR');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ORGANIZADOR');
  await t.esperarTexto('Meus torneios');
  const direcao = await page.evaluate(() => getComputedStyle(document.querySelector('.painel-organizador')).flexDirection);
  await t.capturar('organizador-celular');
  if (direcao !== 'column') throw new Error('Painel do organizador não empilha no celular');
  t.ok('No celular, login sem banner e painel do organizador empilhado, sem rolagem lateral');
});
