package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.HistoricoAtleta;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Resultados de competições externas importados para a tabela historico_atletas (sem data).
 * No painel entram só os registros vinculados ao atleta; na auditoria, também os que têm o mesmo nome.
 */
@Component
@Order(2)
public class FonteHistoricoImportado implements FonteHistorico {

    private final HistoricoAtletaRepository historicoAtletaRepository;

    public FonteHistoricoImportado(HistoricoAtletaRepository historicoAtletaRepository) {
        this.historicoAtletaRepository = historicoAtletaRepository;
    }

    @Override
    public List<RegistroCompeticao> buscar(Atleta atleta, ConsultaHistorico consulta) {
        List<HistoricoAtleta> registros = consulta.ehAuditoria()
                ? historicoAtletaRepository.buscarHistoricoPorAtletaIdOuNome(atleta.getId(), atleta.getNomeCompleto())
                : historicoAtletaRepository.buscarHistoricoPorAtletaId(atleta.getId());

        return registros.stream()
                .map(RegistroHistoricoImportado::new)
                .map(RegistroCompeticao.class::cast)
                .toList();
    }
}
