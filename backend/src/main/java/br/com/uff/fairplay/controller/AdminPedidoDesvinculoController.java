package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.PedidoDesvinculoDTO;
import br.com.uff.fairplay.repository.PedidoDesvinculoRepository;
import br.com.uff.fairplay.service.historico.VinculoHistoricoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Pedidos de desvínculo do histórico enviados pelos atletas depois do prazo livre; o administrador decide. */
@RestController
@RequestMapping("/api/admin/pedidos-desvinculo")
public class AdminPedidoDesvinculoController {

    private final PedidoDesvinculoRepository pedidoDesvinculoRepository;
    private final VinculoHistoricoService vinculoHistoricoService;

    public AdminPedidoDesvinculoController(PedidoDesvinculoRepository pedidoDesvinculoRepository,
                                           VinculoHistoricoService vinculoHistoricoService) {
        this.pedidoDesvinculoRepository = pedidoDesvinculoRepository;
        this.vinculoHistoricoService = vinculoHistoricoService;
    }

    @GetMapping
    public ResponseEntity<List<PedidoDesvinculoDTO>> pendentes() {
        return ResponseEntity.ok(pedidoDesvinculoRepository.buscarPendentes());
    }

    @PostMapping("/{id}/aprovar")
    public ResponseEntity<String> aprovar(@PathVariable Long id) {
        vinculoHistoricoService.decidirPedido(id, true);
        return ResponseEntity.ok("Pedido aprovado: o vínculo foi desfeito.");
    }

    @PostMapping("/{id}/recusar")
    public ResponseEntity<String> recusar(@PathVariable Long id) {
        vinculoHistoricoService.decidirPedido(id, false);
        return ResponseEntity.ok("Pedido recusado: o vínculo foi mantido.");
    }
}
