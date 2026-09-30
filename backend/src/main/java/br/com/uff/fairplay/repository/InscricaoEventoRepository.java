package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.dto.AlteracaoAuditoriaDTO;
import br.com.uff.fairplay.dto.MinhaInscricaoDTO;
import br.com.uff.fairplay.dto.ResultadoEventoDTO;
import br.com.uff.fairplay.model.InscricaoEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface InscricaoEventoRepository extends JpaRepository<InscricaoEvento, Long> {

    List<InscricaoEvento> findByCategoriaEventoId(Long categoriaEventoId);

    boolean existsByCategoriaEventoIdAndAtletaId(Long categoriaEventoId, Long atletaId);

    List<InscricaoEvento> findByAtletaId(Long atletaId);

    /**
     * Inscrições do atleta ainda em aberto: sem colocação lançada e em eventos que não terminaram
     * (data de término, ou de início se não houver término, igual ou posterior a {@code hoje}).
     */
    @Query("""
        SELECT i FROM InscricaoEvento i
        JOIN i.categoriaEvento c
        JOIN c.evento e
        WHERE i.atleta.id = :atletaId
          AND i.colocacao IS NULL
          AND COALESCE(e.dataFim, e.dataInicio) >= :hoje
    """)
    List<InscricaoEvento> buscarEmAbertoDoAtleta(@Param("atletaId") Long atletaId, @Param("hoje") LocalDate hoje);

    /** Atletas com colocação lançada numa categoria (o histórico deles muda se o resultado for apagado). */
    @Query("SELECT DISTINCT i.atleta.id FROM InscricaoEvento i WHERE i.categoriaEvento.id IN :categoriaIds AND i.colocacao IS NOT NULL")
    List<Long> buscarAtletasComResultado(@Param("categoriaIds") Collection<Long> categoriaIds);

    /** Quantas inscrições mudaram de status sozinhas e o organizador ainda não viu, por evento e categoria. */
    @Query("""
        SELECT new br.com.uff.fairplay.dto.AlteracaoAuditoriaDTO(e.id, c.id, COUNT(i))
        FROM InscricaoEvento i
        JOIN i.categoriaEvento c
        JOIN c.evento e
        WHERE e.organizadorId = :organizadorId AND i.auditoriaAlteradaEm IS NOT NULL
        GROUP BY e.id, c.id
    """)
    List<AlteracaoAuditoriaDTO> contarAlteracoesDoOrganizador(@Param("organizadorId") Long organizadorId);

    /** Colocações já lançadas do atleta em eventos do FairPlay, do evento mais recente para o mais antigo. */
    @Query("""
        SELECT new br.com.uff.fairplay.dto.ResultadoEventoDTO(i.id, e.id, e.nome, e.dataInicio, c.nivel, i.colocacao)
        FROM InscricaoEvento i
        JOIN i.categoriaEvento c
        JOIN c.evento e
        WHERE i.atleta.id = :atletaId AND i.colocacao IS NOT NULL
        ORDER BY e.dataInicio DESC, i.id DESC
    """)
    List<ResultadoEventoDTO> buscarResultadosDoAtleta(@Param("atletaId") Long atletaId);

    /** Todas as inscrições do atleta, do evento mais recente para o mais antigo. */
    @Query("""
        SELECT new br.com.uff.fairplay.dto.MinhaInscricaoDTO(
            i.id, e.nome, e.dataInicio, e.dataFim, e.localizacao, c.formato, c.genero, c.nivel,
            i.statusElegibilidade, i.categoriaRecomendada, i.motivoIrregularidade, i.colocacao)
        FROM InscricaoEvento i
        JOIN i.categoriaEvento c
        JOIN c.evento e
        WHERE i.atleta.id = :atletaId
        ORDER BY e.dataInicio DESC, i.id DESC
    """)
    List<MinhaInscricaoDTO> buscarInscricoesDoAtleta(@Param("atletaId") Long atletaId);
}
