package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.security.UsuarioLogado;
import br.com.uff.fairplay.service.ContaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Senha da conta: troca (logado) e recuperação por e-mail (sem login). */
@RestController
@RequestMapping("/api/conta")
public class ContaController {

    public record TrocarSenhaDTO(String senhaAtual, String novaSenha) {}
    public record RecuperarSenhaDTO(String email, String perfil) {}
    public record RedefinirSenhaDTO(String token, String novaSenha) {}

    private final ContaService contaService;

    public ContaController(ContaService contaService) {
        this.contaService = contaService;
    }

    /** Troca a senha e devolve um novo token de sessão (as outras sessões são encerradas). */
    @PutMapping("/senha")
    public ResponseEntity<Map<String, String>> trocarSenha(@RequestBody TrocarSenhaDTO dto,
                                                           @AuthenticationPrincipal UsuarioLogado usuario) {
        String token = contaService.trocarSenha(usuario.id(), dto.senhaAtual(), dto.novaSenha());
        return ResponseEntity.ok(Map.of("token", token, "mensagem", "Senha alterada com sucesso."));
    }

    @PostMapping("/recuperar-senha")
    public ResponseEntity<String> recuperarSenha(@RequestBody RecuperarSenhaDTO dto) {
        contaService.solicitarRecuperacao(dto.email(), dto.perfil());
        return ResponseEntity.ok("Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
    }

    @PostMapping("/redefinir-senha")
    public ResponseEntity<String> redefinirSenha(@RequestBody RedefinirSenhaDTO dto) {
        contaService.redefinirSenha(dto.token(), dto.novaSenha());
        return ResponseEntity.ok("Senha redefinida com sucesso. Faça login com a nova senha.");
    }
}
