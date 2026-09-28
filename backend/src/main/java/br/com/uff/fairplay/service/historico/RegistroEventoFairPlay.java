package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.dto.ResultadoEventoDTO;
import br.com.uff.fairplay.model.CategoriaCompeticao;

import java.time.LocalDate;
import java.util.Optional;

/** Adapter de uma colocação lançada pelo organizador num evento do FairPlay ({@link ResultadoEventoDTO}). */
public final class RegistroEventoFairPlay implements RegistroCompeticao {

    private final ResultadoEventoDTO resultado;

    public RegistroEventoFairPlay(ResultadoEventoDTO resultado) {
        this.resultado = resultado;
    }

    /** Evento em que o resultado foi obtido (usado para tirar da auditoria o próprio evento auditado). */
    public Long eventoId() {
        return resultado.eventoId();
    }

    @Override
    public Long id() {
        return resultado.inscricaoId();
    }

    @Override
    public Origem origem() {
        return Origem.EVENTO;
    }

    @Override
    public String competicao() {
        return resultado.evento();
    }

    @Override
    public Optional<LocalDate> data() {
        return Optional.ofNullable(resultado.data());
    }

    @Override
    public CategoriaCompeticao categoria() {
        return resultado.nivel();
    }

    @Override
    public String categoriaExibida() {
        return resultado.nivel() != null ? resultado.nivel().getDescricao() : CATEGORIA_NAO_ESPECIFICADA;
    }

    @Override
    public Integer colocacao() {
        return resultado.colocacao();
    }
}
