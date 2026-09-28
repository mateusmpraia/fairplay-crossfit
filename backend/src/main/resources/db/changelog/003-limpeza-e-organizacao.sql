--liquibase formatted sql

--changeset fairplay:003-historico-box-vazio
--comment: Padroniza "sem box" no histórico importado: ".", "-", "N/D" e texto vazio viram NULL
UPDATE historico_atletas
SET box_origem = NULL
WHERE TRIM(box_origem) IN ('', '.', '-', 'N/D');

--changeset fairplay:003-historico-espacos
--comment: Remove espaços sobrando no início, no fim e duplicados no meio dos textos do histórico
UPDATE historico_atletas
SET nome_competicao = TRIM(nome_competicao),
    nome_atleta = TRIM(REPLACE(nome_atleta, '  ', ' ')),
    box_origem = TRIM(REPLACE(box_origem, '  ', ' '));

--changeset fairplay:003-historico-duplicados
--comment: Remove linhas repetidas do histórico (mesma competição, categoria, colocação, atleta e box), mantendo a de menor id
INSERT IGNORE INTO atletas_historico_vinculos (atleta_id, historico_id)
SELECT v.atleta_id, h1.id
FROM historico_atletas h1
JOIN historico_atletas h2
  ON h2.id > h1.id
 AND h2.nome_competicao = h1.nome_competicao
 AND h2.categoria_padronizada = h1.categoria_padronizada
 AND h2.colocacao <=> h1.colocacao
 AND h2.nome_atleta = h1.nome_atleta
 AND h2.box_origem <=> h1.box_origem
JOIN atletas_historico_vinculos v ON v.historico_id = h2.id;

DELETE h2
FROM historico_atletas h1
JOIN historico_atletas h2
  ON h2.id > h1.id
 AND h2.nome_competicao = h1.nome_competicao
 AND h2.categoria_padronizada = h1.categoria_padronizada
 AND h2.colocacao <=> h1.colocacao
 AND h2.nome_atleta = h1.nome_atleta
 AND h2.box_origem <=> h1.box_origem;

--changeset fairplay:003-vinculo-unico
--comment: O histórico passa a ser ligado ao atleta só pela tabela de vínculos; a coluna atleta_id (redundante) sai
INSERT IGNORE INTO atletas_historico_vinculos (atleta_id, historico_id)
SELECT atleta_id, id FROM historico_atletas WHERE atleta_id IS NOT NULL;

ALTER TABLE historico_atletas DROP FOREIGN KEY fk_historico_atleta;
ALTER TABLE historico_atletas DROP INDEX fk_historico_atleta, DROP COLUMN atleta_id;

--changeset fairplay:003-remove-resultados-manuais
--comment: Tabela de resultados lançados manualmente: vazia e sem tela; os resultados ficam nas inscrições dos eventos
DROP TABLE resultados_campeonato;

--changeset fairplay:003-colunas-obrigatorias
--comment: Colunas que nunca podem ficar vazias passam a ser NOT NULL
UPDATE eventos SET regra_campeao_sobe = 0 WHERE regra_campeao_sobe IS NULL;
UPDATE eventos SET regra_tres_podios_sobe = 0 WHERE regra_tres_podios_sobe IS NULL;
UPDATE eventos SET regra_tres_participacoes_sobe = 0 WHERE regra_tres_participacoes_sobe IS NULL;
ALTER TABLE eventos
  MODIFY regra_campeao_sobe tinyint(1) NOT NULL DEFAULT 0,
  MODIFY regra_tres_podios_sobe tinyint(1) NOT NULL DEFAULT 0,
  MODIFY regra_tres_participacoes_sobe tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE inscricoes_evento MODIFY atleta_id bigint NOT NULL;

--changeset fairplay:003-sessoes-fk
--comment: Sessões ligadas ao usuário: ao excluir a conta, as sessões somem junto (sessões do admin têm usuario_id NULL)
DELETE s FROM sessoes s LEFT JOIN atletas a ON a.id = s.usuario_id WHERE s.usuario_id IS NOT NULL AND a.id IS NULL;
ALTER TABLE sessoes
  ADD CONSTRAINT fk_sessao_usuario FOREIGN KEY (usuario_id) REFERENCES atletas (id) ON DELETE CASCADE;

--changeset fairplay:003-tokens-sem-uso
--comment: A recuperação de senha está desativada na interface; links pendentes não têm utilidade
DELETE FROM tokens_redefinicao_senha;

--changeset fairplay:003-utf8mb4
--comment: Um só padrão de caracteres (utf8mb4) em todas as tabelas do sistema, como já era o histórico
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE atletas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE atletas_historico_vinculos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE eventos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE categorias_evento CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE inscricoes_evento CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sessoes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tokens_redefinicao_senha CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
