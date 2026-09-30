package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.dto.PedidoDesvinculoDTO;
import br.com.uff.fairplay.model.PedidoDesvinculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PedidoDesvinculoRepository extends JpaRepository<PedidoDesvinculo, Long> {

    boolean existsByAtletaIdAndHistoricoIdAndStatus(Long atletaId, Long historicoId, String status);

    /** Pedidos aguardando decisão do administrador, do mais antigo para o mais novo. */
    @Query("""
        SELECT new br.com.uff.fairplay.dto.PedidoDesvinculoDTO(
            p.id, a.id, a.nomeCompleto, a.email, h.nomeAtleta, h.nomeCompeticao, h.categoriaPadronizada,
            h.colocacao, h.boxOrigem, p.motivo, p.dataPedido)
        FROM PedidoDesvinculo p
        JOIN p.historico h, Atleta a
        WHERE a.id = p.atletaId AND p.status = 'PENDENTE'
        ORDER BY p.dataPedido, p.id
    """)
    List<PedidoDesvinculoDTO> buscarPendentes();
}
