package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.CompeticaoHistoricoDTO;
import br.com.uff.fairplay.dto.SugestaoAtletaDTO;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.security.UsuarioLogado;
import br.com.uff.fairplay.service.historico.BuscaNomeHistorico;
import br.com.uff.fairplay.service.historico.VinculoHistoricoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Consultas ao histórico importado usadas para o atleta encontrar e vincular os próprios resultados (também no cadastro, sem login). */
@RestController
@RequestMapping("/api/atletas/historico")
public class HistoricoAtletaController {

    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final VinculoHistoricoService vinculoHistoricoService;

    public HistoricoAtletaController(HistoricoAtletaRepository historicoAtletaRepository,
                                     VinculoHistoricoService vinculoHistoricoService) {
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.vinculoHistoricoService = vinculoHistoricoService;
    }

    /** Sugere perfis do histórico importado com nome parecido, para o atleta vincular no cadastro. */
    @GetMapping("/sugestoes")
    public ResponseEntity<List<SugestaoAtletaDTO>> sugerirAtletas(@RequestParam String nome) {
        String nomeLimpo = nome.trim().replaceAll("\\s+", " ");
        if (nomeLimpo.length() < 3) {
            return ResponseEntity.ok(List.of());
        }
        BuscaNomeHistorico busca = BuscaNomeHistorico.doNome(nomeLimpo);
        return ResponseEntity.ok(historicoAtletaRepository.buscarSugestoesPorNome(
                busca.primeiroNome(), busca.ultimoNome(), nomeLimpo));
    }

    /**
     * Competições registradas com exatamente este nome, para o atleta marcar quais são dele.
     * Com login de atleta, as que já são dele vêm como MINHA.
     */
    @GetMapping("/competicoes")
    public ResponseEntity<List<CompeticaoHistoricoDTO>> competicoesDoNome(@RequestParam String nome,
                                                                          @AuthenticationPrincipal UsuarioLogado usuario) {
        if (nome.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(vinculoHistoricoService.competicoesDoNome(nome, usuario != null ? usuario.id() : null));
    }
}
