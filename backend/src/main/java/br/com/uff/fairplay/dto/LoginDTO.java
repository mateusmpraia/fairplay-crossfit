package br.com.uff.fairplay.dto;

public record LoginDTO(
    String login,    // E-mail ou CPF
    String senha,
    String perfil    // "ATLETA" ou "ORGANIZADOR"
) {}