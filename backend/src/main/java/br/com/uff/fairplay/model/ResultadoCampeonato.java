package br.com.uff.fairplay.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "resultados_campeonato")
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

    public ResultadoCampeonato() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNomeCampeonato() { return nomeCampeonato; }
    public void setNomeCampeonato(String nomeCampeonato) { this.nomeCampeonato = nomeCampeonato; }

    public LocalDate getDataCampeonato() { return dataCampeonato; }
    public void setDataCampeonato(LocalDate dataCampeonato) { this.dataCampeonato = dataCampeonato; }

    public CategoriaCompeticao getCategoria() { return categoria; }
    public void setCategoria(CategoriaCompeticao categoria) { this.categoria = categoria; }

    public Integer getColocacao() { return colocacao; }
    public void setColocacao(Integer colocacao) { this.colocacao = colocacao; }

    public Atleta getAtleta() { return atleta; }
    public void setAtleta(Atleta atleta) { this.atleta = atleta; }
}