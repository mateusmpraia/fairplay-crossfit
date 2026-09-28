package br.com.uff.fairplay.config;

import br.com.uff.fairplay.security.FiltroToken;
import br.com.uff.fairplay.security.SessaoService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Rotas públicas: login, cadastro, sugestões do histórico e recuperação de senha (usadas sem conta ou sem login).
     * As demais exigem o token de sessão do perfil correspondente.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, SessaoService sessaoService) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(new FiltroToken(sessaoService), UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) ->
                    responderTexto(res, HttpServletResponse.SC_UNAUTHORIZED, "Sessão expirada ou inválida. Faça login novamente."))
                .accessDeniedHandler((req, res, ex) ->
                    responderTexto(res, HttpServletResponse.SC_FORBIDDEN, "Seu perfil não tem acesso a esta operação.")))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Página de erro do Spring: sem isso, qualquer erro (400, 500...) viraria 401
                .requestMatchers("/error").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/atletas/login", "/api/atletas/cadastro", "/api/admin/usuarios/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/atletas/historico/sugestoes").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/conta/recuperar-senha", "/api/conta/redefinir-senha").permitAll()
                .requestMatchers("/api/conta/**").hasAnyRole("ATLETA", "ORGANIZADOR")
                .requestMatchers("/api/sessao/**").authenticated()
                .requestMatchers("/api/admin/**").hasRole("MASTER_ADMIN")
                .requestMatchers("/api/eventos/**").hasRole("ORGANIZADOR")
                .requestMatchers(HttpMethod.POST, "/api/atletas/*/resultados").hasRole("MASTER_ADMIN")
                .requestMatchers("/api/atletas/**").hasRole("ATLETA")
                .anyRequest().denyAll());

        return http.build();
    }

    /** Hash das senhas dos usuários (BCrypt). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private static void responderTexto(HttpServletResponse res, int status, String mensagem) throws IOException {
        res.setStatus(status);
        res.setContentType("text/plain;charset=UTF-8");
        res.getWriter().write(mensagem);
    }
}
