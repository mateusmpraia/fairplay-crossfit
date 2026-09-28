package br.com.uff.fairplay.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Sessão de login. O token é enviado pelo frontend no cabeçalho {@code Authorization: Bearer <token>}.
 * O administrador master não é um registro de {@link Atleta}, por isso {@code usuarioId} fica nulo para ele.
 */
@Entity
@Table(name = "sessoes", indexes = @Index(name = "idx_sessao_usuario", columnList = "usuario_id"))
@Getter
@Setter
@NoArgsConstructor
public class Sessao {

    @Id
    @Column(length = 64)
    private String token;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(nullable = false, length = 20)
    private String perfil;

    @Column(name = "expira_em", nullable = false)
    private LocalDateTime expiraEm;
}
