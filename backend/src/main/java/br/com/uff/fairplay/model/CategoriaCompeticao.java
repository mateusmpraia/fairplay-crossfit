package br.com.uff.fairplay.model;

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

    public CategoriaCompeticao getProxima() {
        // Elite e Master não possuem próxima categoria automática
        return switch (this) {
            case INICIANTE -> SCALE;
            case SCALE -> INTERMEDIARIO;
            case INTERMEDIARIO -> RX;
            case RX -> ELITE;
            default -> this;
        };
    }
}