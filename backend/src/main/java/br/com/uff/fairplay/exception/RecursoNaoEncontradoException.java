package br.com.uff.fairplay.exception;

/** Registro pedido não existe. Vira HTTP 404 com a mensagem no corpo. */
public class RecursoNaoEncontradoException extends RuntimeException {

    public RecursoNaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
