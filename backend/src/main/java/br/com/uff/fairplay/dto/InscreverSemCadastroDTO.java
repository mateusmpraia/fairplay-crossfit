package br.com.uff.fairplay.dto;

/**
 * Inscrição de um atleta que não tem cadastro nem histórico no sistema.
 *
 * @param cpf    opcional: se informado, a pessoa assume as inscrições ao se cadastrar com esse CPF
 * @param genero MASCULINO, FEMININO ou OUTRO; obrigatório em categorias mistas (nas demais, vem da categoria)
 * @param nomeBox opcional ("Sem Box" se vazio)
 */
public record InscreverSemCadastroDTO(
    Long categoriaEventoId,
    String nomeCompleto,
    String cpf,
    String genero,
    String nomeBox
) {}
