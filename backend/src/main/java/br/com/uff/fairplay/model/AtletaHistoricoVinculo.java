package br.com.uff.fairplay.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Liga um atleta cadastrado aos registros do histórico importado que pertencem a ele.
 * As linhas são inseridas via SQL nativo em {@code HistoricoAtletaRepository#vincularHistoricoAoAtleta}.
 */
@Entity
@Table(name = "atletas_historico_vinculos", uniqueConstraints = {
    @UniqueConstraint(name = "uk_atleta_historico", columnNames = {"atleta_id", "historico_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class AtletaHistoricoVinculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "atleta_id", nullable = false)
    private Long atletaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "historico_id", nullable = false)
    private HistoricoAtleta historico;
}
