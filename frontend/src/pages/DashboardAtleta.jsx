import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { encerrarSessao } from '../api';
import { dataIsoParaBr, dataIsoParaMesAno } from '../utils/formatacao';
import Modal from '../components/Modal';
import Alerta from '../components/Alerta';
import ModalTrocarSenha from '../components/ModalTrocarSenha';

/** Visual do selo de colocação para o pódio (1º, 2º e 3º lugares). */
const PODIO = {
  1: { texto: '🥇 1º Lugar (Campeão)', color: '#ffd700', backgroundColor: 'rgba(255, 215, 0, 0.12)', borderColor: '#ffd700' },
  2: { texto: '🥈 2º Lugar (Vice)', color: '#e2e8f0', backgroundColor: 'rgba(226, 232, 240, 0.12)', borderColor: '#cbd5e0' },
  3: { texto: '🥉 3º Lugar', color: '#cd7f32', backgroundColor: 'rgba(205, 127, 50, 0.12)', borderColor: '#cd7f32' },
};

/** De onde veio cada linha do histórico. */
const ORIGENS = {
  EVENTO: { texto: 'Evento FairPlay', cor: '#00ff88' },
  HISTORICO: { texto: 'Histórico importado', cor: '#8b949e' },
};

const NIVEIS = { INICIANTE: 'Iniciante', SCALE: 'Scale', INTERMEDIARIO: 'Intermediário', RX: 'RX', ELITE: 'Elite', MASTER: 'Master' };

function SeloColocacao({ colocacao }) {
  if (!colocacao) {
    return <span style={styles.rankBadge}>—</span>;
  }
  const podio = PODIO[colocacao];
  if (!podio) {
    return <span style={styles.rankBadge}>{colocacao}º Lugar</span>;
  }
  const { texto, ...cores } = podio;
  return <span style={{ ...styles.podioBadge, ...cores }}>{texto}</span>;
}

function SeloStatus({ status }) {
  const regular = status === 'REGULAR';
  return (
    <span style={{
      ...styles.statusBadge,
      backgroundColor: regular ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 68, 68, 0.12)',
      color: regular ? '#00ff88' : '#ff4444',
      borderColor: regular ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 68, 68, 0.4)',
    }}>
      {regular ? '● Regular' : '▲ Irregular'}
    </span>
  );
}

export default function DashboardAtleta() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Modais
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editBox, setEditBox] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [feedbackPerfil, setFeedbackPerfil] = useState({ tipo: '', texto: '' });

  // ID do atleta logado (a rota só abre com login de atleta)
  const atletaId = localStorage.getItem('atletaId');

  useEffect(() => {
    Promise.all([api.get(`/atletas/${atletaId}/dashboard`), api.get(`/atletas/${atletaId}/inscricoes`)])
      .then(([painel, minhasInscricoes]) => {
        setDashboardData(painel.data);
        setInscricoes(minhasInscricoes.data || []);
      })
      .catch(() => setErro('Não foi possível carregar os dados do atleta.'))
      .finally(() => setCarregando(false));
  }, [atletaId]);

  const abrirModalEditar = () => {
    setEditNome(dashboardData.nomeCompleto);
    setEditBox(dashboardData.nomeBox);
    setFeedbackPerfil({ tipo: '', texto: '' });
    setModalEditarAberto(true);
  };

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setSalvandoPerfil(true);
    setFeedbackPerfil({ tipo: '', texto: '' });

    try {
      const { data } = await api.put(`/atletas/${atletaId}/perfil`, {
        nomeCompleto: editNome,
        nomeBox: editBox
      });

      setDashboardData((prev) => ({ ...prev, nomeCompleto: data.nomeCompleto, nomeBox: data.nomeBox }));
      localStorage.setItem('usuarioNome', data.nomeCompleto);

      setFeedbackPerfil({ tipo: 'sucesso', texto: 'Dados atualizados com sucesso!' });
      setTimeout(() => {
        setModalEditarAberto(false);
        setFeedbackPerfil({ tipo: '', texto: '' });
      }, 900);
    } catch {
      setFeedbackPerfil({ tipo: 'erro', texto: 'Erro ao atualizar os dados do perfil.' });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleLogout = () => {
    encerrarSessao();
    navigate('/login');
  };

  if (carregando) {
    return (
      <div style={styles.loadingContainer}>
        <h2 style={{ color: '#00ff88' }}>Carregando dados do atleta...</h2>
      </div>
    );
  }

  if (erro || !dashboardData) {
    return (
      <div style={styles.loadingContainer}>
        <h2 style={{ color: '#ff4444' }}>{erro || 'Atleta não encontrado.'}</h2>
        <button onClick={() => navigate('/login')} className="botao botao-secundario">Voltar ao Login</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header className="barra-topo">
        <div style={styles.navLeft}>
          <span style={styles.brand}>FAIRPLAY</span>
          <span style={styles.roleBadge}>HISTÓRICO DO ATLETA</span>
        </div>

        <div className="barra-topo-acoes">
          <button onClick={abrirModalEditar} style={styles.btnEditarPerfil}>✏️ Editar Perfil</button>
          <button onClick={() => setModalSenhaAberto(true)} className="botao botao-secundario">🔑 Trocar senha</button>
          <button onClick={handleLogout} className="botao botao-secundario">Sair</button>
        </div>
      </header>

      <main className="conteudo-central" style={styles.mainContent}>

        <section style={styles.profileCentralBanner}>
          <span style={styles.profileBadge}>PERFIL DO ATLETA</span>
          <h1 style={styles.athleteNameCentral}>{dashboardData.nomeCompleto}</h1>
          <p style={styles.athleteBoxCentral}>📍 {dashboardData.nomeBox}{dashboardData.estado ? ` • ${dashboardData.estado}` : ''}</p>
        </section>

        <section style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Total de Campeonatos</span>
            <span style={{ ...styles.metricValue, color: '#00ff88' }}>{dashboardData.totalParticipacoes}</span>
            <span style={styles.metricDesc}>Competições disputadas</span>
          </div>

          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Pódios Conquistados</span>
            <span style={{ ...styles.metricValue, color: '#ffd700' }}>{dashboardData.totalPodios}</span>
            <span style={styles.metricDesc}>1º, 2º ou 3º lugares</span>
          </div>

          <div style={{ ...styles.metricCard, borderLeft: '4px solid #00bfff' }}>
            <div style={styles.recommendedHeader}>
              <span style={styles.metricLabel}>CATEGORIA RECOMENDADA</span>
              <span style={styles.aiTag}>SISTEMA FAIRPLAY</span>
            </div>
            <span style={{ ...styles.metricValue, color: '#00bfff', fontSize: '1.45rem' }}>
              {dashboardData.categoriaRecomendada}
            </span>
            <span style={styles.metricDesc}>{dashboardData.motivoRecomendacao}</span>
          </div>
        </section>

        {/* Eventos em que o atleta está inscrito */}
        <section style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Minhas inscrições</h2>
            <span style={styles.tableCounter}>{inscricoes.length} evento(s)</span>
          </div>

          {inscricoes.length === 0 ? (
            <p style={styles.vazio}>Você ainda não foi inscrito em nenhum evento do FairPlay.</p>
          ) : (
            <div className="tabela-rolavel">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>EVENTO</th>
                    <th style={styles.th}>DATA</th>
                    <th style={styles.th}>CATEGORIA</th>
                    <th style={styles.th}>AUDITORIA</th>
                    <th style={styles.th}>COLOCAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {inscricoes.map((ins) => (
                    <tr key={ins.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: '700', color: '#ffffff' }}>
                        {ins.evento}
                        {ins.localizacao && <small style={styles.detalhe}>📍 {ins.localizacao}</small>}
                      </td>
                      <td style={{ ...styles.td, color: '#a0aec0', whiteSpace: 'nowrap' }}>📅 {dataIsoParaBr(ins.dataInicio)}</td>
                      <td style={styles.td}>
                        <span style={styles.categoryBadge}>{ins.formato} • {ins.genero} • {NIVEIS[ins.nivel] || ins.nivel}</span>
                      </td>
                      <td style={styles.td}>
                        <SeloStatus status={ins.statusElegibilidade} />
                        {ins.statusElegibilidade !== 'REGULAR' && (
                          <small style={{ ...styles.detalhe, color: '#ffa500' }}>
                            Recomendada: {ins.categoriaRecomendada}. {ins.motivoIrregularidade}
                          </small>
                        )}
                      </td>
                      <td style={styles.td}><SeloColocacao colocacao={ins.colocacao} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Histórico de resultados (eventos do FairPlay e histórico importado) */}
        <section style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Histórico de Participações</h2>
            <span style={styles.tableCounter}>{dashboardData.totalParticipacoes} registros</span>
          </div>

          {dashboardData.historico.length === 0 ? (
            <p style={styles.vazio}>Nenhum campeonato registrado para este atleta até o momento.</p>
          ) : (
            <div className="tabela-rolavel">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>NOME DO CAMPEONATO</th>
                    <th style={styles.th}>DATA (MÊS/ANO)</th>
                    <th style={styles.th}>CATEGORIA DISPUTADA</th>
                    <th style={styles.th}>COLOCAÇÃO FINAL</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.historico.map((item) => {
                    const origem = ORIGENS[item.origem] || ORIGENS.HISTORICO;
                    return (
                      <tr key={`${item.origem}-${item.id}`} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: '700', color: '#ffffff' }}>
                          {item.nomeCampeonato}
                          <small style={{ ...styles.detalhe, color: origem.cor }}>{origem.texto}</small>
                        </td>
                        <td style={{ ...styles.td, color: '#a0aec0' }}>
                          📅 {item.dataCampeonato ? dataIsoParaMesAno(item.dataCampeonato) : 'Histórico Consolidado'}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.categoryBadge}>{item.categoria}</span>
                        </td>
                        <td style={styles.td}>
                          <SeloColocacao colocacao={item.colocacao} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modalSenhaAberto && <ModalTrocarSenha onFechar={() => setModalSenhaAberto(false)} />}

      {modalEditarAberto && (
        <Modal titulo="Editar Perfil" corTitulo="#00ff88" onFechar={() => setModalEditarAberto(false)} bloqueado={salvandoPerfil}>
          <p style={{ color: '#a0aec0', fontSize: '0.84rem', marginBottom: '16px' }}>
            Atualize o seu nome de exibição e o box/CT onde você treina atualmente.
          </p>

          <Alerta tipo={feedbackPerfil.tipo}>{feedbackPerfil.texto}</Alerta>

          <form onSubmit={handleSalvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="campo">
              <span className="campo-rotulo">Nome Completo</span>
              <input type="text" className="campo-entrada" value={editNome} onChange={(e) => setEditNome(e.target.value)} required />
            </label>

            <label className="campo">
              <span className="campo-rotulo">Box / CT Atual</span>
              <input type="text" className="campo-entrada" value={editBox} onChange={(e) => setEditBox(e.target.value)} required />
            </label>

            <div className="modal-acoes">
              <button type="button" className="botao botao-secundario" onClick={() => setModalEditarAberto(false)}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-verde" disabled={salvandoPerfil}>
                {salvandoPerfil ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0c0e',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0c0e',
    gap: '16px',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  brand: {
    fontSize: '1.4rem',
    fontWeight: '900',
    letterSpacing: '2px',
    color: '#00ff88',
  },
  roleBadge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    letterSpacing: '1px',
  },
  btnEditarPerfil: {
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#00ff88',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '700',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  profileCentralBanner: {
    backgroundColor: '#111418',
    padding: '32px 24px',
    borderRadius: '14px',
    border: '1px solid #22272e',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  profileBadge: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#00ff88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(0, 255, 136, 0.25)',
    letterSpacing: '1px',
    marginBottom: '10px',
  },
  athleteNameCentral: {
    fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
    fontWeight: '900',
    margin: 0,
    color: '#ffffff',
  },
  athleteBoxCentral: {
    color: '#a0aec0',
    fontSize: '1rem',
    marginTop: '6px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    backgroundColor: '#111418',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #22272e',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  recommendedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTag: {
    fontSize: '0.65rem',
    fontWeight: '800',
    color: '#00bfff',
    backgroundColor: 'rgba(0, 191, 255, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 191, 255, 0.3)',
  },
  metricLabel: {
    fontSize: '0.75rem',
    color: '#a0aec0',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  metricValue: {
    fontSize: '1.8rem',
    fontWeight: '900',
  },
  metricDesc: {
    fontSize: '0.75rem',
    color: '#718096',
  },
  tableCard: {
    backgroundColor: '#111418',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #22272e',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '12px',
  },
  tableTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    margin: 0,
  },
  tableCounter: {
    fontSize: '0.8rem',
    color: '#718096',
  },
  vazio: {
    color: '#718096',
    padding: '20px 0',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid #2d3748',
  },
  th: {
    padding: '14px',
    color: '#718096',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #1a202c',
  },
  td: {
    padding: '16px 14px',
    fontSize: '0.9rem',
    color: '#cbd5e0',
    verticalAlign: 'top',
  },
  detalhe: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#718096',
    marginTop: '4px',
  },
  categoryBadge: {
    backgroundColor: '#1c222b',
    color: '#00bfff',
    border: '1px solid rgba(0, 191, 255, 0.3)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontWeight: '800',
    fontSize: '0.72rem',
    display: 'inline-block',
  },
  podioBadge: {
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontWeight: '700',
    fontSize: '0.82rem',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  rankBadge: {
    backgroundColor: '#1a202c',
    color: '#a0aec0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '0.82rem',
  },
};
