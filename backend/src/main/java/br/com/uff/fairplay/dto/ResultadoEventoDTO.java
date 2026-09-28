package br.com.uff.fairplay.dto;

import br.com.uff.fairplay.model.CategoriaCompeticao;

import java.time.LocalDate;

/** Colocação de um atleta num evento do próprio FairPlay, lançada pelo organizador. */
public record ResultadoEventoDTO(
    Long inscricaoId,
    Long eventoId,
    String evento,
    LocalDate data,
    CategoriaCompeticao nivel,
    Integer colocacao
) {}
