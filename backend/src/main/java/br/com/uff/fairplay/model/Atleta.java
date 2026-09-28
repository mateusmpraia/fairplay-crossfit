package br.com.uff.fairplay.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Usuário do sistema. O campo {@code perfil} diferencia ATLETA, ORGANIZADOR e HISTORICO
 * (atleta criado automaticamente a partir do histórico importado). A mesma pessoa pode ter
 * um cadastro por perfil, por isso as restrições de unicidade incluem o perfil.
 */
@Entity
@Table(name = "atletas", uniqueConstraints = {
    @UniqueConstraint(name = "uk_cpf_perfil", columnNames = {"cpf", "perfil"}),
    @UniqueConstraint(name = "uk_email_perfil", columnNames = {"email", "perfil"}),
    @UniqueConstraint(name = "uk_celular_perfil", columnNames = {"celular", "perfil"})
})
@Getter
@Setter
@NoArgsConstructor
public class Atleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomeCompleto;

    @Column(length = 14)
    private String cpf;

    @Column(nullable = false)
    private LocalDate dataNascimento;

    @Column(nullable = false, length = 20)
    private String genero;

    @Column(nullable = false, length = 15)
    private String celular;

    @Column(nullable = false)
    private String email;

    /** Hash BCrypt da senha. Nunca é enviado nas respostas da API. */
    @JsonIgnore
    @Column(nullable = false)
    private String senha;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String estado;

    @Column(nullable = false, length = 100)
    private String nomeBox;

    @Column(nullable = false, length = 20)
    private String perfil;
}
