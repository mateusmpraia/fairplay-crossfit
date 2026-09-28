package br.com.uff.fairplay.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categorias_evento")
@Getter
@Setter
@NoArgsConstructor
public class CategoriaEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evento_id", nullable = false)
    @JsonIgnore
    private Evento evento;

    @Column(nullable = false, length = 50)
    private String formato; // Individual, Dupla, Trio, Time

    @Column(nullable = false, length = 20)
    private String genero;  // Masculino, Feminino, Misto

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CategoriaCompeticao nivel; // INICIANTE, SCALE, INTERMEDIARIO, RX, ELITE, MASTER

    @OneToMany(mappedBy = "categoriaEvento", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore // <-- Impede loop cíclico e LazyInitializationException
    private List<InscricaoEvento> inscricoes = new ArrayList<>();
}