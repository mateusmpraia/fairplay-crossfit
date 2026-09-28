// Fluxo principal: acesso sem login, cadastro com vínculo de histórico, login, painéis e gestão de eventos.
import { BASE, ADMIN, gerarCpf, executarTeste } from './apoio.mjs';

const CPF = gerarCpf(901000001);
const CPF_DIGITOS = CPF.replace(/\D/g, '');

export default () => executarTeste('fluxo-principal', async (t) => {
  const { page } = t;

  for (const rota of ['/atleta/home', '/organizador/eventos', '/admin/usuarios']) {
    await page.goto(BASE + rota, { waitUntil: 'networkidle0' });
    if (!page.url().endsWith('/login')) throw new Error(`${rota} abriu sem login`);
  }
  t.ok('Painéis de atleta, organizador e admin exigem login');

  // ---------------------------------------------------------------- Cadastro de atleta com vínculo de histórico
  await t.clicar('Cadastre-se aqui', 'a');
  await t.esperarTexto('Cadastro de Atleta');
  await page.type('input[name=nomeCompleto]', 'Ana Faggian');
  await t.esperarTexto('É você? Vincular');
  await t.clicar('É você? Vincular');
  await t.esperarTexto('Histórico Vinculado');
  t.ok('Sugestões do histórico aparecem e o vínculo preenche o box');

  await page.type('input[name=cpf]', '12345678900');
  await page.type('input[name=celular]', '21977776655');
  await page.type('input[name=dataNascimento]', '15031990');
  await page.select('select[name=genero]', 'FEMININO');
  await page.type('input[name=cidade]', 'Niterói');
  await page.type('input[name=estado]', 'rj');
  await page.type('input[name=email]', 'e2e.atleta@teste.com');
  await page.type('input[name=senha]', 'senha123');
  await page.type('input[name=confirmarSenha]', 'senha123');
  await t.clicar('CADASTRAR COMO ATLETA');
  await t.esperarTexto('CPF inválido');
  t.ok('CPF com dígito verificador errado é recusado');

  await t.digitar('input[name=cpf]', CPF_DIGITOS);
  await t.digitar('input[name=senha]', '123');
  await t.digitar('input[name=confirmarSenha]', '123');
  await t.clicar('CADASTRAR COMO ATLETA');
  await t.esperarTexto('pelo menos 6 caracteres');
  t.ok('Senha curta é recusada');

  await t.digitar('input[name=senha]', 'senha123');
  await t.digitar('input[name=confirmarSenha]', 'senha123');
  await t.clicar('CADASTRAR COMO ATLETA');
  await t.esperarTexto('Cadastro de Atleta realizado com sucesso');
  t.ok('Cadastro concluído e redirecionado ao login');

  // ---------------------------------------------------------------- Login do atleta e painel
  await page.type('input[name=login]', CPF_DIGITOS);
  await page.type('input[name=senha]', 'senha123');
  await t.clicar('ENTRAR COMO ATLETA');
  await page.waitForFunction(() => location.pathname === '/atleta/home', { timeout: 8000 });
  await t.esperarTexto('Histórico de Participações');
  await t.esperarTexto('Minhas inscrições');
  await t.esperarTexto('Histórico importado');
  await t.capturar('painel-atleta');
  t.ok('Login por CPF sem pontuação; painel mostra inscrições e histórico vinculado');

  await t.clicar('Editar Perfil');
  await t.esperarTexto('Salvar Alterações');
  await t.clicar('Cancelar');
  await t.clicar('Sair');
  await page.waitForFunction(() => location.pathname === '/login');

  // ---------------------------------------------------------------- Organizador
  await page.goto(`${BASE}/cadastro?tipo=ORGANIZADOR`, { waitUntil: 'networkidle0' });
  await page.type('input[name=nomeCompleto]', 'Organizador E2E');
  await page.type('input[name=cpf]', CPF_DIGITOS);
  await page.type('input[name=celular]', '21977776655');
  await page.type('input[name=dataNascimento]', '01011985');
  await page.select('select[name=genero]', 'MASCULINO');
  await page.type('input[name=cidade]', 'Niterói');
  await page.type('input[name=estado]', 'RJ');
  await page.type('input[name=nomeBox]', 'Box E2E');
  await page.type('input[name=email]', 'e2e.org@teste.com');
  await page.type('input[name=senha]', 'senha123');
  await page.type('input[name=confirmarSenha]', 'senha123');
  await t.clicar('CADASTRAR COMO ORGANIZADOR');
  await t.esperarTexto('ENTRAR COMO ORGANIZADOR');
  await page.type('input[name=login]', 'e2e.org@teste.com');
  await page.type('input[name=senha]', 'senha123');
  await t.clicar('ENTRAR COMO ORGANIZADOR');
  await t.esperarTexto('Nenhum torneio criado ainda.');
  t.ok('Mesmo CPF pode ser organizador; organizador novo não vê eventos de outros');

  await t.clicar('+ Criar novo evento');
  await t.esperarTexto('Criar torneio esportivo');
  await page.type('input[placeholder^="Ex: Torneio"]', 'Evento E2E');
  await page.type('input[placeholder="DD/MM/AAAA"]', '10122026');
  await t.clicar('Concluir e salvar torneio');
  await t.esperarTexto('Adicione pelo menos uma categoria');
  const selects = await page.$$('.modal select');
  await selects[1].select('Feminino');
  await selects[2].select('RX');
  await t.clicarExato('+ Adicionar');
  await t.clicar('Concluir e salvar torneio');
  await t.esperarTexto('Painel de auditoria do evento');
  t.ok('Evento criado com categoria Individual • Feminino • RX');

  await page.type('input[placeholder^="Digite pelo menos 3"]', CPF_DIGITOS);
  await t.esperarTexto('+ Inscrever');
  await page.keyboard.press('Enter');
  await t.esperarTexto('inscrito com status');
  t.ok('Busca por CPF sem pontuação + Enter inscreve a atleta');

  await page.type('input[placeholder^="Digite pelo menos 3"]', CPF);
  await t.esperarTexto('+ Inscrever');
  await page.keyboard.press('Enter');
  await t.esperarTexto('já está cadastrado nesta categoria');
  t.ok('Aviso de atleta já inscrita');

  await t.clicar('3 participações', 'label');
  await t.esperarTexto('Critérios atualizados e auditoria recalculada');
  t.ok('Alterar critério recalcula a auditoria');

  await t.clicar('+ Adicionar categoria');
  await t.clicar('Adicionar categoria', 'button[@type="submit"]');
  await t.esperarTexto('Individual • Masculino • SCALE');
  const pill = await page.waitForSelector('::-p-xpath(//span[contains(., "Individual • Masculino • SCALE")]/following-sibling::button)');
  await pill.click();
  await t.clicar('Sim, excluir categoria');
  await page.waitForFunction(() => !document.body.innerText.includes('Individual • Masculino • SCALE'));
  t.ok('Categoria adicionada e excluída');

  await page.click('span::-p-text(Individual • Feminino • RX)');
  await t.clicar('Excluir atleta');
  await t.clicar('Sim, remover atleta');
  await t.esperarTexto('Atleta removido da categoria com sucesso.');
  t.ok('Inscrição removida');

  // ---------------------------------------------------------------- Admin
  await t.clicar('Sair');
  await page.waitForFunction(() => location.pathname === '/login');
  t.esperarErroConsole('401');
  await t.clicar('Gerenciador de Cadastros');
  await page.type('input[placeholder=master]', ADMIN.usuario);
  await page.type('.modal input[type=password]', 'errada');
  await t.clicar('Acessar Gerenciador');
  await t.esperarTexto('Usuário ou senha de administrador incorretos.');
  await t.digitar('.modal input[type=password]', ADMIN.senha);
  await t.clicar('Acessar Gerenciador');
  await t.esperarTexto('Gerenciamento de Usuários');
  await page.type('input[placeholder^="Buscar"]', 'e2e');
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 2);
  t.ok('Login master e filtro no painel admin');
});
