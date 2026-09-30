package br.com.uff.fairplay.dto;

import java.util.List;

/**
 * Competições que o atleta marcou como suas e as que desmarcou (declarou não serem dele).
 */
public record VincularHistoricoDTO(List<Long> historicoIds, List<Long> recusadosIds) {}
