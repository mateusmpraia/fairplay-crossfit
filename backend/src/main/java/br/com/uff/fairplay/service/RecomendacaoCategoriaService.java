package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.ResultadoDTO;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.service.RegrasElegibilidade.Recomendacao;
import br.com.uff.fairplay.service.historico.HistoricoCompeticaoFactory;
import br.com.uff.fairplay.service.historico.HistoricoDoAtleta;
import br.com.uff.fairplay.service.historico.RegistroCompeticao;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecomendacaoCategoriaService {

    private final AtletaRepository atletaRepository;
    private final HistoricoCompeticaoFactory historicoFactory;

    public RecomendacaoCategoriaService(AtletaRepository atletaRepository, HistoricoCompeticaoFactory historicoFactory) {
        this.atletaRepository = atletaRepository;
        this.historicoFactory = historicoFactory;
    }

    /**
     * Monta o painel do atleta: histórico unificado (eventos do FairPlay, do mais recente ao mais antigo,
     * e depois o histórico importado, que não tem data), métricas e categoria recomendada.
     */
    public DashboardAtletaDTO obterDashboard(Long atletaId) {
        Atleta atleta = atletaRepository.findById(atletaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado com ID: " + atletaId));

        HistoricoDoAtleta historico = historicoFactory.paraPainel(atleta);
        List<ResultadoDTO> linhas = historico.registros().stream().map(RecomendacaoCategoriaService::linhaDoPainel).toList();
        Recomendacao recomendacao = RegrasElegibilidade.recomendar(historico.participacoes());

        return new DashboardAtletaDTO(
                atleta.getId(),
                atleta.getNomeCompleto(),
                atleta.getNomeBox(),
                atleta.getEstado(),
                recomendacao.categoria(),
                recomendacao.motivo(),
                linhas.size(),
                historico.totalPodios(),
                linhas
        );
    }

    private static ResultadoDTO linhaDoPainel(RegistroCompeticao registro) {
        return new ResultadoDTO(
                registro.id(),
                registro.origem().name(),
                registro.competicao(),
                registro.data().orElse(null),
                registro.categoriaExibida(),
                registro.colocacao() != null ? registro.colocacao() : 0
        );
    }
}
