// O administrador master entra no painel de um atleta e usa o sistema como ele (ex.: altera o nome),
// depois volta ao gerenciamento de usuários sem precisar fazer login de novo.
import { BASE, ADMIN, gerarCpf, cadastrar, logar, chamar, executarTeste } from './apoio.mjs';

export default () => executarTeste('admin-acessa-atleta', async (t) => {
  const { page } = t;

  await cadastrar({ nomeCompleto: 'E2E Atleta Acessada', cpf: gerarCpf(907000001), celular: '21907000001', email: 'e2e.acessada@t.com' });
  await cadastrar({ nomeCompleto: 'E2E Org Acesso', cpf: gerarCpf(907000002), celular: '21907000002', email: 'e2e.orgacesso@t.com', perfil: 'ORGANIZADOR', genero: 'MASCULINO' });
  const atleta = await logar('e2e.acessada@t.com');
  const org = await logar('e2e.orgacesso@t.com', 'ORGANIZADOR');

  // ---------------------------------------------------------------- Regras da rota
  const { data: admin } = await chamar('POST', '/admin/usuarios/login', ADMIN);
  const { data: usuarios } = await chamar('GET', '/admin/usuarios', null, admin.token);
  const organizador = usuarios.find((u) => u.email === 'e2e.orgacesso@t.com');
  if ((await chamar('POST', `/admin/usuarios/${organizador.id}/acessar`, null, admin.token)).status !== 400) {
    throw new Error('Não deveria ser possível acessar uma conta de organizador como atleta');
  }
  const semPermissao = await chamar('POST', `/admin/usuarios/${atleta.id}/acessar`, null, org.token);
  if (semPermissao.status !== 403 && semPermissao.status !== 401) throw new Error('Só o administrador pode acessar contas de atleta');
  t.ok('Só o administrador acessa, e só contas de atleta com cadastro');

  // ---------------------------------------------------------------- Admin entra no painel do atleta
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await t.clicar('Gerenciador de Cadastros');
  await page.type('input[placeholder=master]', ADMIN.usuario);
  await page.type('.modal input[type=password]', ADMIN.senha);
  await t.clicar('Acessar Gerenciador');
  await t.esperarTexto('Gerenciamento de Usuários');
  await page.type('input[placeholder^="Buscar"]', 'E2E Atleta Acessada');
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
  await t.clicar('Acessar painel');
  await page.waitForFunction(() => location.pathname === '/atleta/home', { timeout: 8000 });
  await t.esperarTexto('como administrador');
  await t.esperarTexto('E2E Atleta Acessada');
  await t.capturar('painel-pelo-admin');
  t.ok('Admin abre o painel do atleta, com a faixa avisando que está usando a conta dele');

  // ---------------------------------------------------------------- Age como o atleta: altera o nome
  await t.clicar('Editar Perfil');
  const campoNome = '.modal input[type=text]';
  await t.digitar(campoNome, 'E2E Atleta Renomeada Pelo Admin');
  await t.clicar('Salvar Alterações');
  await t.esperarTexto('Dados atualizados com sucesso');
  // O modal fecha sozinho logo depois; até lá o fundo dele cobre a página
  await page.waitForFunction(() => !document.querySelector('.modal'), { timeout: 8000 });
  const { data: painel } = await chamar('GET', `/atletas/${atleta.id}/dashboard`, null, atleta.token);
  if (painel.nomeCompleto !== 'E2E Atleta Renomeada Pelo Admin') throw new Error('A alteração de nome feita pelo admin não foi gravada');
  t.ok('Admin altera o nome do atleta pelo painel dele');

  // ---------------------------------------------------------------- Volta ao gerenciamento sem novo login
  const tokenUsadoPeloAdmin = await page.evaluate(() => localStorage.getItem('token'));
  await t.clicar('Voltar ao gerenciamento');
  await page.waitForFunction(() => location.pathname === '/admin/usuarios', { timeout: 8000 });
  await t.esperarTexto('Gerenciamento de Usuários');
  await t.esperarTexto('E2E Atleta Renomeada Pelo Admin');
  const restouSessaoDeAtleta = await page.evaluate(() => Boolean(localStorage.getItem('tokenAdmin') || localStorage.getItem('atletaId')));
  if (restouSessaoDeAtleta) throw new Error('Ao voltar, a sessão do atleta deveria ter sido descartada');
  const sessaoEncerrada = await chamar('GET', `/atletas/${atleta.id}/dashboard`, null, tokenUsadoPeloAdmin);
  if (sessaoEncerrada.status !== 401 && sessaoEncerrada.status !== 403) throw new Error('A sessão de atleta usada pelo admin deveria ter sido encerrada no servidor');
  t.ok('Admin volta ao gerenciamento com a própria sessão e já vê o nome alterado');
});
