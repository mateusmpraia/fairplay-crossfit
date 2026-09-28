package br.com.uff.fairplay.dto;

import java.time.LocalDate;

public record ResultadoDTO(
    Long id,
    String nomeCampeonato,
    LocalDate dataCampeonato,
    String categoria,
    Integer colocacao
) {}