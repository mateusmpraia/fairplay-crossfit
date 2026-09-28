package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.AtualizarPerfilAtletaDTO;
import br.com.uff.fairplay.dto.CadastroAtletaDTO;
import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.LoginDTO;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.ResultadoCampeonato;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.ResultadoCampeonatoRepository;
import br.com.uff.fairplay.service.RecomendacaoCategoriaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/atletas")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class AtletaController {

    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoRepository;
    private final RecomendacaoCategoriaService recomendacaoCategoriaService;
    private final HistoricoAtletaRepository historicoAtletaRepository;

    public AtletaController(AtletaRepository atletaRepository,
                            ResultadoCampeonatoRepository resultadoRepository,
                            RecomendacaoCategoriaService recomendacaoCategoriaService,
                            HistoricoAtletaRepository historicoAtletaRepository) {
        this.atletaRepository = atletaRepository;
        this.resultadoRepository = resultadoRepository;
        this.recomendacaoCategoriaService = recomendacaoCategoriaService;
        this.historicoAtletaRepository = historicoAtletaRepository;
    }

    @PostMapping("/cadastro")
    @Transactional
    public ResponseEntity<?> cadastrarAtleta(@RequestBody CadastroAtletaDTO dto) {
        String perfilTipo = dto.perfil() != null ? dto.perfil() : "ATLETA";
        String perfilNome = perfilTipo.equalsIgnoreCase("ORGANIZADOR") ? "Organizador" : "Atleta";

        if (atletaRepository.existsByCpfAndPerfil(dto.cpf(), perfilTipo)) {
            return ResponseEntity.badRequest().body("Este CPF já está cadastrado como " + perfilNome + ".");
        }
        if (atletaRepository.existsByEmailAndPerfil(dto.email(), perfilTipo)) {
            return ResponseEntity.badRequest().body("Este E-mail já está cadastrado como " + perfilNome + ".");
        }
        if (atletaRepository.existsByCelularAndPerfil(dto.celular(), perfilTipo)) {
            return ResponseEntity.badRequest().body("Este Celular já está cadastrado como " + perfilNome + ".");
        }

        Atleta novoAtleta = new Atleta();
        novoAtleta.setNomeCompleto(dto.nomeCompleto());
        novoAtleta.setCpf(dto.cpf());
        novoAtleta.setDataNascimento(dto.dataNascimento());
        novoAtleta.setGenero(dto.genero());
        novoAtleta.setCelular(dto.celular());
        novoAtleta.setEmail(dto.email());
        novoAtleta.setSenha(dto.senha());
        novoAtleta.setCidade(dto.cidade());
        novoAtleta.setEstado(dto.estado());
        novoAtleta.setNomeBox(dto.nomeBox());
        novoAtleta.setPerfil(perfilTipo);

        Atleta salvo = atletaRepository.save(novoAtleta);

        // Se o usuário selecionou vincular a um atleta do histórico
        if (dto.historicoNomeAtleta() != null && !dto.historicoNomeAtleta().isBlank()) {
            historicoAtletaRepository.vincularHistoricoAoAtleta(
                salvo.getId(),
                dto.historicoNomeAtleta().trim()
            );
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDTO dto) {
        String perfilTipo = dto.perfil() != null ? dto.perfil() : "ATLETA";
        String loginInput = dto.login() != null ? dto.login().trim() : "";

        // 1. Tenta buscar diretamente pelo texto digitado (E-mail ou CPF já formatado)
        Optional<Atleta> atletaOpt = atletaRepository.findByEmailAndPerfil(loginInput, perfilTipo);
        if (atletaOpt.isEmpty()) {
            atletaOpt = atletaRepository.findByCpfAndPerfil(loginInput, perfilTipo);
        }

        // 2. Se não achou e o input contém apenas números (CPF sem pontuação), formata para 000.000.000-00
        if (atletaOpt.isEmpty()) {
            String apenasDigitos = loginInput.replaceAll("\\D", "");
            if (apenasDigitos.length() == 11) {
                String cpfFormatado = apenasDigitos.replaceAll("(\\d{3})(\\d{3})(\\d{3})(\\d{2})", "$1.$2.$3-$4");
                atletaOpt = atletaRepository.findByCpfAndPerfil(cpfFormatado, perfilTipo);
            }
        }

        if (atletaOpt.isEmpty()) {
            String perfilFormatado = perfilTipo.equalsIgnoreCase("ORGANIZADOR") ? "Organizador" : "Atleta";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Usuário não encontrado como " + perfilFormatado + ".");
        }

        Atleta atleta = atletaOpt.get();

        if (!atleta.getSenha().equals(dto.senha())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Senha incorreta.");
        }

        return ResponseEntity.ok(Map.of(
                "id", atleta.getId(),
                "nome", atleta.getNomeCompleto(),
                "email", atleta.getEmail(),
                "perfil", atleta.getPerfil()
        ));
    }

    @GetMapping("/{id}/dashboard")
    public ResponseEntity<DashboardAtletaDTO> getDashboard(@PathVariable Long id) {
        return ResponseEntity.ok(recomendacaoCategoriaService.obterDashboard(id));
    }

    @PostMapping("/{id}/resultados")
    public ResponseEntity<?> adicionarResultado(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Atleta atleta = atletaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atleta não encontrado com ID: " + id));

        ResultadoCampeonato res = new ResultadoCampeonato();
        res.setAtleta(atleta);
        res.setNomeCampeonato((String) body.get("nomeCampeonato"));
        res.setDataCampeonato(LocalDate.parse((String) body.get("dataCampeonato")));
        res.setCategoria(CategoriaCompeticao.fromString((String) body.get("categoria")));
        res.setColocacao(Integer.parseInt(body.get("colocacao").toString()));

        ResultadoCampeonato salvo = resultadoRepository.save(res);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PutMapping("/{id}/perfil")
    @Transactional
    public ResponseEntity<?> atualizarPerfil(@PathVariable Long id, @RequestBody AtualizarPerfilAtletaDTO dto) {
        Atleta atleta = atletaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atleta não encontrado com ID: " + id));

        if (dto.nomeCompleto() != null && !dto.nomeCompleto().isBlank()) {
            atleta.setNomeCompleto(dto.nomeCompleto().trim());
        }

        if (dto.nomeBox() != null && !dto.nomeBox().isBlank()) {
            atleta.setNomeBox(dto.nomeBox().trim());
        }

        Atleta atualizado = atletaRepository.save(atleta);

        return ResponseEntity.ok(Map.of(
                "id", atualizado.getId(),
                "nomeCompleto", atualizado.getNomeCompleto(),
                "nomeBox", atualizado.getNomeBox(),
                "mensagem", "Perfil atualizado com sucesso!"
        ));
    }
}