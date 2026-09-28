package br.com.uff.fairplay.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "historico_atletas")
@Getter
@Setter
@NoArgsConstructor
public class HistoricoAtleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_competicao", nullable = false)
    private String nomeCompeticao;

    @Column(name = "categoria_padronizada", nullable = false, length = 50)
    private String categoriaPadronizada;

    @Column(name = "colocacao")
    private Integer colocacao;

    @Column(name = "nome_atleta", nullable = false)
    private String nomeAtleta;

    @Column(name = "box_origem")
    private String boxOrigem;
}