import { useState, useEffect } from 'react';
import api, { mensagemDeErro } from '../api';
import Alerta from './Alerta';

function dataHoraBr(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
}

/**
 * Painel do administrador: pedidos dos atletas para desfazer um vínculo com o histórico depois do prazo livre.
 * Aprovar desfaz o vínculo (e a competição deixa de contar na auditoria do atleta); recusar mantém.
 */
export default function PedidosDesvinculo() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    api.get('/admin/pedidos-desvinculo')
      .then(({ data }) => setPedidos(data || []))
      .catch(() => setMensagem({ tipo: 'erro', texto: 'Erro ao carregar os pedidos de desvínculo.' }))
      .finally(() => setCarregando(false));
  }, []);

  const decidir = async (pedido, aprovar) => {
    setProcessando(pedido.id);
    try {
      const { data } = await api.post(`/admin/pedidos-desvinculo/${pedido.id}/${aprovar ? 'aprovar' : 'recusar'}`);
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
      setMensagem({ tipo: 'sucesso', texto: `${pedido.atletaNome}: ${data}` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(err, 'Não foi possível registrar a decisão.') });
    } finally {
      setProcessando(null);
    }
  };

  if (carregando || (pedidos.length === 0 && !mensagem.texto)) return null;

  return (
    <section style={styles.card}>
      <div style={styles.cabecalho}>
        <h2 style={styles.titulo}>Pedidos de desvínculo do histórico</h2>
        <span style={styles.total}>{pedidos.length} pendente(s)</span>
      </div>
      <p style={styles.explicacao}>
        O atleta diz que a competição vinculada à conta dele não é dele. Aprovar desfaz o vínculo e a competição deixa
        de contar na auditoria de elegibilidade; recusar mantém o vínculo.
      </p>

      <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>

      {pedidos.map((p) => (
        <div key={p.id} style={styles.pedido}>
          <div style={styles.info}>
            <div style={styles.atleta}>{p.atletaNome} <span style={styles.email}>#{p.atletaId} • {p.atletaEmail}</span></div>
            <div style={styles.competicao}>
              {p.nomeCompeticao} • {p.categoria}{p.colocacao ? ` • ${p.colocacao}º lugar` : ''}
              <span style={styles.detalhe}> (registrado como "{p.nomeNoHistorico}"{p.boxOrigem ? `, ${p.boxOrigem}` : ''})</span>
            </div>
            <div style={styles.motivo}>“{p.motivo}”</div>
            <div style={styles.detalhe}>Pedido em {dataHoraBr(p.dataPedido)}</div>
          </div>
          <div style={styles.acoes}>
            <button type="button" className="botao botao-verde" onClick={() => decidir(p, true)} disabled={processando === p.id}>
              Aprovar
            </button>
            <button type="button" className="botao botao-secundario" onClick={() => decidir(p, false)} disabled={processando === p.id}>
              Recusar
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

const styles = {
  card: {
    backgroundColor: '#111418',
    borderRadius: '12px',
    border: '1px solid rgba(255, 165, 0, 0.35)',
    padding: '20px',
    marginBottom: '24px',
  },
  cabecalho: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  titulo: {
    fontSize: '1.1rem',
    fontWeight: '800',
    margin: 0,
    color: '#ffa500',
  },
  total: {
    color: '#ffa500',
    fontSize: '0.8rem',
    fontWeight: '700',
  },
  explicacao: {
    color: '#718096',
    fontSize: '0.8rem',
    margin: '6px 0 14px',
  },
  pedido: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: '#0d1117',
    border: '1px solid #21262d',
    marginBottom: '8px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  atleta: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  email: {
    color: '#718096',
    fontWeight: '500',
    fontSize: '0.78rem',
  },
  competicao: {
    color: '#cbd5e0',
    fontSize: '0.84rem',
  },
  motivo: {
    color: '#e2e8f0',
    fontSize: '0.84rem',
    fontStyle: 'italic',
  },
  detalhe: {
    color: '#718096',
    fontSize: '0.76rem',
  },
  acoes: {
    display: 'flex',
    gap: '8px',
  },
};
