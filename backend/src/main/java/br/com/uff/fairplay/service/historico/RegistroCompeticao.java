package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.service.Participacao;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Visão única de um resultado de competição do atleta, qualquer que seja a sua origem.
 *
 * <p><b>Padrão Adapter (wrapper):</b> cada origem de histórico guarda o resultado num formato próprio
 * (o histórico importado tem a categoria em texto e não tem data; o evento do FairPlay tem data e a
 * categoria como enum). Cada implementação desta interface "embrulha" um desses formatos e o expõe
 * sempre da mesma forma, de modo que as regras de categoria não precisam saber de onde o resultado veio.
 *
 * @see RegistroHistoricoImportado
 * @see RegistroEventoFairPlay
 */
public interface RegistroCompeticao {

    /** Texto exibido quando a categoria do resultado não é conhecida. */
    String CATEGORIA_NAO_ESPECIFICADA = "Não especificada";

    /** Identificador do registro na sua origem (id do histórico ou da inscrição). */
    Long id();

    Origem origem();

    /** Nome da competição. */
    String competicao();

    /** Data da competição, quando a origem registra (o histórico importado não tem data). */
    Optional<LocalDate> data();

    /** Categoria reconhecida pelas regras do FairPlay, ou {@code null} se não for uma delas (ex.: "Outros"). */
    CategoriaCompeticao categoria();

    /** Nome da categoria para exibição, mesmo quando ela não é reconhecida pelas regras. */
    String categoriaExibida();

    /** Colocação final, ou {@code null} se não foi registrada. */
    Integer colocacao();

    /**
     * Participação usada nas regras de categoria (auditoria e recomendação). Só existe quando o
     * resultado tem categoria reconhecida e colocação.
     */
    default Optional<Participacao> participacao() {
        return categoria() != null && colocacao() != null
                ? Optional.of(new Participacao(categoria(), colocacao()))
                : Optional.empty();
    }
}
