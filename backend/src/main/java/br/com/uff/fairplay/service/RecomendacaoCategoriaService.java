package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.ResultadoDTO;
import br.com.uff.fairplay.dto.ResultadoEventoDTO;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.HistoricoAtleta;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import br.com.uff.fairplay.service.RegrasElegibilidade.Recomendacao;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RecomendacaoCategoriaService {

    private static final String CATEGORIA_NAO_ESPECIFICADA = "Não especificada";

    private final AtletaRepository atletaRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;

    public RecomendacaoCategoriaService(AtletaRepository atletaRepository,
                                        HistoricoAtletaRepository historicoAtletaRepository,
                                        InscricaoEventoRepository inscricaoEventoRepository) {
        this.atletaRepository = atletaRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
    }

    /**
     * Monta o painel do atleta: histórico unificado (eventos do FairPlay, do mais recente ao mais antigo,
     * e depois o histórico importado, que não tem data), métricas e categoria recomendada.
     */
    public DashboardAtletaDTO obterDashboard(Long atletaId) {
        Atleta atleta = atletaRepository.findById(atletaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado com ID: " + atletaId));

        List<ResultadoDTO> historico = new ArrayList<>();
        List<Participacao> participacoes = new ArrayList<>();

        for (ResultadoEventoDTO r : inscricaoEventoRepository.buscarResultadosDoAtleta(atletaId)) {
            String categoria = r.nivel() != null ? r.nivel().getDescricao() : CATEGORIA_NAO_ESPECIFICADA;
            historico.add(new ResultadoDTO(r.inscricaoId(), "EVENTO", r.evento(), r.data(), categoria, r.colocacao()));
            if (r.nivel() != null) {
                participacoes.add(new Participacao(r.nivel(), r.colocacao()));
            }
        }

        for (HistoricoAtleta h : historicoAtletaRepository.buscarHistoricoPorAtletaId(atletaId)) {
            historico.add(new ResultadoDTO(
                    h.getId(),
                    "HISTORICO",
                    h.getNomeCompeticao(),
                    null,
                    h.getCategoriaPadronizada() != null ? h.getCategoriaPadronizada() : CATEGORIA_NAO_ESPECIFICADA,
                    h.getColocacao() != null ? h.getColocacao() : 0
            ));
            CategoriaCompeticao categoria = CategoriaCompeticao.fromString(h.getCategoriaPadronizada());
            if (categoria != null && h.getColocacao() != null) {
                participacoes.add(new Participacao(categoria, h.getColocacao()));
            }
        }

        int totalPodios = (int) participacoes.stream()
                .filter(p -> p.colocacao() >= 1 && p.colocacao() <= 3)
                .count();

        Recomendacao recomendacao = RegrasElegibilidade.recomendar(participacoes);

        return new DashboardAtletaDTO(
                atleta.getId(),
                atleta.getNomeCompleto(),
                atleta.getNomeBox(),
                atleta.getEstado(),
                recomendacao.categoria(),
                recomendacao.motivo(),
                historico.size(),
                totalPodios,
                historico
        );
    }
}
