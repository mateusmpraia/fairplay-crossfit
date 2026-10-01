--liquibase formatted sql

--changeset fairplay:006-regra-nao-desce
--comment: Novo critério de promoção: quem já competiu numa categoria acima não pode se inscrever numa abaixo. Desligado nos eventos que já existem (o organizador decide); eventos novos já vêm com ele ligado pela tela
ALTER TABLE eventos ADD COLUMN regra_nao_desce tinyint(1) NOT NULL DEFAULT 0;

--changeset fairplay:006-historico-considerado
--comment: Quantas competições do histórico a auditoria considerou na inscrição (0 = atleta sem histórico no sistema); nulo nas inscrições auditadas antes desta coluna
ALTER TABLE inscricoes_evento ADD COLUMN historico_considerado int DEFAULT NULL;
