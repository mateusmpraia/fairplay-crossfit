package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.UsuarioAdminDTO;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository.TotalDeVinculos;
import br.com.uff.fairplay.security.SessaoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/usuarios")
public class AdminUsuarioController {

    private static final String PERFIL_ADMIN = "MASTER_ADMIN";
    private static final Logger LOG = LoggerFactory.getLogger(AdminUsuarioController.class);

    private final AtletaRepository atletaRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final SessaoService sessaoService;
    private final String usuarioAdmin;
    private final String senhaAdmin;

    public AdminUsuarioController(AtletaRepository atletaRepository,
                                  HistoricoAtletaRepository historicoAtletaRepository,
                                  SessaoService sessaoService,
                                  @Value("${fairplay.admin.usuario}") String usuarioAdmin,
                                  @Value("${fairplay.admin.senha}") String senhaAdmin) {
        this.atletaRepository = atletaRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.sessaoService = sessaoService;
        this.usuarioAdmin = usuarioAdmin;
        this.senhaAdmin = senhaAdmin;

        if ("master".equals(senhaAdmin)) {
            LOG.warn(
                    "Administrador usando a senha padrão \"master\". Defina FAIRPLAY_ADMIN_SENHA antes de colocar o sistema no ar.");
        }
    }

    /** Login do administrador master (credenciais em fairplay.admin.* no application.properties). */
    @PostMapping("/login")
    public ResponseEntity<?> loginAdmin(@RequestBody Map<String, String> credenciais) {
        String usuario = credenciais.getOrDefault("usuario", "");
        String senha = credenciais.getOrDefault("senha", "");

        if (usuarioAdmin.equalsIgnoreCase(usuario) && iguaisEmTempoConstante(senhaAdmin, senha)) {
            return ResponseEntity.ok(Map.of(
                "perfil", PERFIL_ADMIN,
                "token", sessaoService.criar(null, PERFIL_ADMIN)
            ));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciais administrativas inválidas.");
    }

    /** Todos os usuários, com quantas competições do histórico importado cada um tem vinculadas. */
    @GetMapping
    public ResponseEntity<List<UsuarioAdminDTO>> listarUsuarios() {
        Map<Long, Long> historicosPorAtleta = historicoAtletaRepository.contarVinculosPorAtleta().stream()
                .collect(Collectors.toMap(TotalDeVinculos::getAtletaId, TotalDeVinculos::getTotal));

        List<UsuarioAdminDTO> usuarios = atletaRepository.findAll().stream()
                .map(a -> new UsuarioAdminDTO(
                        a.getId(),
                        a.getNomeCompleto(),
                        a.getEmail(),
                        a.getCpf(),
                        a.getCelular(),
                        a.getNomeBox(),
                        a.getCidade(),
                        a.getEstado(),
                        a.getPerfil(),
                        a.getDataNascimento(),
                        historicosPorAtleta.getOrDefault(a.getId(), 0L)
                ))
                .toList();
        return ResponseEntity.ok(usuarios);
    }

    /**
     * Abre uma sessão de atleta para o administrador usar o sistema como esse atleta (editar perfil, vincular
     * histórico etc.). Só para contas de atleta com cadastro; o acesso fica registrado no log.
     */
    @PostMapping("/{id}/acessar")
    public ResponseEntity<?> acessarComoAtleta(@PathVariable Long id) {
        Atleta atleta = atletaRepository.findById(id).orElse(null);
        if (atleta == null) {
            return ResponseEntity.notFound().build();
        }
        if (!Atleta.PERFIL_ATLETA.equals(atleta.getPerfil())) {
            return ResponseEntity.badRequest().body("Só é possível acessar o painel de atletas com cadastro.");
        }

        LOG.info("Administrador acessou a conta do atleta #{} ({})", atleta.getId(), atleta.getNomeCompleto());
        return ResponseEntity.ok(Map.of(
                "token", sessaoService.criar(atleta.getId(), Atleta.PERFIL_ATLETA),
                "id", atleta.getId(),
                "nome", atleta.getNomeCompleto(),
                "perfil", Atleta.PERFIL_ATLETA
        ));
    }

    /**
     * Exclui o usuário. O banco apaga em cascata as sessões, inscrições, vínculos com o histórico
     * (que fica livre para ser vinculado de novo) e, se for organizador, os eventos dele.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<String> excluirUsuario(@PathVariable Long id) {
        if (!atletaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        atletaRepository.deleteById(id);
        return ResponseEntity.ok("Usuário excluído com sucesso.");
    }

    private static boolean iguaisEmTempoConstante(String esperado, String informado) {
        return MessageDigest.isEqual(esperado.getBytes(StandardCharsets.UTF_8), informado.getBytes(StandardCharsets.UTF_8));
    }
}
