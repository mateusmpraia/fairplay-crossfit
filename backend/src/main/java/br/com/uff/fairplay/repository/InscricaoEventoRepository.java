package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.model.InscricaoEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InscricaoEventoRepository extends JpaRepository<InscricaoEvento, Long> {
    List<InscricaoEvento> findByCategoriaEventoId(Long categoriaEventoId);
    boolean existsByCategoriaEventoIdAndAtletaId(Long categoriaEventoId, Long atletaId);
}