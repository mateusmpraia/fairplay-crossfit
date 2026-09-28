// Funções compartilhadas pelos testes de ponta a ponta.
// Todo dado de teste usa e-mail começando com "e2e." e é apagado no final de cada teste.
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const API = process.env.API_URL || 'http://localhost:8080/api';
export const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
export const ADMIN = { usuario: process.env.FAIRPLAY_ADMIN_USUARIO || 'master', senha: process.env.FAIRPLAY_ADMIN_SENHA || 'master' };
export const PASTA_CAPTURAS = new URL('./capturas/', import.meta.url);

const NAVEGADORES = [
  process.env.NAVEGADOR,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

/** CPF válido (com dígitos verificadores) a partir de 9 dígitos. */
export function gerarCpf(nove) {
  const d = String(nove).padStart(9, '0').split('').map(Number);
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += d[i] * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    d.push(resto === 10 ? 0 : resto);
  }
  const s = d.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

export async function chamar(metodo, caminho, corpo, token) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  try { return { status: r.status, data: JSON.parse(texto) }; } catch { return { status: r.status, data: texto }; }
}

/** Dados de cadastro válidos; sobrescreva o que precisar. */
export const usuario = (dados) => ({
  genero: 'FEMININO', dataNascimento: '1995-05-10', cidade: 'Niterói', estado: 'RJ',
  nomeBox: 'Box E2E', senha: 'abc123', perfil: 'ATLETA', ...dados,
});

export async function cadastrar(dados) {
  const r = await chamar('POST', '/atletas/cadastro', usuario(dados));
  if (r.status !== 201) throw new Error(`Cadastro de ${dados.email} falhou: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}

export async function logar(email, perfil = 'ATLETA', senha = 'abc123') {
  const r = await chamar('POST', '/atletas/login', { login: email, senha, perfil });
  if (r.status !== 200) throw new Error(`Login de ${email} falhou: ${r.status} ${r.data}`);
  return r.data;
}

/**
 * Apaga os usuários de teste (e-mail "e2e.*" ou nome "E2E ...") e os ids extras informados
 * (ex.: atleta pendente do histórico criado no teste). Os eventos somem junto com o organizador.
 */
export async function limparDadosDeTeste(idsExtras = []) {
  const { data: admin } = await chamar('POST', '/admin/usuarios/login', ADMIN);
  const { data: usuarios } = await chamar('GET', '/admin/usuarios', null, admin.token);
  const deTeste = usuarios.filter((u) => u.email?.startsWith('e2e.') || u.nomeCompleto?.startsWith('E2E ') || idsExtras.includes(u.id));
  for (const u of deTeste) await chamar('DELETE', `/admin/usuarios/${u.id}`, null, admin.token);
  const { data: restantes } = await chamar('GET', '/admin/usuarios', null, admin.token);
  return restantes.filter((u) => u.email?.startsWith('e2e.') || u.nomeCompleto?.startsWith('E2E ')).length;
}

/** Abre o navegador e devolve utilitários para o teste. Erros de console/página/API são coletados. */
export async function abrirNavegador(nomeTeste) {
  const executavel = NAVEGADORES.find((c) => existsSync(c));
  if (!executavel) throw new Error('Nenhum Chrome/Edge encontrado. Defina a variável NAVEGADOR com o caminho do executável.');
  if (!existsSync(PASTA_CAPTURAS)) mkdirSync(PASTA_CAPTURAS, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: executavel, headless: true, defaultViewport: { width: 1400, height: 900 } });
  const page = await browser.newPage();
  const problemas = [];
  const errosEsperados = [];
  page.on('console', (m) => { if (m.type() === 'error') problemas.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problemas.push('erro na página: ' + e.message));
  if (process.env.DEPURAR) {
    page.on('response', (r) => { if (r.status() === 401) console.log('    [401]', r.request().method(), r.url()); });
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('    [navegou]', f.url()); });
  }
  page.on('dialog', async (d) => { problemas.push('alert: ' + d.message()); await d.dismiss(); });

  let passo = 0;
  const t = {
    page,
    browser,
    problemas,
    /** Ids de registros criados indiretamente no teste que também devem ser apagados no final. */
    idsParaApagar: [],
    /** Registra um erro de console que o teste provoca de propósito (ex.: senha errada → 401). */
    esperarErroConsole: (trecho) => errosEsperados.push(trecho),
    ok: (msg) => console.log(`  ✔ ${++passo}. ${msg}`),
    passoAtual: () => passo + 1,
    texto: () => page.evaluate(() => document.body.innerText),
    esperarTexto: (texto, timeout = 8000) =>
      page.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, texto),
    clicar: async (texto, tag = 'button') =>
      (await page.waitForSelector(`::-p-xpath(//${tag}[contains(normalize-space(.), ${JSON.stringify(texto)})])`, { timeout: 8000 })).click(),
    clicarExato: async (texto, tag = 'button') =>
      (await page.waitForSelector(`::-p-xpath(//${tag}[normalize-space(.)=${JSON.stringify(texto)}])`, { timeout: 8000 })).click(),
    digitar: async (seletor, valor) => {
      await page.click(seletor, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(seletor, valor);
    },
    capturar: (nome) => page.screenshot({ path: fileURLToPath(new URL(`${nomeTeste}-${nome}.png`, PASTA_CAPTURAS)) }),
    fechar: async () => {
      await browser.close();
      return problemas.filter((p) => !errosEsperados.some((e) => p.includes(e)));
    },
  };
  return t;
}

/** Executa o corpo do teste, captura a tela se falhar, limpa os dados e imprime o resumo. */
export async function executarTeste(nome, corpo) {
  console.log(`\n▶ ${nome}`);
  let t;
  let falhou = false;
  try {
    t = await abrirNavegador(nome);
    await corpo(t);
  } catch (e) {
    falhou = true;
    console.log(`  ✘ falhou no passo ${t?.passoAtual() ?? 1}: ${e.message}`);
    await t?.capturar('erro').catch(() => {});
  }
  const problemas = t ? await t.fechar() : [];
  const restantes = await limparDadosDeTeste(t?.idsParaApagar ?? []);
  if (problemas.length) console.log('  Problemas encontrados:\n   - ' + problemas.join('\n   - '));
  if (restantes) console.log(`  ⚠ ${restantes} usuário(s) de teste não foram apagados`);
  const sucesso = !falhou && problemas.length === 0 && restantes === 0;
  console.log(sucesso ? '  ✅ passou' : '  ❌ falhou');
  return sucesso;
}
