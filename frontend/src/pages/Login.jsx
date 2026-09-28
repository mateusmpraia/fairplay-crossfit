import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tipoUsuario, setTipoUsuario] = useState('ATLETA'); // ATLETA | ORGANIZADOR
  const [formData, setFormData] = useState({
    login: '',
    senha: ''
  });

  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estados do Modal Administrativo Master
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminErro, setAdminErro] = useState('');
  const [carregandoAdmin, setCarregandoAdmin] = useState(false);

  // Verifica se veio de um cadastro recém-concluído
  useEffect(() => {
    if (location.state?.cadastroSucesso) {
      setMensagemSucesso(location.state.mensagem || 'Cadastro realizado com sucesso! Faça login para continuar.');
      if (location.state.tipoCadastrado) {
        setTipoUsuario(location.state.tipoCadastrado);
      }
      // Limpa o state para não reaparecer no refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const isAtleta = tipoUsuario === 'ATLETA';
  const accentColor = isAtleta ? '#00ff88' : '#00bfff';

  const atletaImg = 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1000';
  const organizadorImg = 'https://images.pexels.com/photos/618612/pexels-photo-618612.jpeg?v=2&auto=compress&cs=tinysrgb&w=1000';

  const formatLoginInput = (value) => {
    if (value.includes('@') || /[a-zA-Z]/.test(value)) {
      return value;
    }

    const onlyDigits = value.replace(/\D/g, '').slice(0, 11);
    return onlyDigits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'login') {
      setFormData({ ...formData, login: formatLoginInput(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagemErro('');
    setMensagemSucesso('');
    setCarregando(true);

    try {
      const payload = {
        login: formData.login.trim(),
        senha: formData.senha,
        perfil: tipoUsuario
      };

      const response = await axios.post('http://localhost:8080/api/atletas/login', payload);

      if (response.status === 200) {
        localStorage.setItem('atletaId', response.data.id);
        localStorage.setItem('usuarioNome', response.data.nome);
        localStorage.setItem('usuarioPerfil', response.data.perfil);

        if (response.data.perfil === 'ORGANIZADOR') {
          navigate('/organizador/eventos');
        } else {
          navigate('/atleta/home');
        }
      }
    } catch (err) {
      const erroTexto = typeof err.response?.data === 'string' 
        ? err.response.data 
        : 'Credenciais inválidas ou erro no servidor.';
      setMensagemErro(erroTexto);
    } finally {
      setCarregando(false);
    }
  };

  const handleLoginMaster = async (e) => {
    e.preventDefault();
    setAdminErro('');
    setCarregandoAdmin(true);

    try {
      const resp = await axios.post('http://localhost:8080/api/admin/usuarios/login', {
        usuario: adminUser,
        senha: adminPass
      });

      if (resp.status === 200) {
        localStorage.setItem('usuarioPerfil', 'MASTER_ADMIN');
        localStorage.setItem('tokenMaster', resp.data.token);
        setModalAdminAberto(false);
        navigate('/admin/usuarios');
      }
    } catch (err) {
      setAdminErro('Usuário ou senha de administrador incorretos.');
    } finally {
      setCarregandoAdmin(false);
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.cardContainer}>
        
        {/* Banner Lateral */}
        <div style={{
          ...styles.imageBanner,
          backgroundImage: `url("${isAtleta ? atletaImg : organizadorImg}")`
        }}>
          <div style={styles.overlay}>
            <h2 style={{ ...styles.bannerTitle, color: accentColor }}>FAIRPLAY</h2>
            <p style={styles.bannerText}>
              {isAtleta
                ? 'Acesse seu histórico oficial, consulte suas categorias e prepare-se para as arenas.'
                : 'Acesse o painel administrativo e gerencie seus torneios esportivos.'}
            </p>
          </div>
        </div>

        {/* Formulário de Login */}
        <div style={styles.formSection}>
          
          {/* Seletor de Perfil */}
          <div style={styles.tabContainer}>
            <button
              type="button"
              onClick={() => { setTipoUsuario('ATLETA'); setMensagemErro(''); setMensagemSucesso(''); }}
              style={{
                ...styles.tabButton,
                backgroundColor: isAtleta ? '#00ff88' : 'transparent',
                color: isAtleta ? '#000000' : '#a0aec0',
                borderColor: isAtleta ? '#00ff88' : '#2d3748',
              }}
            >
              ATLETA
            </button>
            <button
              type="button"
              onClick={() => { setTipoUsuario('ORGANIZADOR'); setMensagemErro(''); setMensagemSucesso(''); }}
              style={{
                ...styles.tabButton,
                backgroundColor: !isAtleta ? '#00bfff' : 'transparent',
                color: !isAtleta ? '#000000' : '#a0aec0',
                borderColor: !isAtleta ? '#00bfff' : '#2d3748',
              }}
            >
              ORGANIZADOR
            </button>
          </div>

          <div style={styles.header}>
            <h1 style={styles.title}>Acessar Conta</h1>
            <p style={styles.subtitle}>
              Entrando como <strong style={{ color: accentColor }}>{isAtleta ? 'Atleta' : 'Organizador'}</strong>
            </p>
          </div>

          {/* Mensagem de sucesso ao retornar de um cadastro */}
          {mensagemSucesso && (
            <div style={{ ...styles.alertSucesso, borderColor: accentColor, color: accentColor }}>
              ✓ {mensagemSucesso}
            </div>
          )}

          {mensagemErro && (
            <div style={styles.alertErro}>
              {mensagemErro}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail ou CPF</label>
              <input
                type="text"
                name="login"
                placeholder="exemplo@email.com ou CPF"
                value={formData.login}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Senha</label>
              <input
                type="password"
                name="senha"
                placeholder="••••••••"
                value={formData.senha}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={{
                ...styles.button,
                backgroundColor: accentColor,
                opacity: carregando ? 0.6 : 1,
                cursor: carregando ? 'not-allowed' : 'pointer'
              }}
            >
              {carregando ? 'ENTRANDO...' : `ENTRAR COMO ${tipoUsuario}`}
            </button>

            {/* Link dinâmico que envia o perfil atual selecionado */}
            <p style={styles.registerPrompt}>
              Ainda não tem conta?{' '}
              <Link 
                to={`/cadastro?tipo=${tipoUsuario}`} 
                style={{ ...styles.registerLink, color: accentColor }}
              >
                Cadastre-se aqui
              </Link>
            </p>

            {/* Botão de Acesso Master */}
            <button
              type="button"
              onClick={() => {
                setAdminErro('');
                setAdminUser('');
                setAdminPass('');
                setModalAdminAberto(true);
              }}
              style={styles.btnAcessoMaster}
            >
              🛡️ Gerenciador de Cadastros (Admin)
            </button>
          </form>
        </div>

      </div>

      {/* Modal de Autenticação Master */}
      {modalAdminAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#00ff88', margin: 0, fontSize: '1.2rem' }}>Acesso Master</h3>
              <button 
                type="button" 
                onClick={() => setModalAdminAberto(false)}
                style={styles.btnFecharModal}
              >
                ✕
              </button>
            </div>
            
            <p style={{ color: '#a0aec0', fontSize: '0.84rem', margin: '8px 0 16px 0', lineHeight: '1.4' }}>
              Informe suas credenciais de administrador para acessar a gestão de cadastros.
            </p>

            {adminErro && <div style={styles.modalAlert}>{adminErro}</div>}

            <form onSubmit={handleLoginMaster} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Usuário Master</label>
                <input
                  type="text"
                  placeholder="master"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Senha Master</label>
                <input
                  type="password"
                  placeholder="••••••"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setModalAdminAberto(false)}
                  style={styles.btnModalCancelar}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={carregandoAdmin}
                  style={{
                    ...styles.btnModalConfirmar,
                    opacity: carregandoAdmin ? 0.6 : 1,
                    cursor: carregandoAdmin ? 'not-allowed' : 'pointer'
                  }}
                >
                  {carregandoAdmin ? 'Verificando...' : 'Acessar Gerenciador'}
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
  pageWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    padding: '24px 16px',
  },
  cardContainer: {
    display: 'flex',
    width: '100%',
    maxWidth: '920px',
    height: '630px',
    backgroundColor: '#111418',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #22272e',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
  },
  imageBanner: {
    flex: '1',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    height: '100%',
    transition: 'background-image 0.3s ease-in-out',
  },
  overlay: {
    padding: '40px 32px',
    background: 'linear-gradient(to top, rgba(8, 10, 12, 0.95), transparent)',
    width: '100%',
  },
  bannerTitle: {
    fontSize: '2.2rem',
    fontWeight: '900',
    letterSpacing: '3px',
    margin: 0,
  },
  bannerText: {
    color: '#a0aec0',
    fontSize: '0.92rem',
    marginTop: '10px',
    lineHeight: '1.5',
  },
  formSection: {
    flex: '1.1',
    padding: '36px 40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  tabContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  tabButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid',
    fontWeight: '800',
    fontSize: '0.8rem',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  header: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    color: '#718096',
    fontSize: '0.88rem',
    marginTop: '4px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '0.72rem',
    color: '#a0aec0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
  button: {
    marginTop: '4px',
    padding: '13px',
    borderRadius: '8px',
    border: 'none',
    color: '#000000',
    fontWeight: '800',
    fontSize: '0.9rem',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
  },
  alertSucesso: {
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    border: '1px solid',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.82rem',
    marginBottom: '10px',
    fontWeight: '600',
    textAlign: 'center',
  },
  alertErro: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    color: '#ff4444',
    padding: '9px',
    borderRadius: '8px',
    fontSize: '0.82rem',
    marginBottom: '8px',
    fontWeight: '600',
    textAlign: 'center',
  },
  registerPrompt: {
    textAlign: 'center',
    color: '#718096',
    fontSize: '0.84rem',
    margin: '4px 0 0 0',
  },
  registerLink: {
    fontWeight: '700',
    textDecoration: 'none',
  },
  btnAcessoMaster: {
    marginTop: '4px',
    backgroundColor: 'transparent',
    border: '1px dashed #30363d',
    color: '#8b949e',
    padding: '7px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600',
    transition: 'all 0.2s',
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
  modalContent: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '380px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.9)',
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
    fontSize: '1.1rem',
    cursor: 'pointer',
  },
  modalAlert: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    color: '#ff4444',
    border: '1px solid #ff4444',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '0.78rem',
    marginBottom: '10px',
    textAlign: 'center',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
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
    padding: '8px 14px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '0.82rem',
    letterSpacing: '0.5px',
  }
};