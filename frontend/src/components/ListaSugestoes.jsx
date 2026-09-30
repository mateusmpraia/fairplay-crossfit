/** Nomes do histórico parecidos com o do atleta, cada um com o botão para ver as competições e vincular. */
export default function ListaSugestoes({ sugestoes, onEscolher, textoBotao = 'É você? Ver competições' }) {
  return (
    <div style={styles.lista}>
      {sugestoes.map((item) => (
        <div key={item.nomeAtleta} style={styles.item}>
          <div>
            <div style={styles.nome}>{item.nomeAtleta}</div>
            <div style={styles.detalhe}>
              Box: <strong>{item.boxOrigem || 'N/D'}</strong> • {item.totalCompeticoes} competição(ões)
            </div>
          </div>
          <button type="button" onClick={() => onEscolher(item)} style={styles.botao}>
            {textoBotao}
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#0d1117',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #21262d',
  },
  nome: {
    color: '#f0f6fc',
    fontSize: '0.88rem',
    fontWeight: 'bold',
  },
  detalhe: {
    color: '#8b949e',
    fontSize: '0.78rem',
  },
  botao: {
    backgroundColor: '#238636',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
