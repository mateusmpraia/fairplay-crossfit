package br.com.uff.fairplay.dto;

/** Quantidade de inscrições de uma categoria cuja auditoria mudou sozinha e o organizador ainda não marcou "ciente". */
public record AlteracaoAuditoriaDTO(Long eventoId, Long categoriaId, long quantidade) {}
