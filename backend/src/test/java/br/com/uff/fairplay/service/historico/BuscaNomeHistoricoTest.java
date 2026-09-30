package br.com.uff.fairplay.service.historico;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BuscaNomeHistoricoTest {

    @Test
    void usaPrimeiroEUltimoNome() {
        assertThat(BuscaNomeHistorico.doNome("Ana Paula Souza"))
                .isEqualTo(new BuscaNomeHistorico("Ana", "Souza"));
    }

    @Test
    void ignoraConectivosEEspacosExtras() {
        assertThat(BuscaNomeHistorico.doNome("  Joao  da Silva dos  Santos "))
                .isEqualTo(new BuscaNomeHistorico("Joao", "Santos"));
        assertThat(BuscaNomeHistorico.doNome("Maria De Souza"))
                .isEqualTo(new BuscaNomeHistorico("Maria", "Souza"));
    }

    @Test
    void nomeDeUmaPalavraBuscaSoPorEla() {
        assertThat(BuscaNomeHistorico.doNome("Mateus"))
                .isEqualTo(new BuscaNomeHistorico("Mateus", "Mateus"));
    }

    @Test
    void nomeSoComConectivosNaoFicaVazio() {
        assertThat(BuscaNomeHistorico.doNome("dos"))
                .isEqualTo(new BuscaNomeHistorico("dos", "dos"));
    }
}
