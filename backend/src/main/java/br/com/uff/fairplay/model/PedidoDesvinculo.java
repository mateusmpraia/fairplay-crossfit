package br.com.uff.fairplay.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Pedido do atleta para desfazer o vínculo com uma competição do histórico depois do prazo em que
 * ele pode fazer isso sozinho. O administrador aprova (o vínculo é desfeito) ou recusa.
 */
@Entity
@Table(name = "pedidos_desvinculo_historico")
@Getter
@Setter
@NoArgsConstructor
public class PedidoDesvinculo {

    public static final String PENDENTE = "PENDENTE";
    public static final String APROVADO = "APROVADO";
    public static final String RECUSADO = "RECUSADO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "atleta_id", nullable = false)
    private Long atletaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "historico_id", nullable = false)
    private HistoricoAtleta historico;

    @Column(nullable = false, length = 500)
    private String motivo;

    @Column(nullable = false, length = 20)
    private String status = PENDENTE;

    @Column(name = "data_pedido", nullable = false)
    private LocalDateTime dataPedido;

    @Column(name = "data_decisao")
    private LocalDateTime dataDecisao;

    @PrePersist
    protected void onCreate() {
        if (this.dataPedido == null) {
            this.dataPedido = LocalDateTime.now();
        }
    }
}
