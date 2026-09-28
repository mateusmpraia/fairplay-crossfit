package br.com.uff.fairplay.config;

import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.repository.AtletaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Ao iniciar, converte em hash BCrypt as senhas que ainda estão salvas em texto puro
 * (cadastros feitos antes do uso de hash). Quem já está com hash não é alterado.
 */
@Component
public class MigracaoSenhas implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MigracaoSenhas.class);

    private final AtletaRepository atletaRepository;
    private final PasswordEncoder passwordEncoder;

    public MigracaoSenhas(AtletaRepository atletaRepository, PasswordEncoder passwordEncoder) {
        this.atletaRepository = atletaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Atleta> pendentes = atletaRepository.findAll().stream()
                .filter(a -> !ehHashBcrypt(a.getSenha()))
                .toList();

        pendentes.forEach(a -> a.setSenha(passwordEncoder.encode(a.getSenha())));
        atletaRepository.saveAll(pendentes);

        if (!pendentes.isEmpty()) {
            log.info("Senhas convertidas para hash BCrypt: {}", pendentes.size());
        }
    }

    private static boolean ehHashBcrypt(String senha) {
        return senha != null && senha.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$");
    }
}
