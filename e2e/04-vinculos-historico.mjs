// Vínculos com o histórico importado: escolha por competição, vários nomes na mesma conta, desfazer dentro
// do prazo, pedido de desvínculo recusado dentro do prazo e incorporação do atleta pendente.
import { BASE, gerarCpf, cadastrar, logar, chamar, executarTeste } from './apoio.mjs';

export default () => executarTeste('vinculos-historico', async (t) => {
  const { page } = t;

  // ---------------------------------------------------------------- Três nomes do histórico com 2+ competições livres
  const competicoes = async (nome, token) => (await chamar('GET', `/atletas/historico/competicoes?nome=${encodeURIComponent(nome)}`, null, token)).data;
  const { data: sugestoes } = await chamar('GET', '/atletas/historico/sugestoes?nome=Mateus');
  const nomes = [];
  for (const s of sugestoes.filter((x) => x.totalCompeticoes >= 2)) {
    if ((await competicoes(s.nomeAtleta)).every((c) => c.situacao === 'LIVRE')) nomes.push(s.nomeAtleta);
  }
  if (nomes.length < 3) throw new Error('O histórico precisa de 3 nomes "Mateus" com 2+ competições livres para este teste');
  const [nomeA, nomeB, nomeC] = nomes;

  // Cadastro pela API marcando só uma das competições do nome A (as outras são declaradas "não é minha")
  const doA = await competicoes(nomeA);
  await cadastrar({
    nomeCompleto: 'E2E Vinculos', cpf: gerarCpf(904000001), celular: '21904000001', email: 'e2e.vinculos@t.com',
    historicoIds: [doA[0].id], historicoRecusadosIds: doA.slice(1).map((c) => c.id),
  });
  const atleta = await logar('e2e.vinculos@t.com');
  const { data: vinculosIniciais } = await chamar('GET', `/atletas/${atleta.id}/vinculos`, null, atleta.token);
  if (vinculosIniciais.length !== 1 || vinculosIniciais[0].historicoId !== doA[0].id) {
    throw new Error('O cadastro não vinculou só a competição marcada: ' + JSON.stringify(vinculosIniciais));
  }
  if (!(vinculosIniciais[0].minutosParaDesfazer > 0)) throw new Error('Vínculo recém-feito deveria estar no prazo livre');
  const situacoesA = (await competicoes(nomeA, atleta.token)).map((c) => c.situacao);
  if (situacoesA[0] !== 'MINHA') throw new Error('Competição vinculada não aparece como MINHA: ' + situacoesA);
  t.ok('Cadastro vincula só as competições marcadas, e elas aparecem como "minha"');

  // ---------------------------------------------------------------- Painel: vincular outro nome
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[name=login]', 'e2e.vinculos@t.com');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ATLETA');
  await page.waitForFunction(() => location.pathname === '/atleta/home', { timeout: 8000 });
  await t.esperarTexto('Meus nomes em competições');
  await t.esperarTexto(nomeA);

  await t.clicar('Vincular outro nome');
  await page.type('input[placeholder="Ex.: Ana P. Souza"]', nomeB);
  await t.clicar('É você? Ver competições');
  await t.esperarTexto('Quais competições são suas?');
  await t.clicar('competição(ões)');
  await t.esperarTexto('vinculada(s) à sua conta');
  await t.esperarTexto(nomeB);
  await t.capturar('painel-vinculos');
  const { data: comB } = await chamar('GET', `/atletas/${atleta.id}/vinculos`, null, atleta.token);
  const doB = await competicoes(nomeB);
  if (comB.length !== 1 + doB.length) throw new Error(`Esperava ${1 + doB.length} vínculos, veio ${comB.length}`);
  t.ok('No painel, o atleta vincula um segundo nome e as competições entram na conta');

  // ---------------------------------------------------------------- Desfazer dentro do prazo
  await t.clicar('Desfazer');
  await t.esperarTexto('" desfeito.');
  const { data: aposDesfazer } = await chamar('GET', `/atletas/${atleta.id}/vinculos`, null, atleta.token);
  if (aposDesfazer.length !== comB.length - 1) throw new Error('O vínculo não foi desfeito');
  t.ok('Dentro do prazo, o atleta desfaz um vínculo sozinho');

  const pedidoNoPrazo = await chamar('POST', `/atletas/${atleta.id}/vinculos/${aposDesfazer[0].historicoId}/pedido-desvinculo`,
    { motivo: 'Não sou eu nesta competição.' }, atleta.token);
  if (pedidoNoPrazo.status !== 400) throw new Error('Pedido ao admin deveria ser recusado enquanto o prazo livre não acabou');
  t.ok('Pedido ao administrador só é aceito depois do prazo livre');

  // ---------------------------------------------------------------- Atleta pendente incorporado ao vincular
  await cadastrar({ nomeCompleto: 'E2E Org Vinculos', cpf: gerarCpf(904000002), celular: '21904000002', email: 'e2e.orgvinc@t.com', perfil: 'ORGANIZADOR', genero: 'MASCULINO' });
  const org = await logar('e2e.orgvinc@t.com', 'ORGANIZADOR');
  const { data: evento } = await chamar('POST', '/eventos', {
    nome: 'E2E Evento Vinculos', dataInicio: '2026-12-20', regraCampeaoSobe: true, regraTresPodiosSobe: true, regraTresParticipacoesSobe: false,
    categorias: [{ formato: 'Individual', genero: 'Masculino', nivel: 'RX' }],
  }, org.token);
  const { data: busca } = await chamar('GET', `/eventos/atletas/buscar?termo=${encodeURIComponent(nomeC)}`, null, org.token);
  const doHistorico = busca.find((a) => a.perfil === 'HISTORICO' && a.nomeCompleto.toLowerCase() === nomeC.toLowerCase());
  if (!doHistorico) throw new Error(`"${nomeC}" não apareceu como atleta só do histórico`);
  const insc = await chamar('POST', '/eventos/inscricoes', { categoriaEventoId: evento.categorias[0].id, atletaId: doHistorico.id }, org.token);
  if (insc.status !== 201) throw new Error('Inscrição do atleta do histórico falhou: ' + JSON.stringify(insc.data));
  const pendenteId = insc.data.atleta.id;
  t.idsParaApagar.push(pendenteId);

  const doC = await competicoes(nomeC);
  const vinculoC = await chamar('POST', `/atletas/${atleta.id}/vinculos`, { historicoIds: [doC[0].id], recusadosIds: [] }, atleta.token);
  if (vinculoC.status !== 200 || vinculoC.data.vinculadas !== 1) throw new Error('Vínculo com o nome do pendente falhou: ' + JSON.stringify(vinculoC.data));
  const { data: inscricoes } = await chamar('GET', `/atletas/${atleta.id}/inscricoes`, null, atleta.token);
  if (!inscricoes.some((i) => i.evento === 'E2E Evento Vinculos')) throw new Error('A inscrição do pendente não passou para a conta do atleta');
  const { data: doCDepois } = await chamar('GET', `/atletas/historico/competicoes?nome=${encodeURIComponent(nomeC)}`, null, atleta.token);
  if (doCDepois.filter((c) => c.situacao === 'MINHA').length !== 1) throw new Error('Só a competição marcada deveria ficar com o atleta');
  t.ok('Ao vincular a competição de um atleta pendente, a inscrição dele passa para a conta e só o que foi marcado é vinculado');
});
