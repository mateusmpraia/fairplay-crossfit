package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.CadastroAtletaDTO;
import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.service.ValidacaoCadastro.DadosCadastro;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ValidacaoCadastroTest {

    private static CadastroAtletaDTO cadastro(String cpf, String celular, String email, String estado, String senha,
                                              String genero, LocalDate nascimento) {
        return new CadastroAtletaDTO("  Ana Souza ", cpf, nascimento, genero, celular, email, senha,
                "Niterói", estado, "Box Teste", "ATLETA", null, null);
    }

    private static CadastroAtletaDTO valido() {
        return cadastro("529.982.247-25", "21999998888", " Ana@Email.com ", "rj", "segredo1", "feminino", LocalDate.of(1995, 5, 10));
    }

    @Test
    void cpfComDigitosVerificadoresCorretos() {
        assertThat(ValidacaoCadastro.cpfValido("529.982.247-25")).isTrue();
        assertThat(ValidacaoCadastro.cpfValido("52998224725")).isTrue();
    }

    @Test
    void cpfInvalido() {
        assertThat(ValidacaoCadastro.cpfValido("529.982.247-26")).isFalse();
        assertThat(ValidacaoCadastro.cpfValido("111.111.111-11")).isFalse();
        assertThat(ValidacaoCadastro.cpfValido("123")).isFalse();
        assertThat(ValidacaoCadastro.cpfValido(null)).isFalse();
    }

    @Test
    void padronizaOsDados() {
        DadosCadastro dados = ValidacaoCadastro.validar(valido());
        assertThat(dados.nomeCompleto()).isEqualTo("Ana Souza");
        assertThat(dados.cpf()).isEqualTo("529.982.247-25");
        assertThat(dados.celular()).isEqualTo("(21) 99999-8888");
        assertThat(dados.email()).isEqualTo("ana@email.com");
        assertThat(dados.estado()).isEqualTo("RJ");
        assertThat(dados.genero()).isEqualTo("FEMININO");
    }

    @Test
    void aceitaTelefoneFixoComDezDigitos() {
        assertThat(ValidacaoCadastro.formatarCelular("2122223333")).isEqualTo("(21) 2222-3333");
    }

    @Test
    void aceitaGeneroOutro() {
        CadastroAtletaDTO dto = cadastro("529.982.247-25", "21999998888", "a@b.com", "RJ", "segredo1", "OUTRO", LocalDate.of(1995, 5, 10));
        assertThat(ValidacaoCadastro.validar(dto).genero()).isEqualTo("OUTRO");
    }

    @Test
    void recusaDadosInvalidos() {
        LocalDate nascimento = LocalDate.of(1995, 5, 10);
        assertThatThrownBy(() -> ValidacaoCadastro.validar(cadastro("111.111.111-11", "21999998888", "a@b.com", "RJ", "segredo1", "OUTRO", nascimento)))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("CPF");
        assertThatThrownBy(() -> ValidacaoCadastro.validar(cadastro("529.982.247-25", "999", "a@b.com", "RJ", "segredo1", "OUTRO", nascimento)))
                .hasMessageContaining("Celular");
        assertThatThrownBy(() -> ValidacaoCadastro.validar(cadastro("529.982.247-25", "21999998888", "sem-arroba", "RJ", "segredo1", "OUTRO", nascimento)))
                .hasMessageContaining("E-mail");
        assertThatThrownBy(() -> ValidacaoCadastro.validar(cadastro("529.982.247-25", "21999998888", "a@b.com", "XX", "segredo1", "OUTRO", nascimento)))
                .hasMessageContaining("UF");
        assertThatThrownBy(() -> ValidacaoCadastro.validar(cadastro("529.982.247-25", "21999998888", "a@b.com", "RJ", "123", "OUTRO", nascimento)))
                .hasMessageContaining("senha");
        assertThatThrownBy(() -> ValidacaoCadastro.validar(cadastro("529.982.247-25", "21999998888", "a@b.com", "RJ", "segredo1", "", nascimento)))
                .hasMessageContaining("gênero");
        assertThatThrownBy(() -> ValidacaoCadastro.validar(cadastro("529.982.247-25", "21999998888", "a@b.com", "RJ", "segredo1", "OUTRO", LocalDate.now().plusDays(1))))
                .hasMessageContaining("nascimento");
    }
}
