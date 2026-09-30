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

    /**
     * Histórico do atleta para a auditoria de elegibilidade: os registros vinculados a ele e, como reforço,
     * os que têm exatamente o mesmo nome — menos os que ele declarou não serem dele e os que já estão
     * vinculados à conta de outra pessoa (homônimos que reivindicaram os próprios resultados).
     */
    @Query(value = """
        SELECT h.*
        FROM historico_atletas h
        WHERE EXISTS (SELECT 1 FROM atletas_historico_vinculos v WHERE v.historico_id = h.id AND v.atleta_id = :atletaId)
           OR (LOWER(TRIM(h.nome_atleta)) = LOWER(TRIM(:nomeAtleta))
               AND NOT EXISTS (SELECT 1 FROM atletas_historico_recusas r WHERE r.historico_id = h.id AND r.atleta_id = :atletaId)
               AND NOT EXISTS (
                   SELECT 1 FROM atletas_historico_vinculos v2
                   JOIN atletas a ON a.id = v2.atleta_id
                   WHERE v2.historico_id = h.id AND v2.atleta_id <> :atletaId AND a.perfil = 'ATLETA'))
        ORDER BY h.id DESC
    """, nativeQuery = true)
    List<HistoricoAtleta> buscarHistoricoParaAuditoria(@Param("atletaId") Long atletaId, @Param("nomeAtleta") String nomeAtleta);

    /** Histórico exibido no painel do atleta: apenas os registros vinculados a ele. */
    @Query("""
        SELECT v.historico
        FROM AtletaHistoricoVinculo v
        WHERE v.atletaId = :atletaId
        ORDER BY v.historico.id DESC
    """)
    List<HistoricoAtleta> buscarHistoricoPorAtletaId(@Param("atletaId") Long atletaId);

    /** Atletas vinculados a um registro do histórico (normalmente um só). */
    @Query("SELECT v.atletaId FROM AtletaHistoricoVinculo v WHERE v.historico.id = :historicoId ORDER BY v.atletaId")
    List<Long> buscarAtletasVinculados(@Param("historicoId") Long historicoId);

    /**
     * Até 5 nomes do histórico que contêm o primeiro e o último nome informados (a collation já ignora
     * acentos e maiúsculas), com os boxes e o total de competições de cada um. O nome idêntico ao digitado vem antes.
     */
    @Query(value = """
        SELECT
            nome_atleta AS nomeAtleta,
            COALESCE(
                GROUP_CONCAT(DISTINCT NULLIF(box_origem, 'N/D') ORDER BY id DESC SEPARATOR ' / '),
                'N/D'
            ) AS boxOrigem,
            COUNT(id) AS totalCompeticoes
        FROM historico_atletas
        WHERE nome_atleta LIKE CONCAT('%', :primeiroNome, '%')
          AND nome_atleta LIKE CONCAT('%', :ultimoNome, '%')
        GROUP BY nome_atleta
        ORDER BY (nome_atleta = :nomeCompleto) DESC, COUNT(id) DESC
        LIMIT 5
    """, nativeQuery = true)
    List<SugestaoAtletaDTO> buscarSugestoesPorNome(@Param("primeiroNome") String primeiroNome,
                                                   @Param("ultimoNome") String ultimoNome,
                                                   @Param("nomeCompleto") String nomeCompleto);

    /** Uma linha de {@link #buscarCompeticoesPorNome}. */
    interface CompeticaoDoNome {
        Long getId();
        String getNomeAtleta();
        String getNomeCompeticao();
        String getCategoria();
        Integer getColocacao();
        String getBoxOrigem();
        /** Conta de atleta (perfil ATLETA) já vinculada à competição, ou nulo. */
        Long getAtletaVinculadoId();
    }

    /** Competições registradas com exatamente este nome no histórico, com a conta de atleta vinculada a cada uma. */
    @Query(value = """
        SELECT
            h.id AS id,
            h.nome_atleta AS nomeAtleta,
            h.nome_competicao AS nomeCompeticao,
            h.categoria_padronizada AS categoria,
            h.colocacao AS colocacao,
            h.box_origem AS boxOrigem,
            (SELECT MIN(a.id) FROM atletas_historico_vinculos v JOIN atletas a ON a.id = v.atleta_id
             WHERE v.historico_id = h.id AND a.perfil = 'ATLETA') AS atletaVinculadoId
        FROM historico_atletas h
        WHERE h.nome_atleta = :nome
        ORDER BY h.id DESC
    """, nativeQuery = true)
    List<CompeticaoDoNome> buscarCompeticoesPorNome(@Param("nome") String nome);

    /** Uma linha de {@link #buscarVinculosDoAtleta}. */
    interface VinculoDoAtleta {
        Long getHistoricoId();
        String getNomeAtleta();
        String getNomeCompeticao();
        String getCategoria();
        Integer getColocacao();
        String getBoxOrigem();
        /** Minutos desde que o vínculo foi feito (calculado no banco, para não depender de fuso horário). */
        Long getMinutosDesdeVinculo();
        /** Situação do pedido de desvínculo mais recente, ou nulo. */
        String getStatusPedido();
    }

    /** Competições vinculadas ao atleta, agrupáveis pelo nome com que aparecem no histórico. */
    @Query(value = """
        SELECT
            h.id AS historicoId,
            h.nome_atleta AS nomeAtleta,
            h.nome_competicao AS nomeCompeticao,
            h.categoria_padronizada AS categoria,
            h.colocacao AS colocacao,
            h.box_origem AS boxOrigem,
            TIMESTAMPDIFF(MINUTE, v.data_vinculo, NOW()) AS minutosDesdeVinculo,
            (SELECT p.status FROM pedidos_desvinculo_historico p
             WHERE p.atleta_id = v.atleta_id AND p.historico_id = h.id
             ORDER BY p.id DESC LIMIT 1) AS statusPedido
        FROM atletas_historico_vinculos v
        JOIN historico_atletas h ON h.id = v.historico_id
        WHERE v.atleta_id = :atletaId
        ORDER BY h.nome_atleta, h.id DESC
    """, nativeQuery = true)
    List<VinculoDoAtleta> buscarVinculosDoAtleta(@Param("atletaId") Long atletaId);

    /** Uma linha de {@link #buscarContasVinculadas}. */
    interface ContaVinculada {
        Long getHistoricoId();
        Long getAtletaId();
        String getPerfil();
    }

    /** Contas (de qualquer perfil) já vinculadas às competições informadas. */
    @Query(value = """
        SELECT v.historico_id AS historicoId, a.id AS atletaId, a.perfil AS perfil
        FROM atletas_historico_vinculos v
        JOIN atletas a ON a.id = v.atleta_id
        WHERE v.historico_id IN (:historicoIds)
    """, nativeQuery = true)
    List<ContaVinculada> buscarContasVinculadas(@Param("historicoIds") List<Long> historicoIds);

    /** Vincula ao atleta as competições informadas (as que já estavam vinculadas a ele são ignoradas). */
    @Modifying
    @Transactional
    @Query(value = """
        INSERT IGNORE INTO atletas_historico_vinculos (atleta_id, historico_id)
        SELECT :atletaId, h.id FROM historico_atletas h WHERE h.id IN (:historicoIds)
    """, nativeQuery = true)
    int vincularCompeticoes(@Param("atletaId") Long atletaId, @Param("historicoIds") List<Long> historicoIds);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM atletas_historico_vinculos WHERE atleta_id = :atletaId AND historico_id = :historicoId", nativeQuery = true)
    int desvincular(@Param("atletaId") Long atletaId, @Param("historicoId") Long historicoId);

    /** Registra que o atleta declarou que estas competições não são dele (as vinculadas a ele ficam de fora). */
    @Modifying
    @Transactional
    @Query(value = """
        INSERT IGNORE INTO atletas_historico_recusas (atleta_id, historico_id)
        SELECT :atletaId, h.id FROM historico_atletas h
        WHERE h.id IN (:historicoIds)
          AND NOT EXISTS (SELECT 1 FROM atletas_historico_vinculos v WHERE v.atleta_id = :atletaId AND v.historico_id = h.id)
    """, nativeQuery = true)
    int registrarRecusas(@Param("atletaId") Long atletaId, @Param("historicoIds") List<Long> historicoIds);

    /** Desfaz declarações de "não é minha" (usado quando o atleta muda de ideia e vincula a competição). */
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM atletas_historico_recusas WHERE atleta_id = :atletaId AND historico_id IN (:historicoIds)", nativeQuery = true)
    int removerRecusas(@Param("atletaId") Long atletaId, @Param("historicoIds") List<Long> historicoIds);

    /** Vincula ao atleta todos os registros do histórico com o nome informado. */
    @Modifying
    @Transactional
    @Query(value = """
        INSERT IGNORE INTO atletas_historico_vinculos (atleta_id, historico_id)
        SELECT :atletaId, h.id
        FROM historico_atletas h
        WHERE LOWER(TRIM(h.nome_atleta)) = LOWER(TRIM(:nomeAtleta))
    """, nativeQuery = true)
    int vincularHistoricoAoAtleta(@Param("atletaId") Long atletaId, @Param("nomeAtleta") String nomeAtleta);
}
