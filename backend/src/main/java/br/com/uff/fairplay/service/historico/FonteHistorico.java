package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.model.Atleta;

import java.util.List;

/**
 * Uma origem de resultados de competição. Cada fonte busca os seus dados e os devolve já "embrulhados"
 * como {@link RegistroCompeticao}.
 *
 * <p>Para acrescentar uma origem nova (por exemplo, resultados de outra plataforma), basta criar uma
 * classe que implemente esta interface e anotá-la com {@code @Component}: a
 * {@link HistoricoCompeticaoFactory} passa a usá-la sem nenhuma outra alteração. A ordem entre as fontes
 * (anotação {@code @Order}) define a ordem dos resultados no histórico.
 */
public interface FonteHistorico {

    List<RegistroCompeticao> buscar(Atleta atleta, ConsultaHistorico consulta);
}
