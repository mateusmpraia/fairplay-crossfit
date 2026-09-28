package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.AtletaBuscaDTO;
import br.com.uff.fairplay.dto.AtualizarRegrasDTO;
import br.com.uff.fairplay.dto.CriarCategoriaDTO;
import br.com.uff.fairplay.dto.CriarEventoDTO;
import br.com.uff.fairplay.dto.InscreverAtletaDTO;
import br.com.uff.fairplay.dto.InscricaoLoteDTO;
import br.com.uff.fairplay.dto.LancarResultadosDTO;
import br.com.uff.fairplay.dto.ResultadoInscricaoLoteDTO;
import br.com.uff.fairplay.model.CategoriaEvento;
import br.com.uff.fairplay.model.Evento;
import br.com.uff.fairplay.model.InscricaoEvento;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.security.UsuarioLogado;
import br.com.uff.fairplay.service.EventoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Gestão de eventos pelo organizador logado. Cada organizador só enxerga e altera os próprios eventos. */
@RestController
@RequestMapping("/api/eventos")
public class EventoController {

    private final EventoService eventoService;
    private final AtletaRepository atletaRepository;

    public EventoController(EventoService eventoService, AtletaRepository atletaRepository) {
        this.eventoService = eventoService;
        this.atletaRepository = atletaRepository;
    }

    // ---------------------------------------------------------------- Eventos

    @GetMapping
    public ResponseEntity<List<Evento>> listarMeusEventos(@AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.ok(eventoService.listarEventosDoOrganizador(organizador.id()));
    }

    @PostMapping
    public ResponseEntity<Evento> criarEvento(@RequestBody CriarEventoDTO dto,
                                              @AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.criarEvento(dto, organizador.id()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> excluirEvento(@PathVariable Long id,
                                                @AuthenticationPrincipal UsuarioLogado organizador) {
        eventoService.excluirEvento(id, organizador.id());
        return ResponseEntity.ok("Evento excluído com sucesso.");
    }

    @PutMapping("/{id}/regras")
    public ResponseEntity<Evento> atualizarRegras(@PathVariable Long id, @RequestBody AtualizarRegrasDTO dto,
                                                  @AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.ok(eventoService.atualizarRegrasEReauditar(id, dto, organizador.id()));
    }

    // ---------------------------------------------------------------- Categorias

    @PostMapping("/{id}/categorias")
    public ResponseEntity<CategoriaEvento> adicionarCategoria(@PathVariable Long id, @RequestBody CriarCategoriaDTO dto,
                                                              @AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.adicionarCategoria(id, dto, organizador.id()));
    }

    @DeleteMapping("/categorias/{categoriaId}")
    public ResponseEntity<String> excluirCategoria(@PathVariable Long categoriaId,
                                                   @AuthenticationPrincipal UsuarioLogado organizador) {
        eventoService.excluirCategoria(categoriaId, organizador.id());
        return ResponseEntity.ok("Categoria excluída com sucesso.");
    }

    // ---------------------------------------------------------------- Inscrições

    @PostMapping("/inscricoes")
    public ResponseEntity<InscricaoEvento> inscreverAtleta(@RequestBody InscreverAtletaDTO dto,
                                                           @AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.inscreverAtleta(dto, organizador.id()));
    }

    /** Inscreve de uma vez os atletas dos CPFs lidos de uma planilha; devolve inscritos e falhas. */
    @PostMapping("/categorias/{categoriaId}/inscricoes/lote")
    public ResponseEntity<ResultadoInscricaoLoteDTO> inscreverEmLote(@PathVariable Long categoriaId,
                                                                     @RequestBody InscricaoLoteDTO dto,
                                                                     @AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.ok(eventoService.inscreverEmLote(categoriaId, dto.cpfs(), organizador.id()));
    }

    /** Grava as colocações finais da categoria (resultado do evento). */
    @PutMapping("/categorias/{categoriaId}/resultados")
    public ResponseEntity<List<InscricaoEvento>> lancarResultados(@PathVariable Long categoriaId,
                                                                  @RequestBody LancarResultadosDTO dto,
                                                                  @AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.ok(eventoService.lancarResultados(categoriaId, dto, organizador.id()));
    }

    @GetMapping("/categorias/{categoriaId}/inscricoes")
    public ResponseEntity<List<InscricaoEvento>> listarInscricoesPorCategoria(@PathVariable Long categoriaId,
                                                                              @AuthenticationPrincipal UsuarioLogado organizador) {
        return ResponseEntity.ok(eventoService.listarInscricoes(categoriaId, organizador.id()));
    }

    @DeleteMapping("/inscricoes/{inscricaoId}")
    public ResponseEntity<String> removerInscricao(@PathVariable Long inscricaoId,
                                                   @AuthenticationPrincipal UsuarioLogado organizador) {
        eventoService.removerInscricao(inscricaoId, organizador.id());
        return ResponseEntity.ok("Atleta removido da categoria com sucesso.");
    }

    /** Busca atletas cadastrados e atletas do histórico ainda não cadastrados, por nome ou CPF. */
    @GetMapping("/atletas/buscar")
    public ResponseEntity<List<AtletaBuscaDTO>> buscarAtletasParaInscricao(@RequestParam(required = false) String termo) {
        String termoLimpo = termo != null ? termo.trim() : "";
        // Termo só com números e pontuação de CPF: também compara com o CPF sem pontuação
        String cpfDigitos = termoLimpo.matches("[\\d.\\-\\s]+") ? termoLimpo.replaceAll("\\D", "") : "";
        return ResponseEntity.ok(atletaRepository.buscarPorNomeOuCpf(termoLimpo, cpfDigitos));
    }
}
