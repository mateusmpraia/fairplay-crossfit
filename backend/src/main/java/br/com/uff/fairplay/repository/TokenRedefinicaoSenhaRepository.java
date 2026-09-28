package br.com.uff.fairplay.repository;

import br.com.uff.fairplay.model.TokenRedefinicaoSenha;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TokenRedefinicaoSenhaRepository extends JpaRepository<TokenRedefinicaoSenha, String> {

    Optional<TokenRedefinicaoSenha> findByTokenAndExpiraEmAfter(String token, LocalDateTime agora);

    @Modifying
    @Transactional
    void deleteByUsuarioId(Long usuarioId);

    @Modifying
    @Transactional
    void deleteByExpiraEmBefore(LocalDateTime agora);
}
