package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Colocações lançadas pelos organizadores em eventos do FairPlay, do evento mais recente para o mais
 * antigo. Vem primeiro no histórico ({@code @Order(1)}) porque tem data: a recomendação usa o resultado
 * mais recente. Na auditoria, o próprio evento auditado fica de fora.
 */
@Component
@Order(1)
public class FonteEventosFairPlay implements FonteHistorico {

    private final InscricaoEventoRepository inscricaoEventoRepository;

    public FonteEventosFairPlay(InscricaoEventoRepository inscricaoEventoRepository) {
        this.inscricaoEventoRepository = inscricaoEventoRepository;
    }

    @Override
    public List<RegistroCompeticao> buscar(Atleta atleta, ConsultaHistorico consulta) {
        return inscricaoEventoRepository.buscarResultadosDoAtleta(atleta.getId()).stream()
                .map(RegistroEventoFairPlay::new)
                .filter(r -> !consulta.ehAuditoria() || !r.eventoId().equals(consulta.eventoAuditadoId()))
                .map(RegistroCompeticao.class::cast)
                .toList();
    }
}
