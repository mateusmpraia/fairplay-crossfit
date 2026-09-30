package br.com.uff.fairplay.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Usuário do sistema. O campo {@code perfil} diferencia:
 * <ul>
 *   <li>ATLETA e ORGANIZADOR: contas com login. A mesma pessoa pode ter uma conta de cada perfil,
 *       por isso as restrições de unicidade incluem o perfil;</li>
 *   <li>HISTORICO: atleta pendente, criado ao inscrever alguém que só existe no histórico importado.
 *       Tem só nome, gênero e box; quando a pessoa vincula esse histórico (no cadastro ou no painel), o
 *       pendente é incorporado à conta dela (ver {@code VinculoHistoricoService#vincular}).</li>
 * </ul>
 * O esquema da tabela é definido pelas migrações do Liquibase.
 */
@Entity
@Table(name = "atletas")
@Getter
@Setter
@NoArgsConstructor
public class Atleta {

    public static final String PERFIL_ATLETA = "ATLETA";
    public static final String PERFIL_ORGANIZADOR = "ORGANIZADOR";
    public static final String PERFIL_HISTORICO = "HISTORICO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomeCompleto;

    private String cpf;

    private LocalDate dataNascimento;

    @Column(nullable = false)
    private String genero;

    private String celular;

    private String email;

    /** Hash BCrypt da senha (nulo para atletas pendentes do histórico). Nunca é enviado nas respostas da API. */
    @JsonIgnore
    private String senha;

    private String cidade;

    private String estado;

    @Column(nullable = false)
    private String nomeBox;

    @Column(nullable = false)
    private String perfil;
}
