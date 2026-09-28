package br.com.uff.fairplay.dto;

import java.time.LocalDate;
import java.util.List;

public record CriarEventoDTO(
    Long organizadorId,
    String nome,
    LocalDate dataInicio,
    LocalDate dataFim,
    String localizacao,
    boolean regraCampeaoSobe,
    boolean regraTresPodiosSobe,
    boolean regraTresParticipacoesSobe,
    List<CriarCategoriaDTO> categorias
) {}