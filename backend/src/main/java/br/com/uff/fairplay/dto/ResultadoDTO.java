package br.com.uff.fairplay.dto;

import java.time.LocalDate;

/**
 * Linha do histórico exibido no painel do atleta.
 *
 * @param origem EVENTO (evento do FairPlay), MANUAL (lançado pelo administrador) ou HISTORICO (importado)
 */
public record ResultadoDTO(
    Long id,
    String origem,
    String nomeCampeonato,
    LocalDate dataCampeonato,
    String categoria,
    Integer colocacao
) {}
