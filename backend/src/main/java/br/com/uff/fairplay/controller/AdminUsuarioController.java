package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.UsuarioAdminDTO;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.security.SessaoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/usuarios")
public class AdminUsuarioController {

    private static final String PERFIL_ADMIN = "MASTER_ADMIN";

    private final AtletaRepository atletaRepository;
    private final SessaoService sessaoService;
    private final String usuarioAdmin;
    private final String senhaAdmin;

    public AdminUsuarioController(AtletaRepository atletaRepository,
                                  SessaoService sessaoService,
                                  @Value("${fairplay.admin.usuario}") String usuarioAdmin,
                                  @Value("${fairplay.admin.senha}") String senhaAdmin) {
        this.atletaRepository = atletaRepository;
        this.sessaoService = sessaoService;
        this.usuarioAdmin = usuarioAdmin;
        this.senhaAdmin = senhaAdmin;
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

    @GetMapping
    public ResponseEntity<List<UsuarioAdminDTO>> listarUsuarios() {
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
                        a.getDataNascimento()
                ))
                .toList();
        return ResponseEntity.ok(usuarios);
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
