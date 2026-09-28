package br.com.uff.fairplay.dto;

import java.util.List;

/** CPFs lidos da planilha enviada pelo organizador (com ou sem pontuação). */
public record InscricaoLoteDTO(List<String> cpfs) {}
