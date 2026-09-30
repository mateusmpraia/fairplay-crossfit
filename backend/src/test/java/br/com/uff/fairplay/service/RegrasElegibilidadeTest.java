package br.com.uff.fairplay.service;

import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.service.RegrasElegibilidade.CriteriosEvento;
import br.com.uff.fairplay.service.RegrasElegibilidade.ResultadoAuditoria;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.List;

import static br.com.uff.fairplay.model.CategoriaCompeticao.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RegrasElegibilidadeTest {

    private static final CriteriosEvento TODOS_LIGADOS = new CriteriosEvento(true, true, true);
    private static final CriteriosEvento TODOS_DESLIGADOS = new CriteriosEvento(false, false, false);

    private static Participacao p(br.com.uff.fairplay.model.CategoriaCompeticao categoria, int colocacao) {
        return new Participacao(categoria, colocacao);
    }

    /** Auditoria num evento que oferece todas as categorias ao atleta. */
    private static ResultadoAuditoria auditar(br.com.uff.fairplay.model.CategoriaCompeticao nivel, CriteriosEvento criterios,
                                              List<Participacao> participacoes) {
        return RegrasElegibilidade.auditar(nivel, criterios, participacoes, EnumSet.allOf(br.com.uff.fairplay.model.CategoriaCompeticao.class));
    }

    @Nested
    class Genero {

        @Test
        void categoriaMistaAceitaTodos() {
            assertThatCode(() -> RegrasElegibilidade.validarGenero("MASCULINO", "Misto")).doesNotThrowAnyException();
            assertThatCode(() -> RegrasElegibilidade.validarGenero("FEMININO", "Misto")).doesNotThrowAnyException();
        }

        @Test
        void generoOutroPodeIrParaMasculinaFemininaOuMista() {
            assertThatCode(() -> RegrasElegibilidade.validarGenero("OUTRO", "Masculino")).doesNotThrowAnyException();
            assertThatCode(() -> RegrasElegibilidade.validarGenero("OUTRO", "Feminino")).doesNotThrowAnyException();
            assertThatCode(() -> RegrasElegibilidade.validarGenero("OUTRO", "Misto")).doesNotThrowAnyException();
        }

        @Test
        void masculinoNaoEntraEmFeminina() {
            assertThatThrownBy(() -> RegrasElegibilidade.validarGenero("MASCULINO", "Feminino"))
                    .isInstanceOf(RegraNegocioException.class)
                    .hasMessageContaining("masculino");
        }

        @Test
        void generoCompativelSegueAsMesmasRegras() {
            assertThat(RegrasElegibilidade.generoCompativel("MASCULINO", "Masculino")).isTrue();
            assertThat(RegrasElegibilidade.generoCompativel("MASCULINO", "Misto")).isTrue();
            assertThat(RegrasElegibilidade.generoCompativel("MASCULINO", "Feminino")).isFalse();
            assertThat(RegrasElegibilidade.generoCompativel("FEMININO", "Masculino")).isFalse();
            assertThat(RegrasElegibilidade.generoCompativel("OUTRO", "Feminino")).isTrue();
        }

        @Test
        void femininoNaoEntraEmMasculina() {
            assertThatThrownBy(() -> RegrasElegibilidade.validarGenero("FEMININO", "Masculino"))
                    .isInstanceOf(RegraNegocioException.class)
                    .hasMessageContaining("feminino");
        }
    }

    @Nested
    class Auditoria {

        @Test
        void semHistoricoFicaRegular() {
            ResultadoAuditoria r = auditar(RX, TODOS_LIGADOS, List.of());
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.REGULAR);
            assertThat(r.categoriaRecomendada()).isEqualTo("RX");
        }

        @Test
        void campeaoNaCategoriaFicaIrregularERecomendaAProxima() {
            ResultadoAuditoria r = auditar(SCALE, TODOS_LIGADOS, List.of(p(SCALE, 1)));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.IRREGULAR);
            assertThat(r.categoriaRecomendada()).isEqualTo("Intermediário");
        }

        @Test
        void campeaoEmCategoriaAcimaTambemFicaIrregular() {
            ResultadoAuditoria r = auditar(SCALE, TODOS_LIGADOS, List.of(p(RX, 1)));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.IRREGULAR);
        }

        @Test
        void campeaoMasterNaoContaComoCategoriaAcimaDeRx() {
            ResultadoAuditoria r = auditar(RX, TODOS_LIGADOS, List.of(p(MASTER, 1)));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.REGULAR);
        }

        @Test
        void campeaoEliteContaComoCategoriaAcimaDeRx() {
            ResultadoAuditoria r = auditar(RX, TODOS_LIGADOS, List.of(p(ELITE, 1)));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.IRREGULAR);
        }

        @Test
        void campeaoEliteContinuaRegularNaElite() {
            ResultadoAuditoria r = auditar(ELITE, TODOS_LIGADOS, List.of(p(ELITE, 1), p(ELITE, 1), p(ELITE, 2)));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.REGULAR);
            assertThat(r.categoriaRecomendada()).isEqualTo("Elite");
        }

        @Test
        void campeaoRxEPromovidoParaEliteNaoParaMaster() {
            ResultadoAuditoria r = auditar(RX, TODOS_LIGADOS, List.of(p(RX, 1)));
            assertThat(r.categoriaRecomendada()).isEqualTo("Elite");
        }

        @Test
        void tresPodiosNaMesmaCategoria() {
            List<Participacao> historico = List.of(p(RX, 2), p(RX, 3), p(RX, 2));
            assertThat(auditar(RX, new CriteriosEvento(false, true, false), historico).status())
                    .isEqualTo(RegrasElegibilidade.IRREGULAR);
            assertThat(auditar(RX, new CriteriosEvento(false, true, false), historico.subList(0, 2)).status())
                    .isEqualTo(RegrasElegibilidade.REGULAR);
        }

        @Test
        void tresParticipacoesNaMesmaCategoria() {
            List<Participacao> historico = List.of(p(SCALE, 10), p(SCALE, 12), p(SCALE, 8));
            ResultadoAuditoria r = auditar(SCALE, new CriteriosEvento(false, false, true), historico);
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.IRREGULAR);
            assertThat(r.motivo()).contains("3 vezes");
        }

        @Test
        void campeaoRxSemEliteNoEventoContinuaRegularNoRx() {
            ResultadoAuditoria r = RegrasElegibilidade.auditar(RX, TODOS_LIGADOS, List.of(p(RX, 1)), EnumSet.of(SCALE, RX, MASTER));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.REGULAR);
            assertThat(r.categoriaRecomendada()).isEqualTo("RX");
            assertThat(r.motivo()).contains("não tem categoria acima de RX");
        }

        @Test
        void campeaoRxComEliteNoEventoFicaIrregular() {
            ResultadoAuditoria r = RegrasElegibilidade.auditar(RX, TODOS_LIGADOS, List.of(p(RX, 1)), EnumSet.of(RX, ELITE));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.IRREGULAR);
            assertThat(r.categoriaRecomendada()).isEqualTo("Elite");
        }

        @Test
        void recomendaAMenorCategoriaDisponivelAcima() {
            ResultadoAuditoria r = RegrasElegibilidade.auditar(SCALE, TODOS_LIGADOS, List.of(p(SCALE, 1)), EnumSet.of(SCALE, RX, ELITE));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.IRREGULAR);
            assertThat(r.categoriaRecomendada()).isEqualTo("RX");
        }

        @Test
        void criteriosDesligadosNaoGeramInfracao() {
            ResultadoAuditoria r = auditar(SCALE, TODOS_DESLIGADOS, List.of(p(SCALE, 1), p(SCALE, 1), p(SCALE, 1)));
            assertThat(r.status()).isEqualTo(RegrasElegibilidade.REGULAR);
        }
    }

    @Nested
    class Recomendacao {

        @Test
        void semHistoricoFicaADefinir() {
            assertThat(RegrasElegibilidade.recomendar(List.of()).categoria()).isEqualTo("A Definir");
        }

        @Test
        void campeaoSobeParaAProxima() {
            assertThat(RegrasElegibilidade.recomendar(List.of(p(INTERMEDIARIO, 1))).categoria()).isEqualTo("RX");
        }

        @Test
        void campeaoEliteContinuaElite() {
            assertThat(RegrasElegibilidade.recomendar(List.of(p(ELITE, 1))).categoria()).isEqualTo("Elite");
        }

        @Test
        void tresPodiosSobem() {
            assertThat(RegrasElegibilidade.recomendar(List.of(p(SCALE, 2), p(SCALE, 3), p(SCALE, 2))).categoria())
                    .isEqualTo("Intermediário");
        }

        @Test
        void semPromocaoMantemACategoriaMaisRecente() {
            assertThat(RegrasElegibilidade.recomendar(List.of(p(RX, 7), p(SCALE, 5))).categoria()).isEqualTo("RX");
        }
    }
}
