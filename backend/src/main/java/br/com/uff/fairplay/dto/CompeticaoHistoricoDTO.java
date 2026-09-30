package br.com.uff.fairplay.dto;

/**
 * Uma competição do histórico importado, para o atleta marcar se é dele ao vincular.
 *
 * @param situacao LIVRE (pode ser vinculada), MINHA (já vinculada ao atleta logado)
 *                 ou OUTRA_CONTA (já vinculada à conta de outra pessoa)
 */
public record CompeticaoHistoricoDTO(
    Long id,
    String nomeAtleta,
    String nomeCompeticao,
    String categoria,
    Integer colocacao,
    String boxOrigem,
    String situacao
) {
    public static final String LIVRE = "LIVRE";
    public static final String MINHA = "MINHA";
    public static final String OUTRA_CONTA = "OUTRA_CONTA";
}
