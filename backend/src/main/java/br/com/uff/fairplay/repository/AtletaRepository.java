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

    Optional<Atleta> findByEmailAndPerfil(String email, String perfil);
    Optional<Atleta> findByCpfAndPerfil(String cpf, String perfil);

    List<Atleta> findByNomeCompletoContainingIgnoreCase(String termo);

    List<Atleta> findByNomeCompletoContainingIgnoreCaseAndPerfil(String termo, String perfil);

    // Consulta unificada: busca atletas reais cadastrados e atletas não vinculados do histórico
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
        WHERE (:termo IS NULL OR :termo = '' 
           OR LOWER(a.nome_completo) LIKE LOWER(CONCAT('%', :termo, '%'))
           OR LOWER(a.cpf) LIKE LOWER(CONCAT('%', :termo, '%')))

        UNION ALL

        SELECT 
            (MIN(h.id) + 100000) AS id, 
            h.nome_atleta AS nomeCompleto, 
            NULL AS cpf, 
            'MASCULINO' AS genero, 
            'Niterói' AS cidade, 
            'RJ' AS estado, 
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
    List<AtletaBuscaDTO> buscarPorNomeOuCpf(@Param("termo") String termo, @Param("termoLimpo") String termoLimpo);
}