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
    String perfil,              // "ATLETA" (padrão) ou "ORGANIZADOR"
    String historicoNomeAtleta  // opcional: nome do perfil do histórico que o atleta escolheu vincular
) {}
