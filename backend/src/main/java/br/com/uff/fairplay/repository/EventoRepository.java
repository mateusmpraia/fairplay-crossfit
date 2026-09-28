package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.model.Evento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventoRepository extends JpaRepository<Evento, Long> {
    List<Evento> findByOrganizadorIdOrderByDataInicioDesc(Long organizadorId);
}