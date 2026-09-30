--liquibase formatted sql

--changeset fairplay:005-auditoria-alterada
--comment: Quando a auditoria de uma inscrição muda de status sozinha (o histórico do atleta mudou depois da inscrição), guarda o status anterior e quando mudou, para destacar ao organizador até ele marcar "ciente"
ALTER TABLE inscricoes_evento
  ADD COLUMN status_anterior varchar(20) DEFAULT NULL,
  ADD COLUMN auditoria_alterada_em datetime DEFAULT NULL;
