package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.dto.MinhaInscricaoDTO;
import br.com.uff.fairplay.dto.ResultadoEventoDTO;
import br.com.uff.fairplay.model.InscricaoEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InscricaoEventoRepository extends JpaRepository<InscricaoEvento, Long> {

    List<InscricaoEvento> findByCategoriaEventoId(Long categoriaEventoId);

    boolean existsByCategoriaEventoIdAndAtletaId(Long categoriaEventoId, Long atletaId);

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
