package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.model.ResultadoCampeonato;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ResultadoCampeonatoRepository extends JpaRepository<ResultadoCampeonato, Long> {

    List<ResultadoCampeonato> findByAtletaIdOrderByDataCampeonatoDesc(Long atletaId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ResultadoCampeonato r WHERE r.atleta.id = :atletaId")
    void deleteByAtletaId(@Param("atletaId") Long atletaId);
}