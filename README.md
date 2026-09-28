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

**E-mail de recuperação de senha:** sem servidor SMTP configurado, o link é escrito no log do backend
(procure por `redefinir-senha?token=`). Para enviar e-mails de verdade, descomente e preencha as linhas
`spring.mail.*` em `backend/src/main/resources/application.properties`.

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

## Banco de dados e migrações

As tabelas são criadas e alteradas **apenas** pelas migrações do Liquibase, em
`backend/src/main/resources/db/changelog/`, aplicadas ao iniciar o backend. Para mudar o esquema,
crie um novo arquivo `.sql` e inclua-o em `db.changelog-master.yaml` — nunca altere uma migração já aplicada.

O histórico de competições (`historico_atletas`) é importado pelos scripts Python da pasta `Testes`, fora deste repositório.

## Regras de categoria

A escada de promoção é **Iniciante → Scale → Intermediário → RX → Elite**. Master é uma categoria à parte.

- **Auditoria da inscrição** (critérios ligados pelo organizador em cada evento):
  campeão na categoria ou acima, 3 pódios na categoria, ou 3 participações na categoria → inscrição **irregular**,
  com recomendação da categoria seguinte.
- **Elite e Master não sobem:** um campeão Elite continua Elite, e nessas categorias os critérios não se aplicam.
- **Master fica fora da escada:** um título no Master não conta como "categoria acima" de RX (nem de nenhuma outra).
- **Recomendação do painel do atleta:** usa as mesmas regras sobre todo o histórico dele.
- **Gênero:** masculino não entra em categoria feminina e vice-versa; categorias mistas aceitam todos;
  atletas com gênero "Outro" podem ser inscritos em categorias masculinas, femininas ou mistas.
- **Histórico considerado:** resultados de eventos do próprio FairPlay (colocações lançadas pelo organizador),
  lançamentos manuais e o histórico importado.

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
