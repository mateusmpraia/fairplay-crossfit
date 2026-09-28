package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.ResultadoDTO;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.HistoricoAtleta;
import br.com.uff.fairplay.model.ResultadoCampeonato;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.ResultadoCampeonatoRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class RecomendacaoCategoriaService {

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

    public DashboardAtletaDTO obterDashboard(Long atletaId) {
        Atleta atleta = atletaRepository.findById(atletaId)
                .orElseThrow(() -> new RuntimeException("Atleta não encontrado com ID: " + atletaId));

        // 1. Busca os resultados cadastrados diretamente no sistema
        List<ResultadoCampeonato> resultadosManuais = resultadoRepository.findByAtletaIdOrderByDataCampeonatoDesc(atletaId);

        // 2. Busca os resultados do histórico consolidado do CSV vinculado
        List<HistoricoAtleta> resultadosHistorico = historicoAtletaRepository.buscarHistoricoPorAtletaId(atletaId);

        // 3. Monta a lista unificada para o frontend (ResultadoDTO)
        List<ResultadoDTO> historicoDTO = new ArrayList<>();

        // Adiciona manuais
        for (ResultadoCampeonato r : resultadosManuais) {
            historicoDTO.add(new ResultadoDTO(
                    r.getId(),
                    r.getNomeCampeonato(),
                    r.getDataCampeonato(),
                    r.getCategoria() != null ? r.getCategoria().getDescricao() : "Não especificada",
                    r.getColocacao()
            ));
        }

        // Adiciona os históricos do CSV
        for (HistoricoAtleta h : resultadosHistorico) {
            historicoDTO.add(new ResultadoDTO(
                    h.getId(),
                    h.getNomeCompeticao(),
                    null, // Registros do histórico CSV não possuem data exata
                    h.getCategoriaPadronizada() != null ? h.getCategoriaPadronizada() : "Não especificada",
                    h.getColocacao() != null ? h.getColocacao() : 0
            ));
        }

        // Cria registros simplificados para aplicar a regra de recomendação de categoria
        List<RegistroCompeticaoUnificado> registrosParaCalculo = new ArrayList<>();
        for (ResultadoCampeonato r : resultadosManuais) {
            if (r.getCategoria() != null && r.getColocacao() != null) {
                registrosParaCalculo.add(new RegistroCompeticaoUnificado(r.getCategoria(), r.getColocacao()));
            }
        }
        for (HistoricoAtleta h : resultadosHistorico) {
            CategoriaCompeticao cat = converterCategoria(h.getCategoriaPadronizada());
            if (cat != null && h.getColocacao() != null) {
                registrosParaCalculo.add(new RegistroCompeticaoUnificado(cat, h.getColocacao()));
            }
        }

        int totalParticipacoes = historicoDTO.size();
        int totalPodios = (int) registrosParaCalculo.stream()
                .filter(r -> r.colocacao() > 0 && r.colocacao() <= 3)
                .count();

        // 4. Cálculo da Recomendação de Categoria
        String recomendada = "A Definir";
        String motivo = "Atleta ainda não possui histórico de participações.";

        if (!registrosParaCalculo.isEmpty()) {
            RecomendacaoResult result = calcularRecomendacao(registrosParaCalculo);
            recomendada = result.categoria();
            motivo = result.motivo();
        }

        return new DashboardAtletaDTO(
                atleta.getId(),
                atleta.getNomeCompleto(),
                atleta.getNomeBox(),
                atleta.getEstado(),
                recomendada,
                motivo,
                totalParticipacoes,
                totalPodios,
                historicoDTO
        );
    }

    private CategoriaCompeticao converterCategoria(String catTexto) {
        if (catTexto == null) return null;
        try {
            return CategoriaCompeticao.fromString(catTexto);
        } catch (Exception e) {
            // Tenta conversões mais tolerantes caso a categoria seja um texto similar
            String normalizado = catTexto.trim().toUpperCase();
            if (normalizado.contains("RX")) return CategoriaCompeticao.RX;
            if (normalizado.contains("INTERMEDI")) return CategoriaCompeticao.INTERMEDIARIO;
            if (normalizado.contains("SCALE")) return CategoriaCompeticao.SCALE;
            if (normalizado.contains("INIC")) return CategoriaCompeticao.INICIANTE;
            return null;
        }
    }

    private RecomendacaoResult calcularRecomendacao(List<RegistroCompeticaoUnificado> resultados) {
        CategoriaCompeticao[] hierarquia = {
                CategoriaCompeticao.RX,
                CategoriaCompeticao.INTERMEDIARIO,
                CategoriaCompeticao.SCALE,
                CategoriaCompeticao.INICIANTE
        };

        // 1. Regra: Se foi campeão (1º lugar) em uma categoria, sobe para a próxima
        for (CategoriaCompeticao cat : hierarquia) {
            boolean foiCampeao = resultados.stream()
                    .anyMatch(r -> r.categoria() == cat && r.colocacao() == 1);

            if (foiCampeao) {
                CategoriaCompeticao prox = cat.getProxima();
                return new RecomendacaoResult(
                        prox.getDescricao(),
                        "Promovido automaticamente após ser Campeão na categoria " + cat.getDescricao() + "."
                );
            }
        }

        // 2. Regra: Se subiu 3 vezes no pódio (<= 3) na mesma categoria, sobe para a próxima
        for (CategoriaCompeticao cat : hierarquia) {
            long qtdPodios = resultados.stream()
                    .filter(r -> r.categoria() == cat && r.colocacao() <= 3)
                    .count();

            if (qtdPodios >= 3) {
                CategoriaCompeticao prox = cat.getProxima();
                return new RecomendacaoResult(
                        prox.getDescricao(),
                        "Promovido após conquistar " + qtdPodios + " pódios na categoria " + cat.getDescricao() + "."
                );
            }
        }

        // Caso contrário, recomenda a primeira categoria encontrada
        RegistroCompeticaoUnificado ultimo = resultados.get(0);
        return new RecomendacaoResult(
                ultimo.categoria().getDescricao(),
                "Baseado na participação recente sem critérios de promoção imediata atingidos."
        );
    }

    private record RegistroCompeticaoUnificado(CategoriaCompeticao categoria, int colocacao) {}
    private record RecomendacaoResult(String categoria, String motivo) {}
}