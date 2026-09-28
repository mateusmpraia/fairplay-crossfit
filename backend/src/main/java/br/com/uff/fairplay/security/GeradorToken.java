package br.com.uff.fairplay.security;

import java.security.SecureRandom;
import java.util.Base64;

/** Tokens aleatórios e impossíveis de adivinhar, usados nas sessões e nos links de recuperação de senha. */
public final class GeradorToken {

    private static final SecureRandom RANDOM = new SecureRandom();

    private GeradorToken() {}

    /** 32 bytes aleatórios em Base64 (43 caracteres, seguros para usar em URLs). */
    public static String novo() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
