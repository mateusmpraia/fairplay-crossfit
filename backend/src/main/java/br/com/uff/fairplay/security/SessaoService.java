package br.com.uff.fairplay.security;

import br.com.uff.fairplay.model.Sessao;
import br.com.uff.fairplay.repository.SessaoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

/** Cria, valida e encerra as sessões de login (tokens opacos guardados no banco). */
@Service
public class SessaoService {

    private final SessaoRepository sessaoRepository;
    private final long duracaoHoras;

    public SessaoService(SessaoRepository sessaoRepository,
                         @Value("${fairplay.sessao.duracao-horas:8}") long duracaoHoras) {
        this.sessaoRepository = sessaoRepository;
        this.duracaoHoras = duracaoHoras;
    }

    /** Abre uma sessão e devolve o token que o frontend deve enviar nas próximas requisições. */
    public String criar(Long usuarioId, String perfil) {
        LocalDateTime agora = LocalDateTime.now();
        sessaoRepository.deleteByExpiraEmBefore(agora);

        Sessao sessao = new Sessao();
        sessao.setToken(GeradorToken.novo());
        sessao.setUsuarioId(usuarioId);
        sessao.setPerfil(perfil);
        sessao.setExpiraEm(agora.plusHours(duracaoHoras));
        return sessaoRepository.save(sessao).getToken();
    }

    /** Usuário dono do token, se o token existir e não tiver expirado. */
    public Optional<UsuarioLogado> autenticar(String token) {
        return sessaoRepository.findByTokenAndExpiraEmAfter(token, LocalDateTime.now())
                .map(s -> new UsuarioLogado(s.getUsuarioId(), s.getPerfil()));
    }

    public void encerrar(String token) {
        sessaoRepository.deleteById(token);
    }

    /** Encerra todas as sessões de um usuário (usado ao excluir a conta). */
    public void encerrarTodasDoUsuario(Long usuarioId) {
        sessaoRepository.deleteByUsuarioId(usuarioId);
    }
}
