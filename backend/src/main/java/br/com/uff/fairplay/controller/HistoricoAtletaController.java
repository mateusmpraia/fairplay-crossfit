package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.SugestaoAtletaDTO;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atletas/historico")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class HistoricoAtletaController {

    private final HistoricoAtletaRepository historicoAtletaRepository;

    public HistoricoAtletaController(HistoricoAtletaRepository historicoAtletaRepository) {
        this.historicoAtletaRepository = historicoAtletaRepository;
    }

    @GetMapping("/sugestoes")
    public ResponseEntity<List<SugestaoAtletaDTO>> sugerirAtletas(@RequestParam(name = "nome") String nome) {
        if (nome == null || nome.trim().length() < 3) {
            return ResponseEntity.ok(List.of());
        }

        List<SugestaoAtletaDTO> sugestoes = historicoAtletaRepository.buscarSugestoesDesvinculadas(nome.trim());

        return ResponseEntity.ok(sugestoes);
    }
}