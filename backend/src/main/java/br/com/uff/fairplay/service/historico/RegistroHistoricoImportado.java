package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.HistoricoAtleta;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Adapter de um resultado do histórico importado ({@link HistoricoAtleta}). Converte a categoria,
 * guardada como texto ("Rx", "Intermediário", "Outros"...), para as categorias das regras.
 */
public final class RegistroHistoricoImportado implements RegistroCompeticao {

    private final HistoricoAtleta historico;

    public RegistroHistoricoImportado(HistoricoAtleta historico) {
        this.historico = historico;
    }

    @Override
    public Long id() {
        return historico.getId();
    }

    @Override
    public Origem origem() {
        return Origem.HISTORICO;
    }

    @Override
    public String competicao() {
        return historico.getNomeCompeticao();
    }

    @Override
    public Optional<LocalDate> data() {
        return Optional.empty();
    }

    @Override
    public CategoriaCompeticao categoria() {
        return CategoriaCompeticao.fromString(historico.getCategoriaPadronizada());
    }

    @Override
    public String categoriaExibida() {
        return historico.getCategoriaPadronizada() != null ? historico.getCategoriaPadronizada() : CATEGORIA_NAO_ESPECIFICADA;
    }

    @Override
    public Integer colocacao() {
        return historico.getColocacao();
    }
}
