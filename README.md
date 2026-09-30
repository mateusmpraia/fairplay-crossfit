# FairPlay CrossFit

Sistema para organizar campeonatos de CrossFit com **auditoria de categoria**: ao inscrever um atleta, o sistema
confere o histórico dele (competições importadas e resultados de eventos anteriores) e aponta quem deveria estar
numa categoria acima.

- **Atleta:** cadastro (com vínculo ao histórico importado), painel com histórico, categoria recomendada e eventos em que está inscrito.
- **Organizador:** cria eventos e categorias, define os critérios de promoção, inscreve atletas (busca por nome/CPF ou planilha), lança os resultados e exporta a lista para Excel.
- **Administrador:** lista e exclui contas.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `backend/` | API em Spring Boot 4 (Java 21) + MySQL |
| `frontend/` | Interface em React 19 + Vite |
| `e2e/` | Testes de ponta a ponta no navegador (Puppeteer) |

## Pré-requisitos

- Java 21, Node.js 20+ e MySQL (testado no 5.7; recomendado atualizar para 8.x)
- Chrome ou Edge instalado (só para os testes de ponta a ponta)

## Configuração

### Backend

A senha do banco **não fica no git**. Crie o arquivo `backend/config/application.properties`:

```properties
spring.datasource.password=SUA_SENHA_DO_MYSQL
```

Ou use variáveis de ambiente:

| Variável | Padrão | Para quê |
|---|---|---|
| `DB_URL` | `jdbc:mysql://localhost:3306/fairplay_tcc?...` | endereço do banco |
| `DB_USUARIO` / `DB_SENHA` | `root` / vazio | credenciais do MySQL |
| `FAIRPLAY_ADMIN_USUARIO` / `FAIRPLAY_ADMIN_SENHA` | `master` / `master` | login do administrador (troque fora do ambiente de desenvolvimento) |
| `FRONTEND_URL` | `http://localhost:5173` | usado no link do e-mail de recuperação de senha |

**Recuperação de senha:** ainda desativada na interface — o botão "Esqueci minha senha" mostra o aviso
"Funcionalidade ainda não implementada". O backend já tem as rotas (`/api/conta/recuperar-senha` e
`/api/conta/redefinir-senha`); sem servidor SMTP, o link seria escrito no log. Para ativar no futuro, restaure o
formulário em `frontend/src/pages/Login.jsx` e preencha as linhas `spring.mail.*` em
`backend/src/main/resources/application.properties`.

### Frontend

Por padrão a interface usa a API em `http://localhost:8080/api`. Para mudar, copie `frontend/.env.example`
para `frontend/.env` e ajuste `VITE_API_URL`.

## Como rodar

```bash
# Backend (porta 8080) — cria/atualiza as tabelas automaticamente
cd backend
./mvnw spring-boot:run

# Frontend (porta 5173), em outro terminal
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173.

> **Windows com erro de certificado no Maven** (`PKIX path building failed`): acrescente
> `-Djavax.net.ssl.trustStoreType=Windows-ROOT` ao comando, por exemplo
> `./mvnw -Djavax.net.ssl.trustStoreType=Windows-ROOT spring-boot:run`. Isso faz o Java usar os certificados do Windows.

## Colocar no ar (ambiente de testes)

Sugestão: **backend e MySQL no Railway** e **frontend na Vercel**, ambos publicando a partir do GitHub.
O projeto já tem o que essas plataformas precisam: `backend/Dockerfile` e `frontend/vercel.json`
(e `frontend/public/_redirects`, caso use a Netlify).

### 1. Banco de dados (MySQL 8 no Railway ou outro provedor)

Leve os dados atuais para o banco da nuvem com o dump do MySQL local:

```bash
mysqldump -u root -p --single-transaction fairplay_tcc > fairplay_tcc.sql
mysql -h HOST -P PORTA -u USUARIO -p NOME_DO_BANCO < fairplay_tcc.sql
```

O dump inclui a tabela de controle do Liquibase, então o backend reconhece que o banco já está atualizado.
Com um banco vazio, o backend cria as tabelas sozinho (mas o histórico importado precisa ser carregado à parte).

### 2. Backend (Railway, a partir do `Dockerfile` da pasta `backend`)

| Variável | Exemplo | Observação |
|---|---|---|
| `DB_URL` | `jdbc:mysql://HOST:PORTA/NOME_DO_BANCO?useSSL=false&serverTimezone=UTC` | formato JDBC (não o `mysql://` que o Railway mostra) |
| `DB_USUARIO` / `DB_SENHA` | | credenciais do banco da nuvem |
| `CORS_ORIGENS` | `https://seu-projeto.vercel.app` | endereço do frontend; vários separados por vírgula |
| `FAIRPLAY_ADMIN_SENHA` | uma senha forte | **obrigatório trocar**: o padrão `master` gera aviso no log |
| `FRONTEND_URL` | `https://seu-projeto.vercel.app` | usado no link de recuperação de senha (ainda desativada) |

A porta vem da variável `PORT`, que a plataforma define sozinha.

### 3. Frontend (Vercel, pasta `frontend`)

- *Root directory:* `frontend` · *Build command:* `npm run build` · *Output directory:* `dist`
- Variável `VITE_API_URL` = endereço do backend + `/api` (ex.: `https://fairplay-backend.up.railway.app/api`).
  Ela é lida no momento do build: se mudar, publique de novo.

Depois de publicar o frontend, confira se o endereço dele está em `CORS_ORIGENS` no backend.

## Banco de dados e migrações

As tabelas são criadas e alteradas **apenas** pelas migrações do Liquibase, em
`backend/src/main/resources/db/changelog/`, aplicadas ao iniciar o backend. Para mudar o esquema,
crie um novo arquivo `.sql` e inclua-o em `db.changelog-master.yaml` — nunca altere uma migração já aplicada.

O histórico de competições (`historico_atletas`) é importado pelos scripts Python da pasta `Testes`, fora deste repositório.

| Tabela | Conteúdo |
|---|---|
| `atletas` | Contas de atletas e organizadores, e atletas pendentes do histórico (perfil `HISTORICO`) |
| `historico_atletas` | Resultados de competições importados |
| `atletas_historico_vinculos` | Quais registros do histórico pertencem a cada atleta (escolhidos competição por competição) |
| `atletas_historico_recusas` | Registros do histórico que o atleta declarou não serem dele (a auditoria os ignora) |
| `pedidos_desvinculo_historico` | Pedidos de desvínculo feitos depois do prazo livre, decididos pelo administrador |
| `eventos`, `categorias_evento` | Eventos criados pelos organizadores e suas categorias |
| `inscricoes_evento` | Inscrições, resultado da auditoria e colocação final |
| `sessoes` | Logins ativos (tokens) |
| `tokens_redefinicao_senha` | Links de recuperação de senha (recurso ainda desativado na interface) |

Todas usam `utf8mb4`. Ao excluir uma conta, o banco apaga em cascata as sessões, inscrições, vínculos e,
no caso de organizador, os eventos dele.

## Regras de categoria

A escada de promoção é **Iniciante → Scale → Intermediário → RX → Elite**. Master é uma categoria à parte.

- **Auditoria da inscrição** (critérios ligados pelo organizador em cada evento):
  campeão na categoria ou acima, 3 pódios na categoria, ou 3 participações na categoria → inscrição **irregular**,
  com recomendação da menor categoria acima que o evento oferece ao atleta.
- **Só se sobe para categoria que existe:** se o evento não tem categoria acima da inscrita com o mesmo formato
  e gênero compatível (ex.: não tem Elite feminina), a inscrição fica **regular** e o diagnóstico explica o motivo.
- **Reauditoria automática:** a auditoria fica gravada na inscrição e é refeita quando o histórico do atleta muda
  (vínculo feito ou desfeito, nome alterado, resultado lançado ou apagado) e quando o organizador muda critérios ou
  categorias. Só inscrições em aberto (sem colocação, em eventos que não terminaram) são refeitas. Mudanças de status
  causadas pelo histórico aparecem em destaque para o organizador até ele marcar "Ciente".
- **Histórico do atleta:** ele vincula as competições do histórico importado uma a uma (pode ter usado nomes
  diferentes, e o mesmo nome pode ser de outra pessoa). Desfazer um vínculo é livre por 24 horas
  (`fairplay.vinculo.prazo-desvinculo-horas`); depois, só com pedido aprovado pelo administrador.
  A auditoria também considera competições com nome idêntico ao da conta, exceto as que o atleta declarou não serem
  dele e as vinculadas à conta de outra pessoa.
- **Elite e Master não sobem:** um campeão Elite continua Elite, e nessas categorias os critérios não se aplicam.
- **Master fica fora da escada:** um título no Master não conta como "categoria acima" de RX (nem de nenhuma outra).
- **Recomendação do painel do atleta:** usa as mesmas regras sobre todo o histórico dele.
- **Gênero:** masculino não entra em categoria feminina e vice-versa; categorias mistas aceitam todos;
  atletas com gênero "Outro" podem ser inscritos em categorias masculinas, femininas ou mistas.
- **Histórico considerado:** resultados de eventos do próprio FairPlay (colocações lançadas pelo organizador)
  e o histórico importado.

As regras estão em `backend/.../service/RegrasElegibilidade.java`, cobertas por testes unitários.

## Testes

```bash
# Testes unitários do backend (regras de categoria e validação do cadastro)
cd backend
./mvnw test

# Testes de ponta a ponta — com backend e frontend rodando
cd e2e
npm install
npm test
```

Os testes de ponta a ponta usam o banco configurado: criam usuários com e-mail `e2e.*` e os apagam ao terminar.
Em caso de falha, capturas de tela ficam em `e2e/capturas/`; com a variável `DEPURAR=1`, os testes também
mostram as navegações e as respostas 401 do navegador. Se o navegador não for encontrado,
defina a variável `NAVEGADOR` com o caminho do Chrome/Edge.
