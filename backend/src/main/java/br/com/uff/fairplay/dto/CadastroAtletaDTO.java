package br.com.uff.fairplay.dto;

import java.time.LocalDate;

public record CadastroAtletaDTO(
    String nomeCompleto,
    String cpf,
    LocalDate dataNascimento,
    String genero,
    String celular,
    String email,
    String senha,
    String cidade,
    String estado,
    String nomeBox,
    String perfil,
    String historicoNomeAtleta, // Opcional: preenchido quando o atleta seleciona o perfil histórico
    String historicoBoxOrigem   // Opcional: preenchido quando o atleta seleciona o perfil histórico
) {}