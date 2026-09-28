package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.Evento;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Monta o histórico de competições de um atleta a partir de todas as origens de resultados.
 *
 * <p><b>Padrão Factory (Simple Factory):</b> quem precisa do histórico (a auditoria das inscrições e o
 * painel do atleta) pede à factory e recebe um {@link HistoricoDoAtleta} pronto, formado por
 * {@link RegistroCompeticao} (os adapters). Quem usa não conhece as fontes, as consultas ao banco nem os
 * formatos de cada origem.
 *
 * <p>As fontes chegam pelo Spring: toda classe {@link FonteHistorico} anotada com {@code @Component} entra
 * na lista, na ordem definida por {@code @Order}. Uma origem nova não exige mudança nesta classe.
 */
@Component
public class HistoricoCompeticaoFactory {

    private final List<FonteHistorico> fontes;

    public HistoricoCompeticaoFactory(List<FonteHistorico> fontes) {
        this.fontes = List.copyOf(fontes);
    }

    /** Histórico exibido no painel do atleta: só os resultados vinculados a ele. */
    public HistoricoDoAtleta paraPainel(Atleta atleta) {
        return montar(atleta, ConsultaHistorico.paraPainel());
    }

    /**
     * Histórico usado para auditar uma inscrição no evento informado: inclui o histórico com o mesmo nome
     * do atleta e deixa de fora os resultados do próprio evento.
     */
    public HistoricoDoAtleta paraAuditoria(Atleta atleta, Evento eventoAuditado) {
        return montar(atleta, ConsultaHistorico.paraAuditoria(eventoAuditado.getId()));
    }

    private HistoricoDoAtleta montar(Atleta atleta, ConsultaHistorico consulta) {
        return new HistoricoDoAtleta(fontes.stream()
                .flatMap(fonte -> fonte.buscar(atleta, consulta).stream())
                .toList());
    }
}
