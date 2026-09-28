package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.SugestaoAtletaDTO;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atletas/historico")
public class HistoricoAtletaController {

    private final HistoricoAtletaRepository historicoAtletaRepository;

    public HistoricoAtletaController(HistoricoAtletaRepository historicoAtletaRepository) {
        this.historicoAtletaRepository = historicoAtletaRepository;
    }

    /** Sugere perfis do histórico importado com nome parecido, para o atleta vincular no cadastro. */
    @GetMapping("/sugestoes")
    public ResponseEntity<List<SugestaoAtletaDTO>> sugerirAtletas(@RequestParam String nome) {
        if (nome.trim().length() < 3) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(historicoAtletaRepository.buscarSugestoesPorNome(nome.trim()));
    }
}
