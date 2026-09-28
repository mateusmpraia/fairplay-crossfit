package br.com.uff.fairplay.model;

import jakarta.persistence.*;

@Entity
@Table(name = "atletas_historico_vinculos", uniqueConstraints = {
    @UniqueConstraint(name = "uk_atleta_historico", columnNames = {"atleta_id", "historico_id"})
})
public class AtletaHistoricoVinculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "atleta_id", nullable = false)
    private Long atletaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "historico_id", nullable = false)
    private HistoricoAtleta historico;

    public AtletaHistoricoVinculo() {}

    public AtletaHistoricoVinculo(Long atletaId, HistoricoAtleta historico) {
        this.atletaId = atletaId;
        this.historico = historico;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAtletaId() { return atletaId; }
    public void setAtletaId(Long atletaId) { this.atletaId = atletaId; }

    public HistoricoAtleta getHistorico() { return historico; }
    public void setHistorico(HistoricoAtleta historico) { this.historico = historico; }
}