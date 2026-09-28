package br.com.uff.fairplay.dto;

import java.util.List;

public record DashboardAtletaDTO(
    Long id,
    String nomeCompleto,
    String nomeBox,
    String estado,
    String categoriaRecomendada,
    String motivoRecomendacao,
    int totalParticipacoes,
    int totalPodios,
    List<ResultadoDTO> historico
) {}