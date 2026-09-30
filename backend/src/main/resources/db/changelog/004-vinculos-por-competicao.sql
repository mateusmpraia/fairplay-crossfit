--liquibase formatted sql

--changeset fairplay:004-recusas-historico
--comment: Competições do histórico que o atleta declarou não serem dele (desmarcou ao vincular ou desvinculou). A auditoria deixa de considerá-las mesmo que o nome seja idêntico ao dele
CREATE TABLE atletas_historico_recusas (
  id bigint NOT NULL AUTO_INCREMENT,
  atleta_id bigint NOT NULL,
  historico_id bigint NOT NULL,
  data_recusa timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_recusa_atleta_historico (atleta_id, historico_id),
  KEY fk_recusa_historico (historico_id),
  CONSTRAINT fk_recusa_atleta FOREIGN KEY (atleta_id) REFERENCES atletas (id) ON DELETE CASCADE,
  CONSTRAINT fk_recusa_historico FOREIGN KEY (historico_id) REFERENCES historico_atletas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--changeset fairplay:004-pedidos-desvinculo
--comment: Pedidos do atleta para desfazer um vínculo com o histórico depois do prazo livre; o administrador aprova ou recusa
CREATE TABLE pedidos_desvinculo_historico (
  id bigint NOT NULL AUTO_INCREMENT,
  atleta_id bigint NOT NULL,
  historico_id bigint NOT NULL,
  motivo varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  status varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDENTE',
  data_pedido datetime NOT NULL,
  data_decisao datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_pedido_status (status),
  KEY fk_pedido_atleta (atleta_id),
  KEY fk_pedido_historico (historico_id),
  CONSTRAINT fk_pedido_atleta FOREIGN KEY (atleta_id) REFERENCES atletas (id) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_historico FOREIGN KEY (historico_id) REFERENCES historico_atletas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
