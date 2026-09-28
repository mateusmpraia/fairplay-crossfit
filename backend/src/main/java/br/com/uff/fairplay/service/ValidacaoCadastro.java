package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.CadastroAtletaDTO;
import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.model.Atleta;

import java.time.LocalDate;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validação e padronização dos dados de cadastro. Funções puras, cobertas por testes unitários.
 * Cada problema vira uma {@link RegraNegocioException} com a mensagem mostrada ao usuário.
 */
public final class ValidacaoCadastro {

    public static final int TAMANHO_MINIMO_SENHA = 6;

    private static final Set<String> GENEROS = Set.of("MASCULINO", "FEMININO", "OUTRO");
    private static final Set<String> PERFIS = Set.of(Atleta.PERFIL_ATLETA, Atleta.PERFIL_ORGANIZADOR);
    private static final Set<String> UFS = Set.of(
            "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
            "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private ValidacaoCadastro() {}

    /** Dados do cadastro já conferidos e no formato em que são salvos. */
    public record DadosCadastro(
            String nomeCompleto, String cpf, LocalDate dataNascimento, String genero, String celular,
            String email, String senha, String cidade, String estado, String nomeBox, String perfil) {}

    public static DadosCadastro validar(CadastroAtletaDTO dto) {
        String perfil = dto.perfil() != null ? dto.perfil().trim().toUpperCase() : Atleta.PERFIL_ATLETA;
        if (!PERFIS.contains(perfil)) {
            throw new RegraNegocioException("Perfil inválido: escolha Atleta ou Organizador.");
        }

        String nome = texto(dto.nomeCompleto());
        if (nome.length() < 3) {
            throw new RegraNegocioException("Informe o nome completo.");
        }
        if (!cpfValido(dto.cpf())) {
            throw new RegraNegocioException("CPF inválido. Confira os números digitados.");
        }
        validarDataNascimento(dto.dataNascimento());

        String genero = texto(dto.genero()).toUpperCase();
        if (!GENEROS.contains(genero)) {
            throw new RegraNegocioException("Selecione o gênero.");
        }

        String celular = formatarCelular(dto.celular());
        if (celular == null) {
            throw new RegraNegocioException("Celular inválido: informe DDD e número, com 10 ou 11 dígitos.");
        }

        String email = texto(dto.email()).toLowerCase();
        if (!EMAIL.matcher(email).matches()) {
            throw new RegraNegocioException("E-mail inválido.");
        }

        validarSenha(dto.senha());

        String cidade = texto(dto.cidade());
        if (cidade.isEmpty() || cidade.length() > 100) {
            throw new RegraNegocioException("Informe a cidade.");
        }
        String estado = texto(dto.estado()).toUpperCase();
        if (!UFS.contains(estado)) {
            throw new RegraNegocioException("UF inválida.");
        }
        String nomeBox = texto(dto.nomeBox());
        if (nomeBox.isEmpty() || nomeBox.length() > 100) {
            throw new RegraNegocioException("Informe o box ou organização (até 100 caracteres).");
        }

        return new DadosCadastro(nome, formatarCpf(dto.cpf()), dto.dataNascimento(), genero, celular,
                email, dto.senha(), cidade, estado, nomeBox, perfil);
    }

    public static void validarSenha(String senha) {
        if (senha == null || senha.length() < TAMANHO_MINIMO_SENHA) {
            throw new RegraNegocioException("A senha deve ter pelo menos " + TAMANHO_MINIMO_SENHA + " caracteres.");
        }
    }

    /** CPF com 11 dígitos, que não seja uma sequência repetida e com os dois dígitos verificadores corretos. */
    public static boolean cpfValido(String cpf) {
        String d = cpf == null ? "" : cpf.replaceAll("\\D", "");
        if (d.length() != 11 || d.chars().distinct().count() == 1) {
            return false;
        }
        return digitoVerificador(d, 9) == d.charAt(9) - '0' && digitoVerificador(d, 10) == d.charAt(10) - '0';
    }

    private static int digitoVerificador(String digitos, int quantidade) {
        int soma = 0;
        for (int i = 0; i < quantidade; i++) {
            soma += (digitos.charAt(i) - '0') * (quantidade + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    /** 12345678909 → 123.456.789-09 (pressupõe 11 dígitos). */
    public static String formatarCpf(String cpf) {
        String d = cpf.replaceAll("\\D", "");
        return d.substring(0, 3) + "." + d.substring(3, 6) + "." + d.substring(6, 9) + "-" + d.substring(9);
    }

    /** (DD) NNNNN-NNNN para celular ou (DD) NNNN-NNNN para fixo; nulo se não tiver 10 ou 11 dígitos. */
    public static String formatarCelular(String celular) {
        String d = celular == null ? "" : celular.replaceAll("\\D", "");
        if (d.length() == 11) return "(" + d.substring(0, 2) + ") " + d.substring(2, 7) + "-" + d.substring(7);
        if (d.length() == 10) return "(" + d.substring(0, 2) + ") " + d.substring(2, 6) + "-" + d.substring(6);
        return null;
    }

    private static void validarDataNascimento(LocalDate data) {
        if (data == null || !data.isBefore(LocalDate.now()) || data.isBefore(LocalDate.of(1900, 1, 1))) {
            throw new RegraNegocioException("Informe uma data de nascimento válida.");
        }
    }

    private static String texto(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
