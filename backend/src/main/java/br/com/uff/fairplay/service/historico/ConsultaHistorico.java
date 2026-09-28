package br.com.uff.fairplay.service.historico;

/**
 * Para que o histórico está sendo montado. As fontes usam isso para decidir o que devolver.
 *
 * <ul>
 *   <li><b>Painel</b> do atleta: só o que está vinculado a ele;</li>
 *   <li><b>Auditoria</b> de uma inscrição: também o histórico com o mesmo nome, e sem o próprio evento auditado.</li>
 * </ul>
 *
 * @param finalidade       painel ou auditoria
 * @param eventoAuditadoId evento cuja inscrição está sendo auditada (nulo no painel)
 */
public record ConsultaHistorico(Finalidade finalidade, Long eventoAuditadoId) {

    public enum Finalidade { PAINEL, AUDITORIA }

    public static ConsultaHistorico paraPainel() {
        return new ConsultaHistorico(Finalidade.PAINEL, null);
    }

    public static ConsultaHistorico paraAuditoria(Long eventoAuditadoId) {
        return new ConsultaHistorico(Finalidade.AUDITORIA, eventoAuditadoId);
    }

    public boolean ehAuditoria() {
        return finalidade == Finalidade.AUDITORIA;
    }
}
