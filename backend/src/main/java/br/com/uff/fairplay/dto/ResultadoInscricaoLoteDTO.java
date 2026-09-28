package br.com.uff.fairplay.dto;

import br.com.uff.fairplay.model.InscricaoEvento;

import java.util.List;

/**
 * Resultado da inscrição em lote: as inscrições criadas e os CPFs que ficaram de fora.
 *
 * @param inscritos inscrições criadas (já com o resultado da auditoria)
 * @param falhas    CPFs não inscritos, cada um com o motivo
 */
public record ResultadoInscricaoLoteDTO(List<InscricaoEvento> inscritos, List<Falha> falhas) {

    public record Falha(String cpf, String motivo) {}
}
