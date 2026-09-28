package br.com.uff.fairplay.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Lê o cabeçalho {@code Authorization: Bearer <token>} e, se a sessão for válida, autentica a requisição
 * com o papel {@code ROLE_<PERFIL>}. Sem token válido a requisição segue anônima e as regras do
 * {@code SecurityConfig} decidem se ela pode continuar.
 */
public class FiltroToken extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final SessaoService sessaoService;

    public FiltroToken(SessaoService sessaoService) {
        this.sessaoService = sessaoService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String cabecalho = request.getHeader("Authorization");

        if (cabecalho != null && cabecalho.startsWith(PREFIXO)) {
            sessaoService.autenticar(cabecalho.substring(PREFIXO.length()).trim()).ifPresent(usuario -> {
                var autenticacao = new UsernamePasswordAuthenticationToken(
                        usuario, null, List.of(new SimpleGrantedAuthority("ROLE_" + usuario.perfil())));
                SecurityContextHolder.getContext().setAuthentication(autenticacao);
            });
        }

        chain.doFilter(request, response);
    }
}
