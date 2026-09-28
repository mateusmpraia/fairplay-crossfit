package br.com.uff.fairplay.model;

/**
 * Níveis de competição. A escada de promoção é Iniciante → Scale → Intermediário → RX → Elite.
 * Elite é o topo (campeão Elite continua Elite) e Master é uma categoria à parte, sem promoção.
 */
public enum CategoriaCompeticao {
    INICIANTE("Iniciante", 0),
    SCALE("Scale", 1),
    INTERMEDIARIO("Intermediário", 2),
    RX("RX", 3),
    ELITE("Elite", 4),
    MASTER("Master", 5);

    private final String descricao;
    private final int nivel;

    CategoriaCompeticao(String descricao, int nivel) {
        this.descricao = descricao;
        this.nivel = nivel;
    }

    public String getDescricao() {
        return descricao;
    }

    public int getNivel() {
        return nivel;
    }

    public static CategoriaCompeticao fromString(String valor) {
        if (valor == null) return null;
        for (CategoriaCompeticao cat : values()) {
            if (cat.name().equalsIgnoreCase(valor) || cat.descricao.equalsIgnoreCase(valor)) {
                return cat;
            }
        }
        return null;
    }

    /** Categoria para a qual o atleta é promovido. Elite e Master não sobem: devolvem a própria categoria. */
    public CategoriaCompeticao getProxima() {
        return switch (this) {
            case INICIANTE -> SCALE;
            case SCALE -> INTERMEDIARIO;
            case INTERMEDIARIO -> RX;
            case RX -> ELITE;
            case ELITE, MASTER -> this;
        };
    }

    /** Se existe categoria acima desta na escada de promoção. */
    public boolean temProxima() {
        return getProxima() != this;
    }

    /**
     * Se esta categoria é igual ou está acima de {@code outra} na escada de promoção.
     * Master fica fora da escada: não está acima de nenhuma outra categoria.
     */
    public boolean igualOuAcimaDe(CategoriaCompeticao outra) {
        if (this == outra) return true;
        return this != MASTER && outra != MASTER && this.ordinal() > outra.ordinal();
    }
}
