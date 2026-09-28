package br.com.uff.fairplay.dto;

import java.time.LocalDate;
import java.util.List;

/** Dados do novo evento. O organizador é sempre o usuário logado. */
public record CriarEventoDTO(
    String nome,
    LocalDate dataInicio,
    LocalDate dataFim,
    String localizacao,
    boolean regraCampeaoSobe,
    boolean regraTresPodiosSobe,
    boolean regraTresParticipacoesSobe,
    List<CriarCategoriaDTO> categorias
) {}