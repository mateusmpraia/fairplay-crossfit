package br.com.uff.fairplay.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "inscricoes_evento")
@Getter
@Setter
@NoArgsConstructor
public class InscricaoEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_evento_id", nullable = false)
    @JsonIgnore
    private CategoriaEvento categoriaEvento;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "atleta_id", nullable = false)
    private Atleta atleta;

    @Column(name = "status_elegibilidade", nullable = false, length = 20)
    private String statusElegibilidade; // REGULAR ou IRREGULAR

    @Column(name = "categoria_recomendada", length = 50)
    private String categoriaRecomendada;

    @Column(name = "motivo_irregularidade", columnDefinition = "TEXT")
    private String motivoIrregularidade;

    @Column(name = "data_inscricao")
    private LocalDateTime dataInscricao;

    /** Colocação final no evento, lançada pelo organizador depois da competição (nula até lá). */
    @Column(name = "colocacao")
    private Integer colocacao;

    /**
     * Status que a inscrição tinha antes de a auditoria mudar sozinha, porque o histórico do atleta mudou
     * depois da inscrição (nulo se não houve mudança ou se o organizador já marcou "ciente").
     */
    @Column(name = "status_anterior", length = 20)
    private String statusAnterior;

    /** Quando a auditoria mudou sozinha de status; enquanto preenchido, a inscrição aparece em destaque ao organizador. */
    @Column(name = "auditoria_alterada_em")
    private LocalDateTime auditoriaAlteradaEm;

    @PrePersist
    protected void onCreate() {
        if (this.dataInscricao == null) {
            this.dataInscricao = LocalDateTime.now();
        }
    }
}