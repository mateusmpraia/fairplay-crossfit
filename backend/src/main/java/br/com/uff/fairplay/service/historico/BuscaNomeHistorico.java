package br.com.uff.fairplay.service.historico;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Termos usados para achar o atleta no histórico importado pelo nome digitado no cadastro.
 * Compara primeiro nome e último sobrenome, para que "Ana Paula Souza" encontre "Ana Souza" e vice-versa.
 */
public record BuscaNomeHistorico(String primeiroNome, String ultimoNome) {

    private static final Set<String> CONECTIVOS = Set.of("de", "da", "do", "das", "dos", "e");

    /** Extrai os termos de busca do nome; o último nome é igual ao primeiro quando só há uma palavra. */
    public static BuscaNomeHistorico doNome(String nome) {
        List<String> palavras = Arrays.stream(nome.trim().split("\\s+"))
                .filter(p -> !p.isEmpty() && !CONECTIVOS.contains(p.toLowerCase(Locale.ROOT)))
                .toList();
        if (palavras.isEmpty()) {
            return new BuscaNomeHistorico(nome.trim(), nome.trim());
        }
        return new BuscaNomeHistorico(palavras.get(0), palavras.get(palavras.size() - 1));
    }
}
