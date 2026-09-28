package br.com.uff.fairplay.service;

import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.TokenRedefinicaoSenha;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.TokenRedefinicaoSenhaRepository;
import br.com.uff.fairplay.security.GeradorToken;
import br.com.uff.fairplay.security.SessaoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** Troca de senha (usuário logado) e recuperação de senha por link enviado ao e-mail. */
@Service
public class ContaService {

    private final AtletaRepository atletaRepository;
    private final TokenRedefinicaoSenhaRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessaoService sessaoService;
    private final EnvioEmailService envioEmail;
    private final String urlFrontend;
    private final long validadeMinutos;

    public ContaService(AtletaRepository atletaRepository,
                        TokenRedefinicaoSenhaRepository tokenRepository,
                        PasswordEncoder passwordEncoder,
                        SessaoService sessaoService,
                        EnvioEmailService envioEmail,
                        @Value("${fairplay.frontend.url}") String urlFrontend,
                        @Value("${fairplay.recuperacao-senha.validade-minutos}") long validadeMinutos) {
        this.atletaRepository = atletaRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessaoService = sessaoService;
        this.envioEmail = envioEmail;
        this.urlFrontend = urlFrontend;
        this.validadeMinutos = validadeMinutos;
    }

    /**
     * Troca a senha de quem está logado. As outras sessões abertas são encerradas e uma nova sessão
     * é devolvida para substituir a atual.
     */
    @Transactional
    public String trocarSenha(Long usuarioId, String senhaAtual, String novaSenha) {
        Atleta atleta = atletaRepository.findById(usuarioId)
                .orElseThrow(() -> new RegraNegocioException("Usuário não encontrado."));
        if (senhaAtual == null || atleta.getSenha() == null || !passwordEncoder.matches(senhaAtual, atleta.getSenha())) {
            throw new RegraNegocioException("A senha atual está incorreta.");
        }
        ValidacaoCadastro.validarSenha(novaSenha);

        atleta.setSenha(passwordEncoder.encode(novaSenha));
        atletaRepository.save(atleta);

        sessaoService.encerrarTodasDoUsuario(usuarioId);
        return sessaoService.criar(usuarioId, atleta.getPerfil());
    }

    /**
     * Gera um link de redefinição e o envia ao e-mail da conta. Se o e-mail não existir, não faz nada —
     * a resposta ao usuário é a mesma nos dois casos, para não revelar quais e-mails estão cadastrados.
     */
    @Transactional
    public void solicitarRecuperacao(String email, String perfil) {
        if (email == null || perfil == null) return;

        tokenRepository.deleteByExpiraEmBefore(LocalDateTime.now());
        atletaRepository.findByEmailIgnoreCaseAndPerfil(email.trim(), perfil).ifPresent(atleta -> {
            TokenRedefinicaoSenha token = new TokenRedefinicaoSenha();
            token.setToken(GeradorToken.novo());
            token.setUsuarioId(atleta.getId());
            token.setExpiraEm(LocalDateTime.now().plusMinutes(validadeMinutos));
            tokenRepository.save(token);

            String link = urlFrontend + "/redefinir-senha?token=" + token.getToken();
            envioEmail.enviar(atleta.getEmail(), "FairPlay - Redefinição de senha",
                    "Olá, " + atleta.getNomeCompleto() + ".\n\n"
                    + "Para criar uma nova senha, acesse o link abaixo (válido por " + validadeMinutos + " minutos):\n"
                    + link + "\n\nSe você não pediu a redefinição, ignore este e-mail.");
        });
    }

    /** Define a nova senha a partir do link recebido por e-mail. O link deixa de valer e as sessões são encerradas. */
    @Transactional
    public void redefinirSenha(String token, String novaSenha) {
        TokenRedefinicaoSenha registro = tokenRepository.findByTokenAndExpiraEmAfter(token == null ? "" : token, LocalDateTime.now())
                .orElseThrow(() -> new RegraNegocioException("Link inválido ou expirado. Peça uma nova redefinição de senha."));
        ValidacaoCadastro.validarSenha(novaSenha);

        Atleta atleta = atletaRepository.findById(registro.getUsuarioId())
                .orElseThrow(() -> new RegraNegocioException("Usuário não encontrado."));
        atleta.setSenha(passwordEncoder.encode(novaSenha));
        atletaRepository.save(atleta);

        tokenRepository.deleteByUsuarioId(atleta.getId());
        sessaoService.encerrarTodasDoUsuario(atleta.getId());
    }
}
