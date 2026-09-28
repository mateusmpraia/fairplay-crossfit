package br.com.uff.fairplay.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Link de recuperação de senha: vale uma vez e até {@code expiraEm}. */
@Entity
@Table(name = "tokens_redefinicao_senha")
@Getter
@Setter
@NoArgsConstructor
public class TokenRedefinicaoSenha {

    @Id
    private String token;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;
}
