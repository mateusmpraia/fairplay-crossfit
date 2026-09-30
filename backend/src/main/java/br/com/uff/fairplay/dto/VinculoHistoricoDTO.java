package br.com.uff.fairplay.dto;

/**
 * Competição do histórico vinculada ao atleta, como aparece no painel dele.
 *
 * @param minutosParaDesfazer quanto tempo ainda resta para o atleta desfazer o vínculo sozinho (0 = prazo encerrado)
 * @param statusPedido        situação do último pedido de desvínculo (PENDENTE ou RECUSADO), ou nulo se não houver
 */
public record VinculoHistoricoDTO(
    Long historicoId,
    String nomeAtleta,
    String nomeCompeticao,
    String categoria,
    Integer colocacao,
    String boxOrigem,
    long minutosParaDesfazer,
    String statusPedido
) {}
