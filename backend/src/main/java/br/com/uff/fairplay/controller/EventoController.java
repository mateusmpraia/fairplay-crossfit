package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.AtletaBuscaDTO;
import br.com.uff.fairplay.dto.CriarCategoriaDTO;
import br.com.uff.fairplay.dto.CriarEventoDTO;
import br.com.uff.fairplay.dto.InscreverAtletaDTO;
import br.com.uff.fairplay.model.CategoriaEvento;
import br.com.uff.fairplay.model.Evento;
import br.com.uff.fairplay.model.InscricaoEvento;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import br.com.uff.fairplay.service.EventoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/eventos")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class EventoController {

    private final EventoService eventoService;
    private final AtletaRepository atletaRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;

    public EventoController(EventoService eventoService, 
                            AtletaRepository atletaRepository,
                            InscricaoEventoRepository inscricaoEventoRepository) {
        this.eventoService = eventoService;
        this.atletaRepository = atletaRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
    }

    @PostMapping
    public ResponseEntity<Evento> criarEvento(@RequestBody CriarEventoDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.criarEvento(dto));
    }

    @GetMapping("/organizador/{organizadorId}")
    public ResponseEntity<List<Evento>> listarPorOrganizador(@PathVariable Long organizadorId) {
        return ResponseEntity.ok(eventoService.listarEventosPorOrganizador(organizadorId));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> excluirEvento(@PathVariable Long id) {
        eventoService.excluirEvento(id);
        return ResponseEntity.ok("Evento excluído com sucesso.");
    }

    public record AtualizarRegrasDTO(boolean regraCampeaoSobe, boolean regraTresPodiosSobe, boolean regraTresParticipacoesSobe) {}

    @PutMapping("/{id}/regras")
    @Transactional
    public ResponseEntity<Evento> atualizarRegras(@PathVariable Long id, @RequestBody AtualizarRegrasDTO dto) {
        Evento atualizado = eventoService.atualizarRegrasEReauditar(
            id, 
            dto.regraCampeaoSobe(), 
            dto.regraTresPodiosSobe(), 
            dto.regraTresParticipacoesSobe()
        );
        return ResponseEntity.ok(atualizado);
    }

    @PostMapping("/{id}/categorias")
    @Transactional
    public ResponseEntity<CategoriaEvento> adicionarCategoria(@PathVariable Long id, @RequestBody CriarCategoriaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.adicionarCategoria(id, dto));
    }

    @DeleteMapping("/categorias/{categoriaId}")
    @Transactional
    public ResponseEntity<?> excluirCategoria(@PathVariable Long categoriaId) {
        eventoService.excluirCategoria(categoriaId);
        return ResponseEntity.ok("Categoria excluída com sucesso.");
    }

    @PostMapping("/inscricoes")
    public ResponseEntity<InscricaoEvento> inscreverAtleta(@RequestBody InscreverAtletaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.inscreverAtleta(dto));
    }

    @GetMapping("/categorias/{categoriaId}/inscricoes")
    public ResponseEntity<List<InscricaoEvento>> listarInscricoesPorCategoria(@PathVariable Long categoriaId) {
        return ResponseEntity.ok(inscricaoEventoRepository.findByCategoriaEventoId(categoriaId));
    }

    @DeleteMapping("/inscricoes/{inscricaoId}")
    @Transactional
    public ResponseEntity<?> removerInscricao(@PathVariable Long inscricaoId) {
        if (!inscricaoEventoRepository.existsById(inscricaoId)) {
            return ResponseEntity.notFound().build();
        }
        inscricaoEventoRepository.deleteById(inscricaoId);
        return ResponseEntity.ok("Atleta removido da categoria com sucesso.");
    }

    // Busca atletas cadastrados por nome ou CPF (apenas uma declaração)
    @GetMapping("/atletas/buscar")
    public ResponseEntity<List<AtletaBuscaDTO>> buscarAtletasParaInscricao(@RequestParam(value = "termo", required = false) String termo) {
        String termoFormatado = (termo != null) ? termo.trim() : "";
        String apenasDigitos = termoFormatado.replaceAll("\\D", "");
        
        return ResponseEntity.ok(atletaRepository.buscarPorNomeOuCpf(termoFormatado, apenasDigitos));
    }
}