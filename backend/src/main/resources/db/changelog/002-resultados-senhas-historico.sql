--liquibase formatted sql

--changeset fairplay:002-colocacao-na-inscricao
--comment: Resultado do evento lançado pelo organizador (colocação do atleta na categoria)
ALTER TABLE inscricoes_evento ADD COLUMN colocacao int DEFAULT NULL;

--changeset fairplay:002-remove-coluna-sem-uso
--comment: Coluna nunca usada pelo sistema (vazia em todos os registros)
ALTER TABLE inscricoes_evento DROP COLUMN historico_atleta_id;

--changeset fairplay:002-atleta-historico-pendente
--comment: Atletas criados a partir do histórico ficam pendentes (sem contato nem senha) até a pessoa reivindicar a conta
ALTER TABLE atletas
  MODIFY data_nascimento date NULL,
  MODIFY celular varchar(15) NULL,
  MODIFY email varchar(255) NULL,
  MODIFY senha varchar(255) NULL,
  MODIFY cidade varchar(100) NULL,
  MODIFY estado varchar(2) NULL;

--changeset fairplay:002-limpa-dados-inventados
--comment: Remove os dados fictícios (e-mail, celular, senha, nascimento e cidade) dos atletas do histórico já criados
UPDATE atletas
SET email = NULL, celular = NULL, senha = NULL, data_nascimento = NULL, cidade = NULL, estado = NULL
WHERE perfil = 'HISTORICO';

--changeset fairplay:002-tokens-redefinicao-senha
--comment: Links de recuperação de senha (uso único, com validade)
CREATE TABLE tokens_redefinicao_senha (
  token varchar(64) NOT NULL,
  usuario_id bigint NOT NULL,
  expira_em datetime(6) NOT NULL,
  PRIMARY KEY (token),
  KEY idx_token_usuario (usuario_id),
  CONSTRAINT fk_token_usuario FOREIGN KEY (usuario_id) REFERENCES atletas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
