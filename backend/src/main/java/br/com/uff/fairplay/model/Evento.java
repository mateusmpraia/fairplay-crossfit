package br.com.uff.fairplay.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "eventos")
@Getter
@Setter
@NoArgsConstructor
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organizador_id", nullable = false)
    private Long organizadorId;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;

    @Column(length = 150)
    private String localizacao;

    // Regras de Elegibilidade (Conjunção lógica "E")
    @Column(name = "regra_campeao_sobe")
    private boolean regraCampeaoSobe;

    @Column(name = "regra_tres_podios_sobe")
    private boolean regraTresPodiosSobe;

    @Column(name = "regra_tres_participacoes_sobe")
    private boolean regraTresParticipacoesSobe;

    /** Quem já competiu numa categoria acima não pode se inscrever numa abaixo. */
    @Column(name = "regra_nao_desce")
    private boolean regraNaoDesce;

    @OneToMany(mappedBy = "evento", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<CategoriaEvento> categorias = new ArrayList<>();
}