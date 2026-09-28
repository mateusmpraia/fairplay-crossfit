package br.com.uff.fairplay.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** Resultado de campeonato lançado manualmente no sistema para um atleta. */
@Entity
@Table(name = "resultados_campeonato")
@Getter
@Setter
@NoArgsConstructor
public class ResultadoCampeonato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomeCampeonato;

    @Column(nullable = false)
    private LocalDate dataCampeonato;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CategoriaCompeticao categoria;

    @Column(nullable = false)
    private Integer colocacao;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atleta_id", nullable = false)
    private Atleta atleta;
}
