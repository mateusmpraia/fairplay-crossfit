package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.ResultadoDTO;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.HistoricoAtleta;
import br.com.uff.fairplay.model.ResultadoCampeonato;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.ResultadoCampeonatoRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RecomendacaoCategoriaService {

    private static final String CATEGORIA_NAO_ESPECIFICADA = "Não especificada";

    /** Ordem em que as categorias são avaliadas para promoção (da mais alta para a mais baixa). */
    private static final CategoriaCompeticao[] HIERARQUIA_PROMOCAO = {
            CategoriaCompeticao.RX,
            CategoriaCompeticao.INTERMEDIARIO,
            CategoriaCompeticao.SCALE,
            CategoriaCompeticao.INICIANTE
    };

    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;

    public RecomendacaoCategoriaService(AtletaRepository atletaRepository,
                                        ResultadoCampeonatoRepository resultadoRepository,
                                        HistoricoAtletaRepository historicoAtletaRepository) {
        this.atletaRepository = atletaRepository;
        this.resultadoRepository = resultadoRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
    }

    /** Monta o painel do atleta: histórico unificado, métricas e categoria recomendada. */
    public DashboardAtletaDTO obterDashboard(Long atletaId) {
        Atleta atleta = atletaRepository.findById(atletaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado com ID: " + atletaId));

        List<ResultadoCampeonato> resultadosManuais = resultadoRepository.findByAtletaIdOrderByDataCampeonatoDesc(atletaId);
        List<HistoricoAtleta> resultadosHistorico = historicoAtletaRepository.buscarHistoricoPorAtletaId(atletaId);

        // Lista exibida no painel (inclui registros sem categoria reconhecida)
        List<ResultadoDTO> historico = new ArrayList<>();
        // Registros usados no cálculo (apenas os com categoria e colocação válidas)
        List<Participacao> participacoes = new ArrayList<>();

        for (ResultadoCampeonato r : resultadosManuais) {
            historico.add(new ResultadoDTO(
                    r.getId(),
                    r.getNomeCampeonato(),
                    r.getDataCampeonato(),
                    r.getCategoria() != null ? r.getCategoria().getDescricao() : CATEGORIA_NAO_ESPECIFICADA,
                    r.getColocacao()
            ));
            if (r.getCategoria() != null && r.getColocacao() != null) {
                participacoes.add(new Participacao(r.getCategoria(), r.getColocacao()));
            }
        }

        for (HistoricoAtleta h : resultadosHistorico) {
            historico.add(new ResultadoDTO(
                    h.getId(),
                    h.getNomeCompeticao(),
                    null, // o histórico importado não tem data
                    h.getCategoriaPadronizada() != null ? h.getCategoriaPadronizada() : CATEGORIA_NAO_ESPECIFICADA,
                    h.getColocacao() != null ? h.getColocacao() : 0
            ));
            CategoriaCompeticao categoria = CategoriaCompeticao.fromString(h.getCategoriaPadronizada());
            if (categoria != null && h.getColocacao() != null) {
                participacoes.add(new Participacao(categoria, h.getColocacao()));
            }
        }

        int totalPodios = (int) participacoes.stream()
                .filter(p -> p.colocacao() > 0 && p.colocacao() <= 3)
                .count();

        Recomendacao recomendacao = participacoes.isEmpty()
                ? new Recomendacao("A Definir", "Atleta ainda não possui histórico de participações.")
                : calcularRecomendacao(participacoes);

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

    /**
     * Regras, em ordem: campeão numa categoria sobe para a próxima; 3 pódios na mesma categoria
     * sobe para a próxima; caso contrário, mantém a categoria da participação mais recente.
     */
    private Recomendacao calcularRecomendacao(List<Participacao> participacoes) {
        for (CategoriaCompeticao categoria : HIERARQUIA_PROMOCAO) {
            boolean foiCampeao = participacoes.stream()
                    .anyMatch(p -> p.categoria() == categoria && p.colocacao() == 1);
            if (foiCampeao) {
                return new Recomendacao(
                        categoria.getProxima().getDescricao(),
                        "Promovido automaticamente após ser Campeão na categoria " + categoria.getDescricao() + "."
                );
            }
        }

        for (CategoriaCompeticao categoria : HIERARQUIA_PROMOCAO) {
            long podios = participacoes.stream()
                    .filter(p -> p.categoria() == categoria && p.colocacao() <= 3)
                    .count();
            if (podios >= 3) {
                return new Recomendacao(
                        categoria.getProxima().getDescricao(),
                        "Promovido após conquistar " + podios + " pódios na categoria " + categoria.getDescricao() + "."
                );
            }
        }

        return new Recomendacao(
                participacoes.get(0).categoria().getDescricao(),
                "Baseado na participação recente sem critérios de promoção imediata atingidos."
        );
    }

    private record Participacao(CategoriaCompeticao categoria, int colocacao) {}

    private record Recomendacao(String categoria, String motivo) {}
}
