package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.service.Participacao;

import java.util.List;
import java.util.Optional;

/**
 * Histórico de competições de um atleta já reunido de todas as fontes, pronto para as regras e para o painel.
 *
 * @param registros todos os resultados, na ordem das fontes (eventos do FairPlay primeiro, depois o importado)
 */
public record HistoricoDoAtleta(List<RegistroCompeticao> registros) {

    public HistoricoDoAtleta {
        registros = List.copyOf(registros);
    }

    /** Resultados com categoria reconhecida e colocação, na mesma ordem: é o que as regras de categoria usam. */
    public List<Participacao> participacoes() {
        return registros.stream()
                .map(RegistroCompeticao::participacao)
                .flatMap(Optional::stream)
                .toList();
    }

    /** Quantidade de 1º, 2º e 3º lugares entre as participações. */
    public int totalPodios() {
        return (int) participacoes().stream()
                .filter(p -> p.colocacao() >= 1 && p.colocacao() <= 3)
                .count();
    }
}
