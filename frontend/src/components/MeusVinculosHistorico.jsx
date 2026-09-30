import { useState, useEffect, useCallback } from 'react';
import api, { mensagemDeErro } from '../api';
import Modal from './Modal';
import Alerta from './Alerta';
import ListaSugestoes from './ListaSugestoes';
import SeletorCompeticoes from './SeletorCompeticoes';

/** "5 h" ou "40 min": tempo que resta para o atleta desfazer um vínculo sozinho. */
function tempoRestante(minutos) {
  return minutos >= 60 ? `${Math.ceil(minutos / 60)} h` : `${minutos} min`;
}

/** Agrupa os vínculos pelo nome com que o atleta aparece no histórico. */
function agruparPorNome(vinculos) {
  const grupos = new Map();
  vinculos.forEach((v) => grupos.set(v.nomeAtleta, [...(grupos.get(v.nomeAtleta) || []), v]));
  return [...grupos.entries()];
}

/**
 * Painel do atleta: competições do histórico importado vinculadas a ele, agrupadas por nome.
 * O atleta pode vincular outros nomes (a mesma pessoa pode ter se inscrito de formas diferentes),
 * desfazer um vínculo dentro do prazo livre e, depois dele, pedir o desvínculo ao administrador.
 *
 * @param onAlterado chamado depois de vincular ou desvincular, para o painel recarregar o histórico
 */
export default function MeusVinculosHistorico({ atletaId, onAlterado }) {
  const [vinculos, setVinculos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [processando, setProcessando] = useState(false);

  // Modal "vincular outro nome": busca por nome e, depois, a escolha das competições
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState('');
  // Sugestões e o termo a que se referem: enquanto não batem com o que está digitado, a busca está em andamento
  const [resultado, setResultado] = useState({ termo: '', sugestoes: [] });
  const [nomeEmAnalise, setNomeEmAnalise] = useState(null);

  // Modal de pedido de desvínculo ao administrador
  const [pedidoPara, setPedidoPara] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [erroPedido, setErroPedido] = useState('');

  const carregar = useCallback(() => (
    api.get(`/atletas/${atletaId}/vinculos`)
      .then(({ data }) => setVinculos(data || []))
      .catch(() => setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar os seus vínculos com o histórico.' }))
      .finally(() => setCarregando(false))
  ), [atletaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const aposAlterar = async (texto) => {
    await carregar();
    onAlterado?.();
    setMensagem({ tipo: 'sucesso', texto });
  };

  // Busca de nomes parecidos enquanto o atleta digita (com atraso de 400 ms)
  const termoLimpo = termo.trim();
  useEffect(() => {
    if (!buscaAberta || termoLimpo.length < 3) return;
    const timer = setTimeout(() => {
      api.get('/atletas/historico/sugestoes', { params: { nome: termoLimpo } })
        .then(({ data }) => setResultado({ termo: termoLimpo, sugestoes: data || [] }))
        .catch(() => setResultado({ termo: termoLimpo, sugestoes: [] }));
    }, 400);
    return () => clearTimeout(timer);
  }, [termoLimpo, buscaAberta]);
  const buscando = resultado.termo !== termoLimpo;

  const abrirBusca = () => {
    setTermo('');
    setNomeEmAnalise(null);
    setBuscaAberta(true);
  };

  const fecharBusca = () => {
    setBuscaAberta(false);
    setNomeEmAnalise(null);
  };

  const vincular = async ({ ids, recusados }) => {
    setProcessando(true);
    try {
      const { data } = await api.post(`/atletas/${atletaId}/vinculos`, { historicoIds: ids, recusadosIds: recusados });
      fecharBusca();
      const ocupadas = data.vinculadasAOutraConta?.length || 0;
      await aposAlterar(
        ids.length === 0
          ? 'Tudo certo: registramos que essas competições não são suas.'
          : `${data.vinculadas} competição(ões) vinculada(s) à sua conta.${ocupadas ? ` ${ocupadas} já estava(m) vinculada(s) a outra conta e ficou(aram) de fora.` : ''}`
      );
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(err, 'Não foi possível vincular as competições.') });
      fecharBusca();
    } finally {
      setProcessando(false);
    }
  };

  const desfazer = async (vinculo) => {
    setProcessando(true);
    try {
      await api.delete(`/atletas/${atletaId}/vinculos/${vinculo.historicoId}`);
      await aposAlterar(`Vínculo com "${vinculo.nomeCompeticao}" desfeito.`);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(err, 'Não foi possível desfazer o vínculo.') });
    } finally {
      setProcessando(false);
    }
  };

  const abrirPedido = (vinculo) => {
    setPedidoPara(vinculo);
    setMotivo('');
    setErroPedido('');
  };

  const enviarPedido = async (e) => {
    e.preventDefault();
    setProcessando(true);
    setErroPedido('');
    try {
      await api.post(`/atletas/${atletaId}/vinculos/${pedidoPara.historicoId}/pedido-desvinculo`, { motivo });
      setPedidoPara(null);
      await carregar();
      setMensagem({ tipo: 'sucesso', texto: 'Pedido enviado. O administrador vai analisar e decidir se o vínculo será desfeito.' });
    } catch (err) {
      setErroPedido(mensagemDeErro(err, 'Não foi possível enviar o pedido.'));
    } finally {
      setProcessando(false);
    }
  };

  const grupos = agruparPorNome(vinculos);

  return (
    <section style={styles.card}>
      <div style={styles.cabecalho}>
        <div>
          <h2 style={styles.titulo}>Meus nomes em competições</h2>
          <p style={styles.subtitulo}>
            Se você se inscreveu com nomes diferentes em cada campeonato, vincule todos para reunir o seu histórico.
            Um vínculo pode ser desfeito em até 24 horas; depois disso, só com pedido ao administrador.
          </p>
        </div>
        <button type="button" className="botao botao-verde" onClick={abrirBusca}>+ Vincular outro nome</button>
      </div>

      <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>

      {carregando ? (
        <p style={styles.vazio}>Carregando…</p>
      ) : grupos.length === 0 ? (
        <p style={styles.vazio}>Nenhuma competição do histórico vinculada à sua conta ainda.</p>
      ) : (
        grupos.map(([nome, itens]) => (
          <div key={nome} style={styles.grupo}>
            <div style={styles.grupoNome}>{nome} <span style={styles.grupoTotal}>• {itens.length} competição(ões)</span></div>
            {itens.map((v) => (
              <div key={v.historicoId} style={styles.linha}>
                <div>
                  <div style={styles.competicao}>{v.nomeCompeticao}</div>
                  <div style={styles.detalhe}>
                    {v.categoria}{v.colocacao ? ` • ${v.colocacao}º lugar` : ''}{v.boxOrigem ? ` • ${v.boxOrigem}` : ''}
                  </div>
                </div>
                <div style={styles.acao}>
                  {v.minutosParaDesfazer > 0 ? (
                    <>
                      <button type="button" className="botao botao-secundario" onClick={() => desfazer(v)} disabled={processando}>
                        Desfazer
                      </button>
                      <small style={styles.prazo}>ainda {tempoRestante(v.minutosParaDesfazer)}</small>
                    </>
                  ) : v.statusPedido === 'PENDENTE' ? (
                    <span style={styles.emAnalise}>Pedido em análise</span>
                  ) : (
                    <>
                      <button type="button" className="botao botao-secundario" onClick={() => abrirPedido(v)} disabled={processando}>
                        Pedir desvínculo
                      </button>
                      {v.statusPedido === 'RECUSADO' && <small style={styles.recusado}>Pedido anterior recusado</small>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {buscaAberta && (
        <Modal
          titulo={nomeEmAnalise ? 'Quais competições são suas?' : 'Vincular outro nome'}
          corTitulo="#00ff88"
          largura={560}
          onFechar={fecharBusca}
          bloqueado={processando}
        >
          {nomeEmAnalise ? (
            <SeletorCompeticoes
              nome={nomeEmAnalise.nomeAtleta}
              onConfirmar={vincular}
              onVoltar={() => setNomeEmAnalise(null)}
              processando={processando}
            />
          ) : (
            <>
              <label className="campo" style={{ marginBottom: '12px' }}>
                <span className="campo-rotulo">Como seu nome aparecia na inscrição</span>
                <input
                  type="text"
                  className="campo-entrada"
                  placeholder="Ex.: Ana P. Souza"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </label>
              {termoLimpo.length < 3 ? (
                <p style={styles.dica}>Digite pelo menos 3 letras.</p>
              ) : buscando ? (
                <p style={styles.dica}>Procurando…</p>
              ) : resultado.sugestoes.length === 0 ? (
                <p style={styles.dica}>Nenhum nome parecido encontrado no histórico.</p>
              ) : (
                <ListaSugestoes sugestoes={resultado.sugestoes} onEscolher={setNomeEmAnalise} />
              )}
            </>
          )}
        </Modal>
      )}

      {pedidoPara && (
        <Modal titulo="Pedir desvínculo" corTitulo="#ffa500" largura={480} onFechar={() => setPedidoPara(null)} bloqueado={processando}>
          <p style={styles.textoModal}>
            O prazo para desfazer o vínculo com <strong>{pedidoPara.nomeCompeticao}</strong> ({pedidoPara.categoria}) terminou.
            Explique por que essa competição não é sua; o administrador vai analisar o pedido.
          </p>
          <Alerta tipo="erro">{erroPedido}</Alerta>
          <form onSubmit={enviarPedido}>
            <label className="campo">
              <span className="campo-rotulo">Motivo</span>
              <textarea
                className="campo-entrada"
                rows={4}
                maxLength={500}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: é de outra pessoa com o mesmo nome; eu nunca competi em Goiânia."
                required
              />
            </label>
            <div className="modal-acoes">
              <button type="button" className="botao botao-secundario" onClick={() => setPedidoPara(null)} disabled={processando}>Cancelar</button>
              <button type="submit" className="botao botao-verde" disabled={processando}>
                {processando ? 'Enviando...' : 'Enviar pedido'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

const styles = {
  card: {
    backgroundColor: '#111418',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #22272e',
  },
  cabecalho: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
  },
  titulo: {
    fontSize: '1.2rem',
    fontWeight: '700',
    margin: 0,
  },
  subtitulo: {
    color: '#718096',
    fontSize: '0.8rem',
    margin: '6px 0 0',
    maxWidth: '640px',
    lineHeight: '1.5',
  },
  vazio: {
    color: '#718096',
    padding: '12px 0',
    textAlign: 'center',
  },
  grupo: {
    marginBottom: '16px',
  },
  grupoNome: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '0.92rem',
    marginBottom: '8px',
  },
  grupoTotal: {
    color: '#718096',
    fontWeight: '500',
    fontSize: '0.8rem',
  },
  linha: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#0d1117',
    border: '1px solid #1a202c',
    marginBottom: '6px',
  },
  competicao: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: '0.88rem',
  },
  detalhe: {
    color: '#8b949e',
    fontSize: '0.76rem',
    marginTop: '2px',
  },
  acao: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  prazo: {
    color: '#718096',
    fontSize: '0.72rem',
  },
  emAnalise: {
    color: '#ffa500',
    fontSize: '0.78rem',
    fontWeight: '700',
    border: '1px solid rgba(255, 165, 0, 0.4)',
    borderRadius: '6px',
    padding: '4px 10px',
  },
  recusado: {
    color: '#ff6b6b',
    fontSize: '0.72rem',
  },
  dica: {
    color: '#718096',
    fontSize: '0.82rem',
  },
  textoModal: {
    color: '#cbd5e0',
    fontSize: '0.88rem',
    lineHeight: '1.5',
    marginTop: 0,
  },
};
