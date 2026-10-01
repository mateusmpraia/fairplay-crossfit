// Critério "não pode descer de categoria", inscrição de atleta sem cadastro nem histórico (com CPF assumido
// depois no cadastro) e tabela de histórico do atleta sem a coluna de data.
import { BASE, gerarCpf, cadastrar, logar, chamar, executarTeste } from './apoio.mjs';

const diasAPartirDeHoje = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const CPF_SEM_CADASTRO = gerarCpf(906000003);

export default () => executarTeste('nao-desce-e-sem-cadastro', async (t) => {
  const { page } = t;

  // ---------------------------------------------------------------- Preparação pela API
  await cadastrar({ nomeCompleto: 'E2E Org Desce', cpf: gerarCpf(906000001), celular: '21906000001', email: 'e2e.orgdesce@t.com', perfil: 'ORGANIZADOR', genero: 'MASCULINO' });
  await cadastrar({ nomeCompleto: 'E2E Atleta Desce', cpf: gerarCpf(906000002), celular: '21906000002', email: 'e2e.atldesce@t.com' });
  const org = await logar('e2e.orgdesce@t.com', 'ORGANIZADOR');
  const atleta = await logar('e2e.atldesce@t.com');

  const categoria = (nivel) => ({ formato: 'Individual', genero: 'Misto', nivel });
  const criarEvento = async (nome, dataInicio, niveis, regraNaoDesce = true) => (await chamar('POST', '/eventos', {
    nome, dataInicio, regraCampeaoSobe: false, regraTresPodiosSobe: false, regraTresParticipacoesSobe: false, regraNaoDesce,
    categorias: niveis.map(categoria),
  }, org.token)).data;
  const inscrever = async (cat, atletaId = atleta.id) => {
    const r = await chamar('POST', '/eventos/inscricoes', { categoriaEventoId: cat.id, atletaId }, org.token);
    if (r.status !== 201) throw new Error('Inscrição falhou: ' + JSON.stringify(r.data));
    return r.data;
  };
  // O nível vem como o nome da constante (SCALE, INTERMEDIARIO...)
  const nivel = (evento, n) => evento.categorias.find((c) => c.nivel === n);

  // O atleta competiu no Intermediário (sem pódio) num evento que já passou
  const passado = await criarEvento('E2E Desce Passado', diasAPartirDeHoje(-30), ['Intermediário']);
  const inscPassado = await inscrever(passado.categorias[0]);
  await chamar('PUT', `/eventos/categorias/${passado.categorias[0].id}/resultados`, { resultados: [{ inscricaoId: inscPassado.id, colocacao: 7 }] }, org.token);

  // ---------------------------------------------------------------- Não pode descer
  const comIntermediario = await criarEvento('E2E Desce Com Intermediario', diasAPartirDeHoje(40), ['Scale', 'Intermediário']);
  const noScale = await inscrever(nivel(comIntermediario, 'SCALE'));
  if (noScale.statusElegibilidade !== 'IRREGULAR' || noScale.categoriaRecomendada !== 'Intermediário') {
    throw new Error('Quem competiu no Intermediário não deveria poder ir para o Scale: ' + JSON.stringify(noScale));
  }
  if (noScale.historicoConsiderado !== 1) throw new Error('A inscrição deveria registrar 1 competição no histórico');
  t.ok('Quem já competiu no Intermediário fica irregular no Scale (recomendação: Intermediário)');

  const semIntermediario = await criarEvento('E2E Desce Sem Intermediario', diasAPartirDeHoje(41), ['Scale', 'RX']);
  const noScaleSemInter = await inscrever(nivel(semIntermediario, 'SCALE'));
  if (noScaleSemInter.statusElegibilidade !== 'REGULAR') {
    throw new Error('Sem Intermediário no evento (só RX acima), deveria poder competir no Scale: ' + JSON.stringify(noScaleSemInter));
  }
  const criterioDesligado = await criarEvento('E2E Desce Desligado', diasAPartirDeHoje(42), ['Scale', 'Intermediário'], false);
  if ((await inscrever(nivel(criterioDesligado, 'SCALE'))).statusElegibilidade !== 'REGULAR') throw new Error('Critério desligado não deveria gerar infração');
  t.ok('Sem a categoria entre a inscrita e a já disputada (ou com o critério desligado), continua regular');

  // ---------------------------------------------------------------- Inscrição sem cadastro pela tela do organizador
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await t.clicar('ORGANIZADOR');
  await page.type('input[name=login]', 'e2e.orgdesce@t.com');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ORGANIZADOR');
  await page.waitForFunction(() => location.pathname === '/organizador/eventos', { timeout: 8000 });
  await t.clicar('E2E Desce Desligado', 'h4');
  await t.esperarTexto('Não pode descer');
  await t.esperarTexto('Cadastrado • 📊 1 competição(ões) no histórico');
  t.ok('Critério "Não pode descer" aparece no evento e a tabela mostra cadastro e histórico do atleta');

  const busca = 'input[placeholder^="Digite pelo menos 3 letras"]';
  await page.type(busca, 'E2E Pessoa Nunca Vista');
  await page.keyboard.press('Enter');
  await t.esperarTexto('Inscrever atleta sem cadastro');
  await page.type('input[name=semCadastroCpf]', CPF_SEM_CADASTRO.replace(/\D/g, ''));
  await page.select('select[name=semCadastroGenero]', 'FEMININO');
  await t.clicarExato('Inscrever');
  await t.esperarTexto('inscrito sem cadastro');
  await t.esperarTexto('Sem cadastro • Sem histórico no sistema');
  await t.capturar('sem-cadastro');
  t.ok('Atleta sem cadastro nem histórico é inscrito pela tela, identificado como "Sem cadastro • Sem histórico no sistema"');

  const doisNoMesmoCpf = await chamar('POST', '/eventos/inscricoes/sem-cadastro', {
    categoriaEventoId: nivel(comIntermediario, 'INTERMEDIARIO').id, nomeCompleto: 'E2E Outro Nome', cpf: gerarCpf(906000002), genero: 'MASCULINO',
  }, org.token);
  if (doisNoMesmoCpf.status !== 400) throw new Error('CPF de uma conta existente deveria ser recusado na inscrição sem cadastro');
  t.ok('CPF de quem já tem conta é recusado na inscrição sem cadastro');

  // ---------------------------------------------------------------- A pessoa se cadastra com o CPF e assume a inscrição
  await cadastrar({ nomeCompleto: 'E2E Pessoa Nunca Vista', cpf: CPF_SEM_CADASTRO, celular: '21906000003', email: 'e2e.nuncavista@t.com' });
  const nova = await logar('e2e.nuncavista@t.com');
  const { data: inscricoesDela } = await chamar('GET', `/atletas/${nova.id}/inscricoes`, null, nova.token);
  if (!inscricoesDela.some((i) => i.evento === 'E2E Desce Desligado')) throw new Error('A inscrição sem cadastro não passou para a conta criada com o CPF');
  const { data: naCategoria } = await chamar('GET', `/eventos/categorias/${nivel(criterioDesligado, 'SCALE').id}/inscricoes`, null, org.token);
  if (!naCategoria.some((i) => i.atleta.id === nova.id && i.atleta.perfil === 'ATLETA')) throw new Error('O organizador deveria ver a inscrição já com a conta da atleta');
  t.ok('Ao se cadastrar com o mesmo CPF, a pessoa assume a inscrição feita sem cadastro');

  // ---------------------------------------------------------------- Painel do atleta sem a coluna de data
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[name=login]', 'e2e.atldesce@t.com');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ATLETA');
  await page.waitForFunction(() => location.pathname === '/atleta/home', { timeout: 8000 });
  await t.esperarTexto('Histórico de Participações');
  const texto = await t.texto();
  if (texto.includes('DATA (MÊS/ANO)') || texto.includes('Histórico Consolidado')) throw new Error('A tabela de histórico ainda mostra a coluna de data');
  t.ok('Tabela de histórico do atleta sem a coluna de data');
});
