package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.AtualizarPerfilAtletaDTO;
import br.com.uff.fairplay.dto.CadastroAtletaDTO;
import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.LoginDTO;
import br.com.uff.fairplay.exception.AcessoNegadoException;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.ResultadoCampeonato;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.ResultadoCampeonatoRepository;
import br.com.uff.fairplay.security.SessaoService;
import br.com.uff.fairplay.security.UsuarioLogado;
import br.com.uff.fairplay.service.RecomendacaoCategoriaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/atletas")
public class AtletaController {

    private static final String PERFIL_PADRAO = "ATLETA";
    /** Perfis que podem fazer login por esta rota (o admin master tem login próprio). */
    private static final List<String> PERFIS_COM_LOGIN = List.of("ATLETA", "ORGANIZADOR");

    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoRepository;
    private final RecomendacaoCategoriaService recomendacaoCategoriaService;
    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessaoService sessaoService;

    public AtletaController(AtletaRepository atletaRepository,
                            ResultadoCampeonatoRepository resultadoRepository,
                            RecomendacaoCategoriaService recomendacaoCategoriaService,
                            HistoricoAtletaRepository historicoAtletaRepository,
                            PasswordEncoder passwordEncoder,
                            SessaoService sessaoService) {
        this.atletaRepository = atletaRepository;
        this.resultadoRepository = resultadoRepository;
        this.recomendacaoCategoriaService = recomendacaoCategoriaService;
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessaoService = sessaoService;
    }

    /** Cadastra atleta ou organizador. CPF, e-mail e celular são únicos por perfil. */
    @PostMapping("/cadastro")
    @Transactional
    public ResponseEntity<?> cadastrarAtleta(@RequestBody CadastroAtletaDTO dto) {
        String perfil = dto.perfil() != null ? dto.perfil() : PERFIL_PADRAO;
        String perfilNome = nomeDoPerfil(perfil);

        if (dto.senha() == null || dto.senha().isBlank()) {
            return ResponseEntity.badRequest().body("Informe uma senha.");
        }
        if (atletaRepository.existsByCpfAndPerfil(dto.cpf(), perfil)) {
            return ResponseEntity.badRequest().body("Este CPF já está cadastrado como " + perfilNome + ".");
        }
        if (atletaRepository.existsByEmailAndPerfil(dto.email(), perfil)) {
            return ResponseEntity.badRequest().body("Este E-mail já está cadastrado como " + perfilNome + ".");
        }
        if (atletaRepository.existsByCelularAndPerfil(dto.celular(), perfil)) {
            return ResponseEntity.badRequest().body("Este Celular já está cadastrado como " + perfilNome + ".");
        }

        Atleta atleta = new Atleta();
        atleta.setNomeCompleto(dto.nomeCompleto());
        atleta.setCpf(dto.cpf());
        atleta.setDataNascimento(dto.dataNascimento());
        atleta.setGenero(dto.genero());
        atleta.setCelular(dto.celular());
        atleta.setEmail(dto.email());
        atleta.setSenha(passwordEncoder.encode(dto.senha()));
        atleta.setCidade(dto.cidade());
        atleta.setEstado(dto.estado());
        atleta.setNomeBox(dto.nomeBox());
        atleta.setPerfil(perfil);

        Atleta salvo = atletaRepository.save(atleta);

        if (dto.historicoNomeAtleta() != null && !dto.historicoNomeAtleta().isBlank()) {
            historicoAtletaRepository.vincularHistoricoAoAtleta(salvo.getId(), dto.historicoNomeAtleta().trim());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    /** Login por e-mail ou CPF (com ou sem pontuação) dentro do perfil escolhido. Devolve o token da sessão. */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDTO dto) {
        String perfil = dto.perfil() != null ? dto.perfil() : PERFIL_PADRAO;
        String login = dto.login() != null ? dto.login().trim() : "";

        Optional<Atleta> encontrado = PERFIS_COM_LOGIN.contains(perfil) ? buscarPorLogin(login, perfil) : Optional.empty();

        if (encontrado.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Usuário não encontrado como " + nomeDoPerfil(perfil) + ".");
        }

        Atleta atleta = encontrado.get();
        if (dto.senha() == null || !passwordEncoder.matches(dto.senha(), atleta.getSenha())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Senha incorreta.");
        }

        return ResponseEntity.ok(Map.of(
                "token", sessaoService.criar(atleta.getId(), atleta.getPerfil()),
                "id", atleta.getId(),
                "nome", atleta.getNomeCompleto(),
                "email", atleta.getEmail(),
                "perfil", atleta.getPerfil()
        ));
    }

    @GetMapping("/{id}/dashboard")
    public ResponseEntity<DashboardAtletaDTO> getDashboard(@PathVariable Long id, @AuthenticationPrincipal UsuarioLogado usuario) {
        exigirProprioAtleta(id, usuario);
        return ResponseEntity.ok(recomendacaoCategoriaService.obterDashboard(id));
    }

    /** Lança manualmente um resultado de campeonato para o atleta. Só o administrador (não usado pelo frontend). */
    @PostMapping("/{id}/resultados")
    public ResponseEntity<ResultadoCampeonato> adicionarResultado(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ResultadoCampeonato resultado = new ResultadoCampeonato();
        resultado.setAtleta(buscarAtleta(id));
        resultado.setNomeCampeonato((String) body.get("nomeCampeonato"));
        resultado.setDataCampeonato(LocalDate.parse((String) body.get("dataCampeonato")));
        resultado.setCategoria(CategoriaCompeticao.fromString((String) body.get("categoria")));
        resultado.setColocacao(Integer.parseInt(body.get("colocacao").toString()));

        return ResponseEntity.status(HttpStatus.CREATED).body(resultadoRepository.save(resultado));
    }

    /** Atualiza nome e/ou box do atleta; campos vazios são ignorados. */
    @PutMapping("/{id}/perfil")
    @Transactional
    public ResponseEntity<Map<String, Object>> atualizarPerfil(@PathVariable Long id, @RequestBody AtualizarPerfilAtletaDTO dto,
                                                               @AuthenticationPrincipal UsuarioLogado usuario) {
        exigirProprioAtleta(id, usuario);
        Atleta atleta = buscarAtleta(id);

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

    private static void exigirProprioAtleta(Long id, UsuarioLogado usuario) {
        if (!id.equals(usuario.id())) {
            throw new AcessoNegadoException("Você só pode acessar os seus próprios dados.");
        }
    }

    private Atleta buscarAtleta(Long id) {
        return atletaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado com ID: " + id));
    }

    private Optional<Atleta> buscarPorLogin(String login, String perfil) {
        Optional<Atleta> atleta = atletaRepository.findByEmailAndPerfil(login, perfil)
                .or(() -> atletaRepository.findByCpfAndPerfil(login, perfil));
        if (atleta.isPresent()) {
            return atleta;
        }

        // CPF digitado só com números: tenta no formato salvo (000.000.000-00)
        String digitos = login.replaceAll("\\D", "");
        if (digitos.length() == 11) {
            String cpfFormatado = digitos.replaceAll("(\\d{3})(\\d{3})(\\d{3})(\\d{2})", "$1.$2.$3-$4");
            return atletaRepository.findByCpfAndPerfil(cpfFormatado, perfil);
        }
        return Optional.empty();
    }

    private static String nomeDoPerfil(String perfil) {
        return perfil.equalsIgnoreCase("ORGANIZADOR") ? "Organizador" : "Atleta";
    }
}
