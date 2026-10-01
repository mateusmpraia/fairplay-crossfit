package br.com.uff.fairplay.dto;

public record AtualizarRegrasDTO(
    boolean regraCampeaoSobe,
    boolean regraTresPodiosSobe,
    boolean regraTresParticipacoesSobe,
    Boolean regraNaoDesce
) {}
