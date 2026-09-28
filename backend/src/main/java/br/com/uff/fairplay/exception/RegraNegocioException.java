package br.com.uff.fairplay.exception;

/** Operação recusada por uma regra do sistema (ex.: atleta já inscrito). Vira HTTP 400 com a mensagem no corpo. */
public class RegraNegocioException extends RuntimeException {

    public RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
