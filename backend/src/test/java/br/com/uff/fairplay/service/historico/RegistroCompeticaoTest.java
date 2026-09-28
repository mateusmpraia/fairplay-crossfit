package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.dto.ResultadoEventoDTO;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.HistoricoAtleta;
import br.com.uff.fairplay.service.Participacao;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Os adapters expõem origens diferentes da mesma forma. */
class RegistroCompeticaoTest {

    private static HistoricoAtleta historico(Long id, String categoria, Integer colocacao) {
        HistoricoAtleta h = new HistoricoAtleta();
        h.setId(id);
        h.setNomeCompeticao("WOD RIO SUMMIT");
        h.setCategoriaPadronizada(categoria);
        h.setColocacao(colocacao);
        return h;
    }

    @Test
    void historicoImportadoConverteACategoriaEmTexto() {
        RegistroCompeticao r = new RegistroHistoricoImportado(historico(10L, "Rx", 2));

        assertThat(r.id()).isEqualTo(10L);
        assertThat(r.origem()).isEqualTo(Origem.HISTORICO);
        assertThat(r.competicao()).isEqualTo("WOD RIO SUMMIT");
        assertThat(r.data()).isEmpty();
        assertThat(r.categoria()).isEqualTo(CategoriaCompeticao.RX);
        assertThat(r.categoriaExibida()).isEqualTo("Rx");
        assertThat(r.participacao()).contains(new Participacao(CategoriaCompeticao.RX, 2));
    }

    @Test
    void categoriaDesconhecidaAparecePraExibicaoMasNaoEntraNasRegras() {
        RegistroCompeticao r = new RegistroHistoricoImportado(historico(11L, "Outros", 1));

        assertThat(r.categoria()).isNull();
        assertThat(r.categoriaExibida()).isEqualTo("Outros");
        assertThat(r.participacao()).isEmpty();
    }

    @Test
    void semCategoriaOuSemColocacaoNaoEntraNasRegras() {
        assertThat(new RegistroHistoricoImportado(historico(12L, null, 3)).categoriaExibida())
                .isEqualTo(RegistroCompeticao.CATEGORIA_NAO_ESPECIFICADA);
        assertThat(new RegistroHistoricoImportado(historico(13L, "Scale", null)).participacao()).isEmpty();
    }

    @Test
    void eventoDoFairPlayUsaADataEOEnumDaCategoria() {
        LocalDate data = LocalDate.of(2026, 3, 15);
        RegistroEventoFairPlay r = new RegistroEventoFairPlay(
                new ResultadoEventoDTO(55L, 7L, "Open Niterói", data, CategoriaCompeticao.SCALE, 1));

        assertThat(r.id()).isEqualTo(55L);
        assertThat(r.eventoId()).isEqualTo(7L);
        assertThat(r.origem()).isEqualTo(Origem.EVENTO);
        assertThat(r.data()).contains(data);
        assertThat(r.categoriaExibida()).isEqualTo("Scale");
        assertThat(r.participacao()).contains(new Participacao(CategoriaCompeticao.SCALE, 1));
    }
}
