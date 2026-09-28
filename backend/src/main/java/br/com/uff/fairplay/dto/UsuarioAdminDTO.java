package br.com.uff.fairplay.dto;

import java.time.LocalDate;

public record UsuarioAdminDTO(
    Long id,
    String nomeCompleto,
    String email,
    String cpf,
    String celular,
    String nomeBox,
    String cidade,
    String estado,
    String perfil,
    LocalDate dataNascimento
) {}