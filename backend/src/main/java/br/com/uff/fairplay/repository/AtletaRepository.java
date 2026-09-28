package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.dto.AtletaBuscaDTO;
import br.com.uff.fairplay.model.Atleta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AtletaRepository extends JpaRepository<Atleta, Long> {

    boolean existsByCpfAndPerfil(String cpf, String perfil);
    boolean existsByEmailAndPerfil(String email, String perfil);
    boolean existsByCelularAndPerfil(String celular, String perfil);

    Optional<Atleta> findByEmailIgnoreCaseAndPerfil(String email, String perfil);
    Optional<Atleta> findByCpfAndPerfil(String cpf, String perfil);

    /**
     * Atleta pendente (perfil HISTORICO) já criado para os registros do histórico com este nome —
     * é o registro que vira a conta da pessoa quando ela se cadastra e vincula esse histórico.
     */
    @Query(value = """
        SELECT a.* FROM fairplay_tcc.atletas a
        WHERE a.perfil = 'HISTORICO'
          AND EXISTS (
              SELECT 1 FROM fairplay_tcc.historico_atletas h
              WHERE h.atleta_id = a.id AND LOWER(TRIM(h.nome_atleta)) = LOWER(TRIM(:nome))
          )
        LIMIT 1
    """, nativeQuery = true)
    Optional<Atleta> buscarPendenteDoHistorico(@Param("nome") String nome);

    /** Atletas (perfil ATLETA) cujo CPF, sem pontuação, está na lista informada (só dígitos). */
    @Query(value = """
        SELECT * FROM fairplay_tcc.atletas a
        WHERE a.perfil = 'ATLETA'
          AND REPLACE(REPLACE(a.cpf, '.', ''), '-', '') IN (:cpfsDigitos)
    """, nativeQuery = true)
    List<Atleta> buscarAtletasPorCpfs(@Param("cpfsDigitos") List<String> cpfsDigitos);

    /**
     * Busca unificada para inscrição em eventos:
     * <ol>
     *   <li>atletas cadastrados (organizadores ficam de fora) cujo nome ou CPF contém o termo. {@code cpfDigitos} (só os números do termo,
     *       ou vazio se o termo não parecer um CPF) permite achar o CPF digitado sem pontuação;</li>
     *   <li>atletas do histórico importado que ainda não têm cadastro, agrupados por nome.
     *       Esses recebem id = menor id do histórico + 100000 (ver {@code EventoService#DESLOCAMENTO_ID_HISTORICO})
     *       e perfil 'HISTORICO'. Gênero, cidade e UF vêm nulos, pois o histórico não tem esses dados.</li>
     * </ol>
     */
    @Query(value = """
        SELECT
            a.id AS id,
            a.nome_completo AS nomeCompleto,
            a.cpf AS cpf,
            a.genero AS genero,
            a.cidade AS cidade,
            a.estado AS estado,
            a.nome_box AS nomeBox,
            a.perfil AS perfil,
            (SELECT COUNT(h.id) FROM fairplay_tcc.historico_atletas h WHERE LOWER(TRIM(h.nome_atleta)) = LOWER(TRIM(a.nome_completo))) AS totalHistoricos
        FROM fairplay_tcc.atletas a
        WHERE a.perfil <> 'ORGANIZADOR'
          AND (:termo IS NULL OR :termo = ''
           OR LOWER(a.nome_completo) LIKE LOWER(CONCAT('%', :termo, '%'))
           OR LOWER(a.cpf) LIKE LOWER(CONCAT('%', :termo, '%'))
           OR (:cpfDigitos <> '' AND REPLACE(REPLACE(a.cpf, '.', ''), '-', '') LIKE CONCAT('%', :cpfDigitos, '%')))

        UNION ALL

        SELECT
            (MIN(h.id) + 100000) AS id,
            h.nome_atleta AS nomeCompleto,
            NULL AS cpf,
            NULL AS genero,
            NULL AS cidade,
            NULL AS estado,
            GROUP_CONCAT(DISTINCT COALESCE(h.box_origem, 'Sem Box') SEPARATOR ' / ') AS nomeBox,
            'HISTORICO' AS perfil,
            COUNT(h.id) AS totalHistoricos
        FROM fairplay_tcc.historico_atletas h
        WHERE h.atleta_id IS NULL
          AND (:termo IS NULL OR :termo = ''
           OR LOWER(h.nome_atleta) LIKE LOWER(CONCAT('%', :termo, '%'))
           OR LOWER(h.box_origem) LIKE LOWER(CONCAT('%', :termo, '%')))
          AND NOT EXISTS (
              SELECT 1 FROM fairplay_tcc.atletas a2
              WHERE LOWER(TRIM(a2.nome_completo)) = LOWER(TRIM(h.nome_atleta))
          )
        GROUP BY LOWER(h.nome_atleta)
        LIMIT 20
    """, nativeQuery = true)
    List<AtletaBuscaDTO> buscarPorNomeOuCpf(@Param("termo") String termo, @Param("cpfDigitos") String cpfDigitos);
}
