package br.com.uff.fairplay.service.historico;

/** De onde veio um resultado de competição (o nome é enviado ao painel do atleta). */
public enum Origem {
    /** Colocação lançada pelo organizador num evento do próprio FairPlay. */
    EVENTO,
    /** Resultado importado de competições externas (tabela historico_atletas). */
    HISTORICO
}
