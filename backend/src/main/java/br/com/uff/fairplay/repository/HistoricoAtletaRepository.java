package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.dto.SugestaoAtletaDTO;
import br.com.uff.fairplay.model.HistoricoAtleta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface HistoricoAtletaRepository extends JpaRepository<HistoricoAtleta, Long> {

    // 1. Busca o histórico associado ao atleta através da tabela de vínculos ou diretamente pelo nome do atleta
    @Query("""
        SELECT DISTINCT h 
        FROM HistoricoAtleta h 
        LEFT JOIN AtletaHistoricoVinculo v ON v.historico.id = h.id 
        WHERE (v.atletaId = :atletaId) 
           OR (h.atletaId = :atletaId) 
           OR (LOWER(TRIM(h.nomeAtleta)) = LOWER(TRIM(:nomeAtleta)))
        ORDER BY h.id DESC
    """)
    List<HistoricoAtleta> buscarHistoricoPorAtletaIdOuNome(@Param("atletaId") Long atletaId, @Param("nomeAtleta") String nomeAtleta);

    // Mantido para compatibilidade se usado em outros locais do sistema
    @Query("""
        SELECT v.historico 
        FROM AtletaHistoricoVinculo v 
        WHERE v.atletaId = :atletaId 
        ORDER BY v.historico.id DESC
    """)
    List<HistoricoAtleta> buscarHistoricoPorAtletaId(@Param("atletaId") Long atletaId);

    // 2. Busca sugestões sem filtrar por atleta_id
    @Query(value = """
        SELECT 
            nome_atleta AS nomeAtleta,
            COALESCE(
                GROUP_CONCAT(DISTINCT NULLIF(box_origem, 'N/D') ORDER BY id DESC SEPARATOR ' / '),
                'N/D'
            ) AS boxOrigem,
            COUNT(id) AS totalCompeticoes
        FROM fairplay_tcc.historico_atletas
        WHERE LOWER(nome_atleta) LIKE LOWER(CONCAT('%', :termo, '%'))
        GROUP BY nome_atleta
        ORDER BY COUNT(id) DESC
        LIMIT 5
    """, nativeQuery = true)
    List<SugestaoAtletaDTO> buscarSugestoesDesvinculadas(@Param("termo") String termo);

    // 3. Insere os vínculos na nova tabela para todos os registros que batem com o nome
    @Modifying
    @Transactional
    @Query(value = """
        INSERT IGNORE INTO fairplay_tcc.atletas_historico_vinculos (atleta_id, historico_id)
        SELECT :atletaId, h.id
        FROM fairplay_tcc.historico_atletas h
        WHERE LOWER(TRIM(h.nome_atleta)) = LOWER(TRIM(:nomeAtleta))
    """, nativeQuery = true)
    int vincularHistoricoAoAtleta(
        @Param("atletaId") Long atletaId, 
        @Param("nomeAtleta") String nomeAtleta
    );

    // 4. Remove vínculos ao excluir um usuário
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM fairplay_tcc.atletas_historico_vinculos WHERE atleta_id = :atletaId", nativeQuery = true)
    int desvincularPorAtletaId(@Param("atletaId") Long atletaId);
}