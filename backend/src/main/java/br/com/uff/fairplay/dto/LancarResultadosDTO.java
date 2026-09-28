package br.com.uff.fairplay.dto;

import java.util.List;

/** Colocações finais de uma categoria. Colocação nula apaga um resultado lançado antes. */
public record LancarResultadosDTO(List<Item> resultados) {

    public record Item(Long inscricaoId, Integer colocacao) {}
}
