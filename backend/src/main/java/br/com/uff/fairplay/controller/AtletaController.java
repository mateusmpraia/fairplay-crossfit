package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.AtualizarPerfilAtletaDTO;
import br.com.uff.fairplay.dto.CadastroAtletaDTO;
import br.com.uff.fairplay.dto.DashboardAtletaDTO;
import br.com.uff.fairplay.dto.LoginDTO;
import br.com.uff.fairplay.dto.MinhaInscricaoDTO;
import br.com.uff.fairplay.exception.AcessoNegadoException;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.ResultadoCampeonato;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import br.com.uff.fairplay.repository.ResultadoCampeonatoRepository;
import br.com.uff.fairplay.security.SessaoService;
import br.com.uff.fairplay.security.UsuarioLogado;
import br.com.uff.fairplay.service.RecomendacaoCategoriaService;
import br.com.uff.fairplay.service.ValidacaoCadastro;
import br.com.uff.fairplay.service.ValidacaoCadastro.DadosCadastro;
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

    /** Perfis que podem fazer login por esta rota (o admin master tem login próprio). */
    private static final List<String> PERFIS_COM_LOGIN = List.of(Atleta.PERFIL_ATLETA, Atleta.PERFIL_ORGANIZADOR);

    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoRepository;
    private final RecomendacaoCategoriaService recomendacaoCategoriaService;
    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessaoService sessaoService;

    public AtletaController(AtletaRepository atletaRepository,
                            ResultadoCampeonatoRepository resultadoRepository,
                            RecomendacaoCategoriaService recomendacaoCategoriaService,
                            HistoricoAtletaRepository historicoAtletaRepository,
                            InscricaoEventoRepository inscricaoEventoRepository,
                            PasswordEncoder passwordEncoder,
                            SessaoService sessaoService) {
        this.atletaRepository = atletaRepository;
        this.resultadoRepository = resultadoRepository;
        this.recomendacaoCategoriaService = recomendacaoCategoriaService;
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessaoService = sessaoService;
    }

    /**
     * Cadastra atleta ou organizador. CPF, e-mail e celular são únicos por perfil.
     * Se o atleta vincular um histórico que já tem um atleta pendente (criado quando alguém o inscreveu
     * num evento), esse registro vira a conta dele — e as inscrições feitas antes passam a ser suas.
     */
    @PostMapping("/cadastro")
    @Transactional
    public ResponseEntity<?> cadastrarAtleta(@RequestBody CadastroAtletaDTO dto) {
        DadosCadastro dados = ValidacaoCadastro.validar(dto);
        String perfilNome = nomeDoPerfil(dados.perfil());

        if (atletaRepository.existsByCpfAndPerfil(dados.cpf(), dados.perfil())) {
            return ResponseEntity.badRequest().body("Este CPF já está cadastrado como " + perfilNome + ".");
        }
        if (atletaRepository.existsByEmailAndPerfil(dados.email(), dados.perfil())) {
            return ResponseEntity.badRequest().body("Este E-mail já está cadastrado como " + perfilNome + ".");
        }
        if (atletaRepository.existsByCelularAndPerfil(dados.celular(), dados.perfil())) {
            return ResponseEntity.badRequest().body("Este Celular já está cadastrado como " + perfilNome + ".");
        }

        String historicoNome = dto.historicoNomeAtleta() != null ? dto.historicoNomeAtleta().trim() : "";
        boolean vinculaHistorico = Atleta.PERFIL_ATLETA.equals(dados.perfil()) && !historicoNome.isEmpty();

        Atleta atleta = vinculaHistorico
                ? atletaRepository.buscarPendenteDoHistorico(historicoNome).orElseGet(Atleta::new)
                : new Atleta();
        atleta.setNomeCompleto(dados.nomeCompleto());
        atleta.setCpf(dados.cpf());
        atleta.setDataNascimento(dados.dataNascimento());
        atleta.setGenero(dados.genero());
        atleta.setCelular(dados.celular());
        atleta.setEmail(dados.email());
        atleta.setSenha(passwordEncoder.encode(dados.senha()));
        atleta.setCidade(dados.cidade());
        atleta.setEstado(dados.estado());
        atleta.setNomeBox(dados.nomeBox());
        atleta.setPerfil(dados.perfil());

        Atleta salvo = atletaRepository.save(atleta);

        if (vinculaHistorico) {
            historicoAtletaRepository.vincularHistoricoAoAtleta(salvo.getId(), historicoNome);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    /** Login por e-mail ou CPF (com ou sem pontuação) dentro do perfil escolhido. Devolve o token da sessão. */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDTO dto) {
        String perfil = dto.perfil() != null ? dto.perfil() : Atleta.PERFIL_ATLETA;
        String login = dto.login() != null ? dto.login().trim() : "";

        Optional<Atleta> encontrado = PERFIS_COM_LOGIN.contains(perfil) ? buscarPorLogin(login, perfil) : Optional.empty();

        if (encontrado.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Usuário não encontrado como " + nomeDoPerfil(perfil) + ".");
        }

        Atleta atleta = encontrado.get();
        if (dto.senha() == null || atleta.getSenha() == null || !passwordEncoder.matches(dto.senha(), atleta.getSenha())) {
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

    /** Eventos em que o atleta está inscrito, com o resultado da auditoria e a colocação (se lançada). */
    @GetMapping("/{id}/inscricoes")
    public ResponseEntity<List<MinhaInscricaoDTO>> minhasInscricoes(@PathVariable Long id, @AuthenticationPrincipal UsuarioLogado usuario) {
        exigirProprioAtleta(id, usuario);
        return ResponseEntity.ok(inscricaoEventoRepository.buscarInscricoesDoAtleta(id));
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
            if (dto.nomeCompleto().trim().length() < 3) {
                throw new RegraNegocioException("Informe o nome completo.");
            }
            atleta.setNomeCompleto(dto.nomeCompleto().trim());
        }
        if (dto.nomeBox() != null && !dto.nomeBox().isBlank()) {
            if (dto.nomeBox().trim().length() > 100) {
                throw new RegraNegocioException("O nome do box deve ter até 100 caracteres.");
            }
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
        Optional<Atleta> atleta = atletaRepository.findByEmailIgnoreCaseAndPerfil(login, perfil)
                .or(() -> atletaRepository.findByCpfAndPerfil(login, perfil));
        if (atleta.isPresent()) {
            return atleta;
        }

        // CPF digitado só com números: tenta no formato salvo (000.000.000-00)
        String digitos = login.replaceAll("\\D", "");
        if (digitos.length() == 11) {
            return atletaRepository.findByCpfAndPerfil(ValidacaoCadastro.formatarCpf(digitos), perfil);
        }
        return Optional.empty();
    }

    private static String nomeDoPerfil(String perfil) {
        return perfil.equalsIgnoreCase(Atleta.PERFIL_ORGANIZADOR) ? "Organizador" : "Atleta";
    }
}
