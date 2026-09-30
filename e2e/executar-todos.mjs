// Roda todos os testes de ponta a ponta em sequência. Uso: npm test (com backend e frontend rodando).
import fluxoPrincipal from './01-fluxo-principal.mjs';
import inscricaoPorPlanilha from './02-inscricao-por-planilha.mjs';
import resultadosEConta from './03-resultados-e-conta.mjs';
import vinculosHistorico from './04-vinculos-historico.mjs';
import reauditoria from './05-reauditoria.mjs';
import { API, BASE } from './apoio.mjs';

for (const [nome, url] of [['backend', `${API}/atletas/historico/sugestoes?nome=abc`], ['frontend', BASE]]) {
  try {
    await fetch(url);
  } catch {
    console.error(`O ${nome} não está respondendo em ${url}. Suba o backend e o frontend antes de rodar os testes.`);
    process.exit(1);
  }
}

const resultados = [];
for (const teste of [fluxoPrincipal, inscricaoPorPlanilha, resultadosEConta, vinculosHistorico, reauditoria]) {
  resultados.push(await teste());
}

const falhas = resultados.filter((ok) => !ok).length;
console.log(falhas ? `\n${falhas} teste(s) falharam. Veja as capturas de tela em e2e/capturas/.` : '\nTodos os testes passaram.');
process.exit(falhas ? 1 : 0);
