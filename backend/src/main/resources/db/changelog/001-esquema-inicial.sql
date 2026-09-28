--liquibase formatted sql

-- Esquema do banco como estava antes do uso de migrações.
-- Em bancos que já existem (a tabela atletas já está lá), o changeset é apenas marcado como executado.

--changeset fairplay:001-esquema-inicial
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'atletas'

CREATE TABLE atletas (
  id bigint NOT NULL AUTO_INCREMENT,
  nome_completo varchar(255) NOT NULL,
  cpf varchar(14) DEFAULT NULL,
  data_nascimento date NOT NULL,
  genero varchar(20) NOT NULL,
  celular varchar(15) NOT NULL,
  email varchar(255) NOT NULL,
  senha varchar(255) NOT NULL,
  cidade varchar(100) NOT NULL,
  estado varchar(2) NOT NULL,
  nome_box varchar(100) NOT NULL,
  perfil varchar(20) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email_perfil (email, perfil),
  UNIQUE KEY uk_celular_perfil (celular, perfil),
  UNIQUE KEY uk_cpf_perfil (cpf, perfil)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE historico_atletas (
  id bigint NOT NULL AUTO_INCREMENT,
  nome_competicao varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  categoria_padronizada varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  colocacao int DEFAULT NULL,
  nome_atleta varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  box_origem varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  atleta_id bigint DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_historico_nome (nome_atleta),
  KEY fk_historico_atleta (atleta_id),
  CONSTRAINT fk_historico_atleta FOREIGN KEY (atleta_id) REFERENCES atletas (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE atletas_historico_vinculos (
  id bigint NOT NULL AUTO_INCREMENT,
  atleta_id bigint NOT NULL,
  historico_id bigint NOT NULL,
  data_vinculo timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_atleta_historico (atleta_id, historico_id),
  KEY fk_vinculo_historico (historico_id),
  CONSTRAINT fk_vinculo_atleta FOREIGN KEY (atleta_id) REFERENCES atletas (id) ON DELETE CASCADE,
  CONSTRAINT fk_vinculo_historico FOREIGN KEY (historico_id) REFERENCES historico_atletas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE eventos (
  id bigint NOT NULL AUTO_INCREMENT,
  organizador_id bigint NOT NULL,
  nome varchar(150) NOT NULL,
  data_inicio date NOT NULL,
  data_fim date DEFAULT NULL,
  localizacao varchar(150) DEFAULT NULL,
  regra_campeao_sobe tinyint(1) DEFAULT '0',
  regra_tres_podios_sobe tinyint(1) DEFAULT '0',
  regra_tres_participacoes_sobe tinyint(1) DEFAULT '0',
  PRIMARY KEY (id),
  KEY fk_evento_organizador (organizador_id),
  CONSTRAINT fk_evento_organizador FOREIGN KEY (organizador_id) REFERENCES atletas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE categorias_evento (
  id bigint NOT NULL AUTO_INCREMENT,
  evento_id bigint NOT NULL,
  formato varchar(50) NOT NULL,
  genero varchar(20) NOT NULL,
  nivel varchar(50) NOT NULL,
  PRIMARY KEY (id),
  KEY fk_categoria_evento (evento_id),
  CONSTRAINT fk_categoria_evento FOREIGN KEY (evento_id) REFERENCES eventos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE inscricoes_evento (
  id bigint NOT NULL AUTO_INCREMENT,
  categoria_evento_id bigint NOT NULL,
  atleta_id bigint DEFAULT NULL,
  status_elegibilidade varchar(20) NOT NULL,
  motivo_irregularidade text,
  data_inscricao timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  categoria_recomendada varchar(50) DEFAULT NULL,
  historico_atleta_id bigint DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_inscricao_atleta_cat (categoria_evento_id, atleta_id),
  KEY fk_inscricao_atleta (atleta_id),
  CONSTRAINT fk_inscricao_atleta FOREIGN KEY (atleta_id) REFERENCES atletas (id) ON DELETE CASCADE,
  CONSTRAINT fk_inscricao_categoria FOREIGN KEY (categoria_evento_id) REFERENCES categorias_evento (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE resultados_campeonato (
  id bigint NOT NULL AUTO_INCREMENT,
  nome_campeonato varchar(255) NOT NULL,
  data_campeonato date NOT NULL,
  categoria varchar(30) NOT NULL,
  colocacao int NOT NULL,
  atleta_id bigint NOT NULL,
  PRIMARY KEY (id),
  KEY fk_resultado_atleta (atleta_id),
  CONSTRAINT fk_resultado_atleta FOREIGN KEY (atleta_id) REFERENCES atletas (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE sessoes (
  token varchar(64) NOT NULL,
  expira_em datetime(6) NOT NULL,
  perfil varchar(20) NOT NULL,
  usuario_id bigint DEFAULT NULL,
  PRIMARY KEY (token),
  KEY idx_sessao_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
