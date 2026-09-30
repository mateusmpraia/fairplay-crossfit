package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.VinculoHistoricoDTO;
import br.com.uff.fairplay.dto.VincularHistoricoDTO;
import br.com.uff.fairplay.exception.AcessoNegadoException;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.security.UsuarioLogado;
import br.com.uff.fairplay.service.historico.VinculoHistoricoService;
import br.com.uff.fairplay.service.historico.VinculoHistoricoService.ResultadoVinculo;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Painel do atleta: vincular e desvincular competições do histórico importado. */
@RestController
@RequestMapping("/api/atletas/{id}/vinculos")
public class VinculoHistoricoController {

    private final VinculoHistoricoService vinculoHistoricoService;
    private final AtletaRepository atletaRepository;

    public VinculoHistoricoController(VinculoHistoricoService vinculoHistoricoService, AtletaRepository atletaRepository) {
        this.vinculoHistoricoService = vinculoHistoricoService;
        this.atletaRepository = atletaRepository;
    }

    @GetMapping
    public ResponseEntity<List<VinculoHistoricoDTO>> listar(@PathVariable Long id, @AuthenticationPrincipal UsuarioLogado usuario) {
        exigirProprioAtleta(id, usuario);
        return ResponseEntity.ok(vinculoHistoricoService.vinculosDoAtleta(id));
    }

    @PostMapping
    public ResponseEntity<ResultadoVinculo> vincular(@PathVariable Long id, @RequestBody VincularHistoricoDTO dto,
                                                     @AuthenticationPrincipal UsuarioLogado usuario) {
        exigirProprioAtleta(id, usuario);
        Atleta atleta = atletaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado."));
        return ResponseEntity.ok(vinculoHistoricoService.vincular(atleta, dto.historicoIds(), dto.recusadosIds()));
    }

    /** Desfaz o vínculo dentro do prazo livre; depois dele, responde com erro pedindo o envio de um pedido. */
    @DeleteMapping("/{historicoId}")
    public ResponseEntity<String> desvincular(@PathVariable Long id, @PathVariable Long historicoId,
                                              @AuthenticationPrincipal UsuarioLogado usuario) {
        exigirProprioAtleta(id, usuario);
        vinculoHistoricoService.desvincular(id, historicoId);
        return ResponseEntity.ok("Vínculo desfeito.");
    }

    @PostMapping("/{historicoId}/pedido-desvinculo")
    public ResponseEntity<String> pedirDesvinculo(@PathVariable Long id, @PathVariable Long historicoId,
                                                  @RequestBody Map<String, String> corpo,
                                                  @AuthenticationPrincipal UsuarioLogado usuario) {
        exigirProprioAtleta(id, usuario);
        vinculoHistoricoService.pedirDesvinculo(id, historicoId, corpo.get("motivo"));
        return ResponseEntity.ok("Pedido enviado ao administrador.");
    }

    private static void exigirProprioAtleta(Long id, UsuarioLogado usuario) {
        if (!id.equals(usuario.id())) {
            throw new AcessoNegadoException("Você só pode acessar os seus próprios dados.");
        }
    }
}
