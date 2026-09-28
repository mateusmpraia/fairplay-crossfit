package br.com.uff.fairplay.dto;

import br.com.uff.fairplay.model.CategoriaCompeticao;

import java.time.LocalDate;

/** Inscrição vista pelo próprio atleta, com o resultado da auditoria e a colocação (se já lançada). */
public record MinhaInscricaoDTO(
    Long id,
    String evento,
    LocalDate dataInicio,
    LocalDate dataFim,
    String localizacao,
    String formato,
    String genero,
    CategoriaCompeticao nivel,
    String statusElegibilidade,
    String categoriaRecomendada,
    String motivoIrregularidade,
    Integer colocacao
) {}
