package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.ResultadoDTO;
import br.com.uff.fairplay.dto.ResultadoEventoDTO;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.HistoricoAtleta;
import br.com.uff.fairplay.model.ResultadoCampeonato;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import br.com.uff.fairplay.repository.ResultadoCampeonatoRepository;
import br.com.uff.fairplay.service.RegrasElegibilidade.Recomendacao;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class RecomendacaoCategoriaService {

    private static final String CATEGORIA_NAO_ESPECIFICADA = "Não especificada";

    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;

    public RecomendacaoCategoriaService(AtletaRepository atletaRepository,
                                        ResultadoCampeonatoRepository resultadoRepository,
                                        HistoricoAtletaRepository historicoAtletaRepository,
                                        InscricaoEventoRepository inscricaoEventoRepository) {
        this.atletaRepository = atletaRepository;
        this.resultadoRepository = resultadoRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
    }

    /** Resultado com data (evento do FairPlay ou lançamento manual), para ordenar do mais recente ao mais antigo. */
    private record ResultadoDatado(ResultadoDTO linha, LocalDate data, Participacao participacao) {}

    /** Monta o painel do atleta: histórico unificado, métricas e categoria recomendada. */
    public DashboardAtletaDTO obterDashboard(Long atletaId) {
        Atleta atleta = atletaRepository.findById(atletaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado com ID: " + atletaId));

        // Resultados com data: eventos do FairPlay e lançamentos manuais, do mais recente ao mais antigo
        List<ResultadoDatado> datados = new ArrayList<>();
        for (ResultadoEventoDTO r : inscricaoEventoRepository.buscarResultadosDoAtleta(atletaId)) {
            String categoria = r.nivel() != null ? r.nivel().getDescricao() : CATEGORIA_NAO_ESPECIFICADA;
            datados.add(new ResultadoDatado(
                    new ResultadoDTO(r.inscricaoId(), "EVENTO", r.evento(), r.data(), categoria, r.colocacao()),
                    r.data(),
                    r.nivel() != null ? new Participacao(r.nivel(), r.colocacao()) : null));
        }
        for (ResultadoCampeonato r : resultadoRepository.findByAtletaIdOrderByDataCampeonatoDesc(atletaId)) {
            String categoria = r.getCategoria() != null ? r.getCategoria().getDescricao() : CATEGORIA_NAO_ESPECIFICADA;
            datados.add(new ResultadoDatado(
                    new ResultadoDTO(r.getId(), "MANUAL", r.getNomeCampeonato(), r.getDataCampeonato(), categoria, r.getColocacao()),
                    r.getDataCampeonato(),
                    r.getCategoria() != null && r.getColocacao() != null ? new Participacao(r.getCategoria(), r.getColocacao()) : null));
        }
        datados.sort(Comparator.comparing(ResultadoDatado::data, Comparator.nullsLast(Comparator.reverseOrder())));

        List<ResultadoDTO> historico = new ArrayList<>();
        List<Participacao> participacoes = new ArrayList<>();
        for (ResultadoDatado d : datados) {
            historico.add(d.linha());
            if (d.participacao() != null) participacoes.add(d.participacao());
        }

        // Histórico importado (sem data), depois dos resultados datados
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
