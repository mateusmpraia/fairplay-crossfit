package br.com.uff.fairplay.service;

import br.com.uff.fairplay.model.CategoriaCompeticao;

/** Uma participação do atleta usada nas regras de categoria: em qual categoria competiu e em que colocação ficou. */
public record Participacao(CategoriaCompeticao categoria, int colocacao) {}
