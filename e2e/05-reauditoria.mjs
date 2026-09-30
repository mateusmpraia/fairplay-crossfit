// Reauditoria automática: quando o histórico do atleta muda depois da inscrição (vínculo feito ou desfeito,
// resultado lançado), as inscrições em aberto são auditadas de novo e a mudança aparece em destaque ao organizador.
import { BASE, gerarCpf, cadastrar, logar, chamar, executarTeste } from './apoio.mjs';

const diasAPartirDeHoje = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

/** Uma competição livre do histórico em que alguém foi campeão no RX (para o atleta vincular). */
async function campeaoRxLivre() {
  for (const termo of ['Lucas', 'Pedro', 'Ana', 'Maria', 'Gabriel', 'Rafael', 'Bruno', 'Mateus']) {
    const { data: sugestoes } = await chamar('GET', `/atletas/historico/sugestoes?nome=${termo}`);
    for (const s of sugestoes) {
      const { data: comps } = await chamar('GET', `/atletas/historico/competicoes?nome=${encodeURIComponent(s.nomeAtleta)}`);
      const achada = comps.find((c) => c.categoria.toUpperCase() === 'RX' && c.colocacao === 1 && c.situacao === 'LIVRE');
      if (achada) return achada;
    }
  }
  throw new Error('Nenhuma vitória no RX livre encontrada no histórico para o teste');
}

export default () => executarTeste('reauditoria', async (t) => {
  const { page } = t;

  // ---------------------------------------------------------------- Preparação pela API
  await cadastrar({ nomeCompleto: 'E2E Org Reauditoria', cpf: gerarCpf(905000001), celular: '21905000001', email: 'e2e.orgreaud@t.com', perfil: 'ORGANIZADOR', genero: 'MASCULINO' });
  await cadastrar({ nomeCompleto: 'E2E Atleta Reauditoria', cpf: gerarCpf(905000002), celular: '21905000002', email: 'e2e.atlreaud@t.com' });
  const org = await logar('e2e.orgreaud@t.com', 'ORGANIZADOR');
  const atleta = await logar('e2e.atlreaud@t.com');

  // A inscrição é sempre na primeira categoria (RX); a Elite só existe para o campeão do RX ter para onde subir
  const RX = { formato: 'Individual', genero: 'Misto', nivel: 'RX' };
  const ELITE = { formato: 'Individual', genero: 'Misto', nivel: 'Elite' };
  const criarEvento = async (nome, dataInicio, categorias = [RX, ELITE]) => (await chamar('POST', '/eventos', {
    nome, dataInicio, regraCampeaoSobe: true, regraTresPodiosSobe: false, regraTresParticipacoesSobe: false, categorias,
  }, org.token)).data;
  const futuro = await criarEvento('E2E Reauditoria Futuro', diasAPartirDeHoje(60));
  const semElite = await criarEvento('E2E Reauditoria Sem Elite', diasAPartirDeHoje(45), [RX]);
  const passadoSemResultado = await criarEvento('E2E Reauditoria Passado', diasAPartirDeHoje(-20));
  const passadoComResultado = await criarEvento('E2E Reauditoria Vencido', diasAPartirDeHoje(-30));

  const inscrever = async (evento) => {
    const r = await chamar('POST', '/eventos/inscricoes', { categoriaEventoId: evento.categorias[0].id, atletaId: atleta.id }, org.token);
    if (r.status !== 201) throw new Error('Inscrição falhou: ' + JSON.stringify(r.data));
    return r.data;
  };
  const inscFuturo = await inscrever(futuro);
  await inscrever(semElite);
  const inscPassado = await inscrever(passadoSemResultado);
  if (inscFuturo.statusElegibilidade !== 'REGULAR' || inscPassado.statusElegibilidade !== 'REGULAR') {
    throw new Error('Atleta sem histórico deveria estar regular no RX');
  }
  const inscricaoNo = async (evento) =>
    (await chamar('GET', `/eventos/categorias/${evento.categorias[0].id}/inscricoes`, null, org.token)).data.find((i) => i.atleta.id === atleta.id);
  t.ok('Atleta sem histórico inscrito no RX de um evento futuro e de um evento que já passou: regular');

  // ---------------------------------------------------------------- Vínculo com uma vitória no RX
  const vitoria = await campeaoRxLivre();
  const vinculo = await chamar('POST', `/atletas/${atleta.id}/vinculos`, { historicoIds: [vitoria.id], recusadosIds: [] }, atleta.token);
  if (vinculo.status !== 200) throw new Error('Vínculo falhou: ' + JSON.stringify(vinculo.data));

  const futuroAposVinculo = await inscricaoNo(futuro);
  if (futuroAposVinculo.statusElegibilidade !== 'IRREGULAR') throw new Error('Inscrição futura não foi reauditada após o vínculo');
  if (futuroAposVinculo.statusAnterior !== 'REGULAR' || !futuroAposVinculo.auditoriaAlteradaEm) throw new Error('Mudança não ficou registrada para o organizador');
  if ((await inscricaoNo(passadoSemResultado)).statusElegibilidade !== 'REGULAR') throw new Error('Evento que já passou não deveria ser reauditado');
  t.ok('Ao vincular uma vitória no RX, a inscrição futura fica irregular e a de evento já realizado não muda');

  // ---------------------------------------------------------------- Sem categoria acima, o campeão do RX continua no RX
  const noSemElite = await inscricaoNo(semElite);
  if (noSemElite.statusElegibilidade !== 'REGULAR' || !noSemElite.motivoIrregularidade.includes('não tem categoria acima de RX')) {
    throw new Error('Evento sem Elite não deveria obrigar o campeão do RX a subir: ' + JSON.stringify(noSemElite));
  }
  const adicionarCategoria = (categoria) => chamar('POST', `/eventos/${semElite.id}/categorias`, categoria, org.token);
  await adicionarCategoria({ formato: 'Individual', genero: 'Masculino', nivel: 'Elite' });
  if ((await inscricaoNo(semElite)).statusElegibilidade !== 'REGULAR') throw new Error('Elite de outro gênero não deveria obrigar a atleta a subir');
  await adicionarCategoria({ formato: 'Individual', genero: 'Feminino', nivel: 'Elite' });
  const comEliteFeminina = await inscricaoNo(semElite);
  if (comEliteFeminina.statusElegibilidade !== 'IRREGULAR' || comEliteFeminina.categoriaRecomendada !== 'Elite') {
    throw new Error('Com Elite do gênero da atleta, a campeã do RX deveria subir: ' + JSON.stringify(comEliteFeminina));
  }
  t.ok('Campeã do RX só é obrigada a subir se o evento tiver Elite do gênero dela (reauditado ao adicionar a categoria)');

  // ---------------------------------------------------------------- Organizador vê o destaque e marca "ciente"
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await t.clicar('ORGANIZADOR');
  await page.type('input[name=login]', 'e2e.orgreaud@t.com');
  await page.type('input[name=senha]', 'abc123');
  await t.clicar('ENTRAR COMO ORGANIZADOR');
  await page.waitForFunction(() => location.pathname === '/organizador/eventos', { timeout: 8000 });
  await t.esperarTexto('1 mudança(s) na auditoria');
  await t.esperarTexto('Era Regular; mudou em');
  await t.capturar('destaque-organizador');
  await t.clicar('Ciente');
  await page.waitForFunction(() => !document.body.innerText.includes('mudança(s) na auditoria'), { timeout: 8000 });
  const { data: alteracoes } = await chamar('GET', '/eventos/alteracoes-auditoria', null, org.token);
  if (alteracoes.length !== 0) throw new Error('Depois do "ciente" não deveria restar destaque');
  t.ok('Organizador vê o destaque no evento e na inscrição, e ele some ao marcar "Ciente"');

  // ---------------------------------------------------------------- Desfazer o vínculo volta a regular
  const desfeito = await chamar('DELETE', `/atletas/${atleta.id}/vinculos/${vitoria.id}`, null, atleta.token);
  if (desfeito.status !== 200) throw new Error('Desfazer vínculo falhou: ' + JSON.stringify(desfeito.data));
  const futuroAposDesfazer = await inscricaoNo(futuro);
  if (futuroAposDesfazer.statusElegibilidade !== 'REGULAR' || futuroAposDesfazer.statusAnterior !== 'IRREGULAR') {
    throw new Error('Desfazer o vínculo deveria voltar a regular e destacar a mudança: ' + JSON.stringify(futuroAposDesfazer));
  }
  t.ok('Desfazer o vínculo reaudita de novo: volta a regular, com novo destaque');

  // ---------------------------------------------------------------- Resultado lançado em outro evento
  const inscVencido = await inscrever(passadoComResultado);
  const lancar = await chamar('PUT', `/eventos/categorias/${passadoComResultado.categorias[0].id}/resultados`,
    { resultados: [{ inscricaoId: inscVencido.id, colocacao: 1 }] }, org.token);
  if (lancar.status !== 200) throw new Error('Lançar resultado falhou: ' + JSON.stringify(lancar.data));
  const futuroAposResultado = await inscricaoNo(futuro);
  if (futuroAposResultado.statusElegibilidade !== 'IRREGULAR') throw new Error('Vitória lançada num evento do FairPlay não reauditou a inscrição futura');
  if (futuroAposResultado.auditoriaAlteradaEm) throw new Error('Voltou ao status que o organizador já conhecia: o destaque deveria sumir');
  t.ok('Vitória lançada em outro evento reaudita a inscrição futura (e o destaque some ao voltar ao status já conhecido)');
});
