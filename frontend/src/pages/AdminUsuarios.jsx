import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { encerrarSessao } from '../api';
import { estiloFeedback } from '../tema';
import ModalConfirmacao from '../components/ModalConfirmacao';

const FILTROS_PERFIL = ['TODOS', 'ATLETA', 'ORGANIZADOR'];

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('TODOS');
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);

  useEffect(() => {
    api.get('/admin/usuarios')
      .then(({ data }) => setUsuarios(data || []))
      .catch(() => setMensagem({ tipo: 'erro', texto: 'Erro ao carregar lista de usuários.' }))
      .finally(() => setCarregando(false));
  }, []);

  const handleExcluir = async () => {
    const usuario = usuarioParaExcluir;
    try {
      await api.delete(`/admin/usuarios/${usuario.id}`);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
      setMensagem({ tipo: 'sucesso', texto: `Usuário "${usuario.nomeCompleto}" excluído com sucesso!` });
      setUsuarioParaExcluir(null);
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível excluir o usuário.' });
    }
  };

  const termo = busca.toLowerCase();
  const usuariosFiltrados = usuarios.filter((u) => {
    const bateBusca =
      u.nomeCompleto?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo) ||
      u.cpf?.includes(termo) ||
      u.nomeBox?.toLowerCase().includes(termo);
    const batePerfil = filtroPerfil === 'TODOS' || u.perfil === filtroPerfil;
    return bateBusca && batePerfil;
  });

  return (
    <div style={styles.container}>
      {/* Barra de Navegação */}
      <header className="barra-topo">
        <div style={styles.navBrand}>
          <span style={styles.brand}>FAIRPLAY</span>
          <span style={styles.adminBadge}>PAINEL ADMINISTRATIVO</span>
        </div>
        <button onClick={() => { encerrarSessao(); navigate('/login'); }} style={styles.btnVoltar}>
          Voltar ao Sistema
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.headerTitleContainer}>
          <div>
            <h1 style={styles.title}>Gerenciamento de Usuários</h1>
            <p style={styles.subtitle}>Visualize, pesquise e remova contas de atletas e organizadores.</p>
          </div>
          <div style={styles.totalBadge}>
            {usuarios.length} Usuário(s) cadastrado(s)
          </div>
        </div>

        {mensagem.texto && (
          <div style={{ ...styles.alert, ...estiloFeedback(mensagem.tipo) }}>
            {mensagem.texto}
          </div>
        )}

        {/* Filtros e busca */}
        <div style={styles.filterBar}>
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, CPF ou box..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.tabButtons}>
            {FILTROS_PERFIL.map((perfil) => (
              <button
                key={perfil}
                onClick={() => setFiltroPerfil(perfil)}
                style={{
                  ...styles.filterBtn,
                  backgroundColor: filtroPerfil === perfil ? '#238636' : '#161b22',
                  borderColor: filtroPerfil === perfil ? '#2ea043' : '#30363d',
                  color: filtroPerfil === perfil ? '#ffffff' : '#8b949e',
                }}
              >
                {perfil}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div style={styles.tableCard}>
          {carregando ? (
            <p style={{ color: '#00ff88', textAlign: 'center', padding: '30px' }}>Carregando usuários...</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p style={{ color: '#8b949e', textAlign: 'center', padding: '30px' }}>Nenhum usuário encontrado com os filtros atuais.</p>
          ) : (
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>NOME</th>
                    <th style={styles.th}>E-MAIL / CELULAR</th>
                    <th style={styles.th}>CPF</th>
                    <th style={styles.th}>BOX / CIDADE</th>
                    <th style={styles.th}>PERFIL</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id} style={styles.tr}>
                      <td style={{ ...styles.td, color: '#718096', fontWeight: 'bold' }}>#{u.id}</td>
                      <td style={{ ...styles.td, color: '#ffffff', fontWeight: '600' }}>
                        {u.nomeCompleto}
                      </td>
                      <td style={styles.td}>
                        <div>{u.email || '—'}</div>
                        <small style={{ color: '#718096' }}>{u.celular || 'Sem celular'}</small>
                      </td>
                      <td style={{ ...styles.td, color: '#a0aec0' }}>{u.cpf || '—'}</td>
                      <td style={styles.td}>
                        <div>{u.nomeBox || 'N/D'}</div>
                        <small style={{ color: '#718096' }}>{u.cidade ? `${u.cidade} - ${u.estado}` : 'Cidade não informada'}</small>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: u.perfil === 'ATLETA' ? 'rgba(0, 255, 136, 0.12)' : 'rgba(0, 191, 255, 0.12)',
                          color: u.perfil === 'ATLETA' ? '#00ff88' : '#00bfff',
                          borderColor: u.perfil === 'ATLETA' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 191, 255, 0.3)',
                        }}>
                          {u.perfil}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => setUsuarioParaExcluir(u)}
                          style={styles.btnExcluir}
                          title="Excluir usuário"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {usuarioParaExcluir && (
        <ModalConfirmacao
          titulo="⚠️ Confirmar Exclusão"
          textoConfirmar="Sim, Excluir Conta"
          textoProcessando="Excluindo..."
          onConfirmar={handleExcluir}
          onCancelar={() => setUsuarioParaExcluir(null)}
        >
          Tem certeza de que deseja excluir o usuário <strong>{usuarioParaExcluir.nomeCompleto}</strong> (ID: #{usuarioParaExcluir.id})?
          <span style={{ display: 'block', color: '#8b949e', fontSize: '0.8rem', marginTop: '8px' }}>
            Se houver histórico esportivo vinculado a esta conta, os registros serão liberados novamente para novas vinculações.
          </span>
        </ModalConfirmacao>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0c0e',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  brand: {
    fontSize: '1.4rem',
    fontWeight: '900',
    letterSpacing: '2px',
    color: '#00ff88',
  },
  adminBadge: {
    fontSize: '0.7rem',
    fontWeight: '800',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    color: '#ff6b6b',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 68, 68, 0.3)',
    letterSpacing: '1px',
  },
  btnVoltar: {
    backgroundColor: 'transparent',
    border: '1px solid #2d3748',
    color: '#e2e8f0',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  headerTitleContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    margin: 0,
  },
  subtitle: {
    color: '#718096',
    fontSize: '0.9rem',
    marginTop: '6px',
    margin: 0,
  },
  totalBadge: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#00ff88',
    fontWeight: '700',
  },
  alert: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '20px',
    fontSize: '0.88rem',
    fontWeight: '600',
  },
  filterBar: {
    display: 'flex',
    gap: '14px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '280px',
    padding: '12px 16px',
    backgroundColor: '#111418',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    color: '#ffffff',
    outline: 'none',
    fontSize: '0.9rem',
  },
  tabButtons: {
    display: 'flex',
    gap: '8px',
  },
  filterBtn: {
    padding: '0 16px',
    borderRadius: '8px',
    border: '1px solid',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '0.78rem',
    letterSpacing: '0.5px',
  },
  tableCard: {
    backgroundColor: '#111418',
    borderRadius: '12px',
    border: '1px solid #22272e',
    overflow: 'hidden',
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
    backgroundColor: '#0d1117',
    borderBottom: '1px solid #21262d',
  },
  th: {
    padding: '14px 16px',
    color: '#8b949e',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #1a202c',
    transition: 'background 0.2s',
  },
  td: {
    padding: '14px 16px',
    fontSize: '0.86rem',
    color: '#cbd5e0',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  btnExcluir: {
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    color: '#ff4444',
    border: '1px solid rgba(255, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};