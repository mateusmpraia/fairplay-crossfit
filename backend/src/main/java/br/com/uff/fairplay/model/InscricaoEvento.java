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

    @PrePersist
    protected void onCreate() {
        if (this.dataInscricao == null) {
            this.dataInscricao = LocalDateTime.now();
        }
    }
}