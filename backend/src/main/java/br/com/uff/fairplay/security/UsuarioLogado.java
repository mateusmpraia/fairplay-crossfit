package br.com.uff.fairplay.security;

/**
 * Usuário autenticado na requisição atual. Nos controllers, é obtido com {@code @AuthenticationPrincipal}.
 *
 * @param id     id do atleta/organizador (nulo para o administrador master)
 * @param perfil ATLETA, ORGANIZADOR ou MASTER_ADMIN
 */
public record UsuarioLogado(Long id, String perfil) {}
