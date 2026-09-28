import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function DashboardAtleta() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Estados do Modal de Edição de Perfil
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editBox, setEditBox] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [feedbackPerfil, setFeedbackPerfil] = useState({ tipo: '', texto: '' });

  // ID do atleta logado (obtido do localStorage ou padrão 1 para testes)
  const atletaId = localStorage.getItem('atletaId') || 1;

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const response = await axios.get(`http://localhost:8080/api/atletas/${atletaId}/dashboard`);
      setDashboardData(response.data);
      setEditNome(response.data.nomeCompleto || '');
      setEditBox(response.data.nomeBox || '');
    } catch (err) {
      setErro('Não foi possível carregar os dados do atleta.');
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setSalvandoPerfil(true);
    setFeedbackPerfil({ tipo: '', texto: '' });

    try {
      const resp = await axios.put(`http://localhost:8080/api/atletas/${atletaId}/perfil`, {
        nomeCompleto: editNome,
        nomeBox: editBox
      });

      // Atualiza os dados na tela e no localStorage
      setDashboardData(prev => ({
        ...prev,
        nomeCompleto: resp.data.nomeCompleto,
        nomeBox: resp.data.nomeBox
      }));
      localStorage.setItem('usuarioNome', resp.data.nomeCompleto);

      setFeedbackPerfil({ tipo: 'sucesso', texto: 'Dados atualizados com sucesso!' });
      setTimeout(() => {
        setModalEditarAberto(false);
        setFeedbackPerfil({ tipo: '', texto: '' });
      }, 900);
    } catch (err) {
      setFeedbackPerfil({ tipo: 'erro', texto: 'Erro ao atualizar os dados do perfil.' });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const formatarData = (dataIso) => {
    if (!dataIso) return 'Histórico Consolidado';
    const [ano, mes] = dataIso.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes, 10) - 1]}/${ano}`;
  };

  const renderColocacaoBadge = (colocacao) => {
    if (colocacao === 1) {
      return <span style={{ ...styles.podioBadge, color: '#ffd700', backgroundColor: 'rgba(255, 215, 0, 0.12)', borderColor: '#ffd700' }}>🥇 1º Lugar (Campeão)</span>;
    }
    if (colocacao === 2) {
      return <span style={{ ...styles.podioBadge, color: '#e2e8f0', backgroundColor: 'rgba(226, 232, 240, 0.12)', borderColor: '#cbd5e0' }}>🥈 2º Lugar (Vice)</span>;
    }
    if (colocacao === 3) {
      return <span style={{ ...styles.podioBadge, color: '#cd7f32', backgroundColor: 'rgba(205, 127, 50, 0.12)', borderColor: '#cd7f32' }}>🥉 3º Lugar</span>;
    }
    return <span style={styles.rankBadge}>{colocacao}º Lugar</span>;
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
        <button onClick={() => navigate('/login')} style={styles.logoutButton}>Voltar ao Login</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Barra Superior */}
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.brand}>FAIRPLAY</span>
          <span style={styles.roleBadge}>HISTÓRICO DO ATLETA</span>
        </div>

        <div style={styles.navRight}>
          <button 
            onClick={() => {
              setEditNome(dashboardData.nomeCompleto);
              setEditBox(dashboardData.nomeBox);
              setModalEditarAberto(true);
            }} 
            style={styles.btnEditarPerfil}
          >
            ✏️ Editar Perfil
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main style={styles.mainContent}>
        
        {/* Banner Central com Nome do Atleta */}
        <section style={styles.profileCentralBanner}>
          <span style={styles.profileBadge}>PERFIL DO ATLETA</span>
          <h1 style={styles.athleteNameCentral}>{dashboardData.nomeCompleto}</h1>
          <p style={styles.athleteBoxCentral}>📍 {dashboardData.nomeBox} • {dashboardData.estado}</p>
        </section>

        {/* Cards de Métricas e Categoria Recomendada */}
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

        {/* Tabela de Histórico */}
        <section style={styles.tableSection}>
          <div style={styles.tableCard}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>Histórico de Participações</h2>
              <span style={styles.tableCounter}>{dashboardData.totalParticipacoes} registros</span>
            </div>

            <div style={styles.tableResponsive}>
              {dashboardData.historico.length === 0 ? (
                <p style={{ color: '#718096', padding: '20px 0', textAlign: 'center' }}>
                  Nenhum campeonato registrado para este atleta até o momento.
                </p>
              ) : (
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
                    {dashboardData.historico.map((item) => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontWeight: '700', color: '#ffffff' }}>
                          {item.nomeCampeonato}
                        </td>
                        <td style={{ ...styles.td, color: '#a0aec0' }}>
                          📅 {formatarData(item.dataCampeonato)}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.categoryBadge}>{item.categoria}</span>
                        </td>
                        <td style={styles.td}>
                          {renderColocacaoBadge(item.colocacao)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Modal de Edição de Nome e Box */}
      {modalEditarAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#00ff88', margin: 0, fontSize: '1.2rem' }}>Editar Perfil</h3>
              <button 
                type="button" 
                onClick={() => setModalEditarAberto(false)}
                style={styles.btnFecharModal}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#a0aec0', fontSize: '0.84rem', margin: '8px 0 16px 0' }}>
              Atualize o seu nome de exibição e o box/CT onde você treina atualmente.
            </p>

            {feedbackPerfil.texto && (
              <div style={{
                ...styles.modalAlert,
                backgroundColor: feedbackPerfil.tipo === 'sucesso' ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 68, 68, 0.12)',
                borderColor: feedbackPerfil.tipo === 'sucesso' ? '#00ff88' : '#ff4444',
                color: feedbackPerfil.tipo === 'sucesso' ? '#00ff88' : '#ff4444',
              }}>
                {feedbackPerfil.texto}
              </div>
            )}

            <form onSubmit={handleSalvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome Completo</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Box / CT Atual</label>
                <input
                  type="text"
                  value={editBox}
                  onChange={(e) => setEditBox(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setModalEditarAberto(false)}
                  style={styles.btnModalCancelar}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={salvandoPerfil}
                  style={{
                    ...styles.btnModalConfirmar,
                    opacity: salvandoPerfil ? 0.6 : 1,
                    cursor: salvandoPerfil ? 'not-allowed' : 'pointer'
                  }}
                >
                  {salvandoPerfil ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 40px',
    backgroundColor: '#111418',
    borderBottom: '1px solid #22272e',
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
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  btnEditarPerfil: {
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#00ff88',
    padding: '7px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '700',
    transition: 'all 0.2s',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    border: '1px solid #2d3748',
    color: '#e2e8f0',
    padding: '7px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  mainContent: {
    maxWidth: '1050px',
    margin: '0 auto',
    padding: '32px 24px',
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
    fontSize: '2.2rem',
    fontWeight: '900',
    margin: 0,
    color: '#ffffff',
  },
  athleteBoxCentral: {
    color: '#a0aec0',
    fontSize: '1rem',
    marginTop: '6px',
    margin: 0,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
  tableSection: {
    display: 'flex',
    flexDirection: 'column',
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
  tableResponsive: {
    overflowX: 'auto',
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
  },
  categoryBadge: {
    backgroundColor: '#1c222b',
    color: '#00bfff',
    border: '1px solid rgba(0, 191, 255, 0.3)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  podioBadge: {
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontWeight: '700',
    fontSize: '0.82rem',
    display: 'inline-block',
  },
  rankBadge: {
    backgroundColor: '#1a202c',
    color: '#a0aec0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '0.82rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.85)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnFecharModal: {
    background: 'transparent',
    border: 'none',
    color: '#8b949e',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  modalAlert: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.82rem',
    marginBottom: '12px',
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.72rem',
    color: '#a0aec0',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    padding: '11px 13px',
    borderRadius: '8px',
    backgroundColor: '#0a0c0e',
    border: '1px solid #2d3748',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  btnModalCancelar: {
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    color: '#c9d1d9',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  btnModalConfirmar: {
    backgroundColor: '#238636',
    border: 'none',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '0.82rem',
  }
};