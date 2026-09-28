package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.security.SessaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessao")
public class SessaoController {

    private final SessaoService sessaoService;

    public SessaoController(SessaoService sessaoService) {
        this.sessaoService = sessaoService;
    }

    /** Encerra a sessão do token enviado (logout). */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authorization) {
        sessaoService.encerrar(authorization.substring("Bearer ".length()).trim());
        return ResponseEntity.noContent().build();
    }
}
