import { useState, useEffect } from 'react';
import api from '../api';
import Alerta from './Alerta';

/**
 * Competições registradas com um nome no histórico, para o atleta marcar quais são dele.
 * Um mesmo nome pode ser de pessoas diferentes (homônimos), por isso a escolha é por competição.
 * As livres vêm marcadas; as já vinculadas ao atleta ou à conta de outra pessoa não podem ser alteradas.
 *
 * @param nome        nome exatamente como aparece no histórico
 * @param onConfirmar recebe { ids, recusados }: competições marcadas e desmarcadas
 * @param onVoltar    volta para a etapa anterior (lista de nomes)
 */
export default function SeletorCompeticoes({ nome, onConfirmar, onVoltar, processando = false }) {
  const [competicoes, setCompeticoes] = useState([]);
  const [marcadas, setMarcadas] = useState(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/atletas/historico/competicoes', { params: { nome } })
      .then(({ data }) => {
        setCompeticoes(data || []);
        setMarcadas(new Set((data || []).filter((c) => c.situacao === 'LIVRE').map((c) => c.id)));
      })
      .catch(() => setErro('Não foi possível carregar as competições deste nome.'))
      .finally(() => setCarregando(false));
  }, [nome]);

  const livres = competicoes.filter((c) => c.situacao === 'LIVRE');

  const alternar = (id) => {
    setMarcadas((anteriores) => {
      const novas = new Set(anteriores);
      if (novas.has(id)) novas.delete(id);
      else novas.add(id);
      return novas;
    });
  };

  const marcarTodas = (marcar) => setMarcadas(new Set(marcar ? livres.map((c) => c.id) : []));

  const confirmar = () => onConfirmar({
    ids: livres.filter((c) => marcadas.has(c.id)).map((c) => c.id),
    recusados: livres.filter((c) => !marcadas.has(c.id)).map((c) => c.id),
  });

  if (carregando) return <p style={styles.texto}>Carregando competições…</p>;

  return (
    <div>
      <p style={styles.texto}>
        Competições registradas como <strong>{nome}</strong>. Pessoas diferentes podem ter o mesmo nome:
        <strong> desmarque as que não são suas</strong>. Você poderá desfazer um vínculo em até 24 horas;
        depois disso, só com pedido ao administrador.
      </p>

      <Alerta tipo="erro">{erro}</Alerta>

      {livres.length > 1 && (
        <div style={styles.atalhos}>
          <button type="button" className="link-botao" style={styles.atalho} onClick={() => marcarTodas(true)}>Marcar todas</button>
          <button type="button" className="link-botao" style={styles.atalho} onClick={() => marcarTodas(false)}>Desmarcar todas</button>
        </div>
      )}

      <div style={styles.lista}>
        {competicoes.map((c) => {
          const livre = c.situacao === 'LIVRE';
          return (
            <label key={c.id} style={{ ...styles.item, opacity: livre ? 1 : 0.55, cursor: livre ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={livre ? marcadas.has(c.id) : c.situacao === 'MINHA'}
                disabled={!livre}
                onChange={() => alternar(c.id)}
                style={styles.caixa}
              />
              <span>
                <span style={styles.competicao}>{c.nomeCompeticao}</span>
                <span style={styles.detalhe}>
                  {c.categoria}{c.colocacao ? ` • ${c.colocacao}º lugar` : ''}{c.boxOrigem ? ` • ${c.boxOrigem}` : ''}
                </span>
                {c.situacao === 'MINHA' && <span style={{ ...styles.situacao, color: '#00ff88' }}>Já vinculada a você</span>}
                {c.situacao === 'OUTRA_CONTA' && <span style={{ ...styles.situacao, color: '#ffa500' }}>Vinculada à conta de outra pessoa</span>}
              </span>
            </label>
          );
        })}
      </div>

      <div className="modal-acoes">
        <button type="button" className="botao botao-secundario" onClick={onVoltar} disabled={processando}>Voltar</button>
        <button type="button" className="botao botao-verde" onClick={confirmar} disabled={processando || livres.length === 0}>
          {processando
            ? 'Vinculando...'
            : marcadas.size === 0
              ? 'Nenhuma destas é minha'
              : `Vincular ${marcadas.size} competição(ões)`}
        </button>
      </div>
    </div>
  );
}

const styles = {
  texto: {
    color: '#cbd5e0',
    fontSize: '0.86rem',
    lineHeight: '1.5',
    marginTop: 0,
  },
  atalhos: {
    display: 'flex',
    gap: '14px',
    marginBottom: '8px',
  },
  atalho: {
    color: '#00bfff',
    fontSize: '0.78rem',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '45vh',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: '#0d1117',
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid #21262d',
  },
  caixa: {
    marginTop: '3px',
    accentColor: '#238636',
  },
  competicao: {
    display: 'block',
    color: '#f0f6fc',
    fontSize: '0.86rem',
    fontWeight: 'bold',
  },
  detalhe: {
    display: 'block',
    color: '#8b949e',
    fontSize: '0.76rem',
  },
  situacao: {
    display: 'block',
    fontSize: '0.74rem',
    fontWeight: 700,
    marginTop: '2px',
  },
};
