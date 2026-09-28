package br.com.uff.fairplay.exception;

/** O usuário está logado, mas o registro pertence a outra pessoa. Vira HTTP 403 com a mensagem no corpo. */
public class AcessoNegadoException extends RuntimeException {

    public AcessoNegadoException(String mensagem) {
        super(mensagem);
    }
}
