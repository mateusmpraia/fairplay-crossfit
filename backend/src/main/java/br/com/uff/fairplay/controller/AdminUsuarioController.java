package br.com.uff.fairplay.controller;

import br.com.uff.fairplay.dto.UsuarioAdminDTO;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.ResultadoCampeonatoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/usuarios")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class AdminUsuarioController {

    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoCampeonatoRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;

    public AdminUsuarioController(AtletaRepository atletaRepository,
                                  ResultadoCampeonatoRepository resultadoCampeonatoRepository,
                                  HistoricoAtletaRepository historicoAtletaRepository) {
        this.atletaRepository = atletaRepository;
        this.resultadoCampeonatoRepository = resultadoCampeonatoRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
    }

    // Autenticação Administrativa Master
    @PostMapping("/login")
    public ResponseEntity<?> loginAdmin(@RequestBody Map<String, String> credenciais) {
        String usuario = credenciais.get("usuario");
        String senha = credenciais.get("senha");

        if ("master".equalsIgnoreCase(usuario) && "master".equals(senha)) {
            return ResponseEntity.ok(Map.of(
                "status", "sucesso",
                "perfil", "MASTER_ADMIN",
                "token", "master-admin-session-ok"
            ));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("Credenciais administrativas inválidas.");
    }

    // Listar todos os usuários cadastrados
    @GetMapping
    public ResponseEntity<List<UsuarioAdminDTO>> listarUsuarios() {
        List<Atleta> atletas = atletaRepository.findAll();
        
        List<UsuarioAdminDTO> listaDTO = atletas.stream().map(a -> new UsuarioAdminDTO(
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
        )).collect(Collectors.toList());

        return ResponseEntity.ok(listaDTO);
    }

    // Exclusão segura de usuário (limpa dependências antes de remover o atleta)
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> excluirUsuario(@PathVariable Long id) {
        if (!atletaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        // 1. Libera o histórico desvinculando o atletaId
        historicoAtletaRepository.desvincularPorAtletaId(id);

        // 2. Remove resultados de competições lançadas diretamente por ele
        resultadoCampeonatoRepository.deleteByAtletaId(id);

        // 3. Remove o usuário/atleta
        atletaRepository.deleteById(id);

        return ResponseEntity.ok("Usuário excluído com sucesso.");
    }
}