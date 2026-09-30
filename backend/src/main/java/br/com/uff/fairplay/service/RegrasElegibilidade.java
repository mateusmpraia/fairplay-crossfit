package br.com.uff.fairplay.service;

import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.model.CategoriaCompeticao;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Regras de categoria do FairPlay, num só lugar, usadas pela auditoria das inscrições e pela
 * recomendação do painel do atleta. São funções puras (sem banco), cobertas por testes unitários.
 */
public final class RegrasElegibilidade {

    public static final String REGULAR = "REGULAR";
    public static final String IRREGULAR = "IRREGULAR";

    /** Quantos pódios (ou participações) na mesma categoria obrigam a subir. */
    static final int LIMITE_REPETICOES = 3;

    private RegrasElegibilidade() {}

    /** Critérios de promoção que o organizador ligou no evento. */
    public record CriteriosEvento(boolean campeaoSobe, boolean tresPodiosSobe, boolean tresParticipacoesSobe) {}

    public record ResultadoAuditoria(String status, String categoriaRecomendada, String motivo) {}

    public record Recomendacao(String categoria, String motivo) {}

    /**
     * Confere se o gênero do atleta combina com o da categoria. Categorias mistas aceitam todos;
     * atletas com gênero "Outro" podem ser inscritos em categorias masculinas, femininas ou mistas.
     *
     * @throws RegraNegocioException se um atleta masculino for para categoria feminina ou vice-versa
     */
    public static void validarGenero(String generoAtleta, String generoCategoria) {
        if (generoCompativel(generoAtleta, generoCategoria)) {
            return;
        }
        throw new RegraNegocioException(ehFeminino(generoAtleta)
                ? "Atletas do sexo feminino não podem ser inscritos em categorias masculinas."
                : "Atletas do sexo masculino não podem ser inscritos em categorias femininas.");
    }

    /** Se o atleta pode competir numa categoria com este gênero (mesmas regras de {@link #validarGenero}). */
    public static boolean generoCompativel(String generoAtleta, String generoCategoria) {
        String categoria = generoCategoria != null ? generoCategoria.trim().toUpperCase() : "";
        if (categoria.contains("MIST")) {
            return true;
        }
        if (categoria.contains("MASC")) {
            return !ehFeminino(generoAtleta);
        }
        if (categoria.contains("FEM")) {
            return !ehMasculino(generoAtleta);
        }
        return true;
    }

    private static boolean ehMasculino(String genero) {
        return genero != null && genero.trim().toUpperCase().startsWith("M");
    }

    private static boolean ehFeminino(String genero) {
        return genero != null && genero.trim().toUpperCase().startsWith("F");
    }

    /**
     * Audita a inscrição numa categoria. Cada critério ligado que o atleta viola vira uma infração. A inscrição
     * só fica IRREGULAR se o evento oferecer ao atleta alguma categoria acima da inscrita (a recomendação é a
     * menor delas): não faz sentido obrigar a subir para uma categoria que o evento não tem. Em categorias sem
     * nível acima (Elite e Master) os critérios de promoção não se aplicam.
     *
     * @param niveisDisponiveis níveis das categorias do evento em que o atleta pode competir
     *                          (mesmo formato da categoria inscrita e gênero compatível)
     */
    public static ResultadoAuditoria auditar(CategoriaCompeticao nivel, CriteriosEvento criterios, List<Participacao> participacoes,
                                             Set<CategoriaCompeticao> niveisDisponiveis) {
        if (!nivel.temProxima()) {
            return new ResultadoAuditoria(REGULAR, nivel.getDescricao(),
                    "Categoria " + nivel.getDescricao() + " não tem nível acima: os critérios de promoção não se aplicam.");
        }

        List<String> infracoes = new ArrayList<>();

        if (criterios.campeaoSobe()) {
            boolean jaFoiCampeaoAquiOuAcima = participacoes.stream()
                    .anyMatch(p -> p.colocacao() == 1 && p.categoria().igualOuAcimaDe(nivel));
            if (jaFoiCampeaoAquiOuAcima) {
                infracoes.add("Já conquistou o 1º lugar na categoria " + nivel.getDescricao() + " ou superior.");
            }
        }

        if (criterios.tresPodiosSobe()) {
            long podios = participacoes.stream()
                    .filter(p -> p.categoria() == nivel && p.colocacao() >= 1 && p.colocacao() <= 3)
                    .count();
            if (podios >= LIMITE_REPETICOES) {
                infracoes.add("Possui " + podios + " pódios na categoria " + nivel.getDescricao() + " (limite: " + LIMITE_REPETICOES + ").");
            }
        }

        if (criterios.tresParticipacoesSobe()) {
            long vezes = participacoes.stream().filter(p -> p.categoria() == nivel).count();
            if (vezes >= LIMITE_REPETICOES) {
                infracoes.add("Já participou " + vezes + " vezes da categoria " + nivel.getDescricao() + ".");
            }
        }

        if (infracoes.isEmpty()) {
            return new ResultadoAuditoria(REGULAR, nivel.getDescricao(), "Atleta cumpre todos os critérios definidos.");
        }

        Optional<CategoriaCompeticao> destino = niveisDisponiveis.stream()
                .filter(n -> n != nivel && n.igualOuAcimaDe(nivel))
                .min(Comparator.comparingInt(CategoriaCompeticao::getNivel));
        if (destino.isEmpty()) {
            return new ResultadoAuditoria(REGULAR, nivel.getDescricao(),
                    String.join(" | ", infracoes) + " Mas o evento não tem categoria acima de " + nivel.getDescricao()
                            + " para este atleta, então ele pode competir nela.");
        }
        return new ResultadoAuditoria(IRREGULAR, destino.get().getDescricao(), String.join(" | ", infracoes));
    }

    /** Ordem em que as categorias são avaliadas para promoção (da mais alta para a mais baixa). */
    private static final CategoriaCompeticao[] ESCADA_PROMOCAO = {
            CategoriaCompeticao.ELITE,
            CategoriaCompeticao.RX,
            CategoriaCompeticao.INTERMEDIARIO,
            CategoriaCompeticao.SCALE,
            CategoriaCompeticao.INICIANTE
    };

    /**
     * Categoria recomendada para o atleta, a partir das participações ordenadas da mais recente para a
     * mais antiga. Em ordem: campeão numa categoria sobe para a seguinte; 3 pódios na mesma categoria
     * sobe para a seguinte; senão, mantém a categoria da participação mais recente.
     * As mesmas regras de promoção da auditoria valem aqui (campeão Elite continua Elite).
     */
    public static Recomendacao recomendar(List<Participacao> participacoes) {
        if (participacoes.isEmpty()) {
            return new Recomendacao("A Definir", "Atleta ainda não possui histórico de participações.");
        }

        for (CategoriaCompeticao categoria : ESCADA_PROMOCAO) {
            boolean foiCampeao = participacoes.stream()
                    .anyMatch(p -> p.categoria() == categoria && p.colocacao() == 1);
            if (foiCampeao) {
                return new Recomendacao(categoria.getProxima().getDescricao(), categoria.temProxima()
                        ? "Promovido automaticamente após ser Campeão na categoria " + categoria.getDescricao() + "."
                        : "Campeão na categoria " + categoria.getDescricao() + ", o nível mais alto.");
            }
        }

        for (CategoriaCompeticao categoria : ESCADA_PROMOCAO) {
            long podios = participacoes.stream()
                    .filter(p -> p.categoria() == categoria && p.colocacao() >= 1 && p.colocacao() <= 3)
                    .count();
            if (podios >= LIMITE_REPETICOES && categoria.temProxima()) {
                return new Recomendacao(categoria.getProxima().getDescricao(),
                        "Promovido após conquistar " + podios + " pódios na categoria " + categoria.getDescricao() + ".");
            }
        }

        return new Recomendacao(participacoes.get(0).categoria().getDescricao(),
                "Baseado na participação recente sem critérios de promoção imediata atingidos.");
    }
}
