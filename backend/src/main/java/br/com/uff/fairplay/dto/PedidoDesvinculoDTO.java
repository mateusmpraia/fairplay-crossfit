package br.com.uff.fairplay.dto;

import java.time.LocalDateTime;

/** Pedido de desvínculo aguardando decisão, como aparece para o administrador. */
public record PedidoDesvinculoDTO(
    Long id,
    Long atletaId,
    String atletaNome,
    String atletaEmail,
    String nomeNoHistorico,
    String nomeCompeticao,
    String categoria,
    Integer colocacao,
    String boxOrigem,
    String motivo,
    LocalDateTime dataPedido
) {}
