package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.dto.ResultadoEventoDTO;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.Evento;
import br.com.uff.fairplay.model.HistoricoAtleta;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import br.com.uff.fairplay.service.Participacao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** A factory reúne as fontes na ordem certa e cada fonte respeita a finalidade da consulta. */
class HistoricoCompeticaoFactoryTest {

    private final InscricaoEventoRepository inscricoes = mock(InscricaoEventoRepository.class);
    private final HistoricoAtletaRepository historicos = mock(HistoricoAtletaRepository.class);
    private final Atleta atleta = new Atleta();
    private final Evento eventoAuditado = new Evento();

    private HistoricoCompeticaoFactory factory;

    private static HistoricoAtleta historico(Long id, String categoria, Integer colocacao) {
        HistoricoAtleta h = new HistoricoAtleta();
        h.setId(id);
        h.setNomeCompeticao("Competição " + id);
        h.setCategoriaPadronizada(categoria);
        h.setColocacao(colocacao);
        return h;
    }

    @BeforeEach
    void preparar() {
        atleta.setId(1L);
        atleta.setNomeCompleto("Ana Faggian");
        eventoAuditado.setId(20L);

        when(inscricoes.buscarResultadosDoAtleta(1L)).thenReturn(List.of(
                new ResultadoEventoDTO(100L, 20L, "Evento auditado", LocalDate.of(2026, 10, 1), CategoriaCompeticao.RX, 3),
                new ResultadoEventoDTO(101L, 10L, "Evento anterior", LocalDate.of(2026, 2, 1), CategoriaCompeticao.SCALE, 1)));
        when(historicos.buscarHistoricoPorAtletaId(1L)).thenReturn(List.of(historico(5L, "Elite", 1)));
        when(historicos.buscarHistoricoParaAuditoria(1L, "Ana Faggian"))
                .thenReturn(List.of(historico(5L, "Elite", 1), historico(6L, "Outros", 2)));

        // Mesma ordem que o Spring monta pela anotação @Order das fontes
        factory = new HistoricoCompeticaoFactory(List.of(
                new FonteEventosFairPlay(inscricoes), new FonteHistoricoImportado(historicos)));
    }

    @Test
    void painelTrazEventosPrimeiroEDepoisSoOHistoricoVinculado() {
        HistoricoDoAtleta historico = factory.paraPainel(atleta);

        assertThat(historico.registros()).extracting(RegistroCompeticao::id).containsExactly(100L, 101L, 5L);
        assertThat(historico.registros()).extracting(RegistroCompeticao::origem)
                .containsExactly(Origem.EVENTO, Origem.EVENTO, Origem.HISTORICO);
        verify(historicos, never()).buscarHistoricoParaAuditoria(any(), any());
    }

    @Test
    void auditoriaTiraOProprioEventoEIncluiOHistoricoComOMesmoNome() {
        HistoricoDoAtleta historico = factory.paraAuditoria(atleta, eventoAuditado);

        assertThat(historico.registros()).extracting(RegistroCompeticao::id).containsExactly(101L, 5L, 6L);
        // "Outros" não é categoria das regras: fica no histórico, mas não vira participação
        assertThat(historico.participacoes()).containsExactly(
                new Participacao(CategoriaCompeticao.SCALE, 1),
                new Participacao(CategoriaCompeticao.ELITE, 1));
    }

    @Test
    void contaOsPodios() {
        assertThat(factory.paraPainel(atleta).totalPodios()).isEqualTo(3);
    }

    @Test
    void umaFonteNovaEntraSemMudarAFactory() {
        List<FonteHistorico> fontes = new ArrayList<>();
        fontes.add(new FonteEventosFairPlay(inscricoes));
        fontes.add((a, consulta) -> List.of(new RegistroHistoricoImportado(historico(99L, "Iniciante", 4))));

        HistoricoDoAtleta historico = new HistoricoCompeticaoFactory(fontes).paraPainel(atleta);

        assertThat(historico.registros()).extracting(RegistroCompeticao::id).containsExactly(100L, 101L, 99L);
    }
}
