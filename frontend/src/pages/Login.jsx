import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api, { mensagemDeErro, iniciarSessao } from '../api';
import { mascaraCpf } from '../utils/formatacao';
import { corDoPerfil, imagemDoPerfil } from '../tema';
import Modal from '../components/Modal';
import Alerta from '../components/Alerta';

const PERFIS = ['ATLETA', 'ORGANIZADOR'];

/** O campo aceita e-mail ou CPF: aplica a máscara de CPF apenas quando só há números. */
const formatarLogin = (valor) => (valor.includes('@') || /[a-zA-Z]/.test(valor) ? valor : mascaraCpf(valor));

/**
 * A recuperação de senha por e-mail ainda não está disponível: o botão só mostra este aviso.
 * O backend já tem as rotas (/conta/recuperar-senha e /conta/redefinir-senha) para quando for ativada.
 */
function ModalEsqueciSenha({ perfil, onFechar }) {
  return (
    <Modal titulo="Esqueci minha senha" corTitulo={corDoPerfil(perfil)} onFechar={onFechar}>
      <Alerta tipo="aviso">Funcionalidade ainda não implementada.</Alerta>
      <div className="modal-acoes">
        <button type="button" className="botao botao-verde" onClick={onFechar}>Entendi</button>
      </div>
    </Modal>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Quando chega aqui vindo de um cadastro concluído (ou de uma redefinição de senha), mostra a mensagem
  const vindoDeOutraTela = location.state?.mensagem ? location.state : null;

  const [tipoUsuario, setTipoUsuario] = useState(vindoDeOutraTela?.tipoCadastrado || 'ATLETA');
  const [formData, setFormData] = useState({ login: '', senha: '' });
  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState(vindoDeOutraTela?.mensagem || '');
  const [carregando, setCarregando] = useState(false);
  const [modalEsqueciAberto, setModalEsqueciAberto] = useState(false);

  // Modal de acesso do administrador master
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminErro, setAdminErro] = useState('');
  const [carregandoAdmin, setCarregandoAdmin] = useState(false);

  // Limpa o state da navegação para a mensagem não reaparecer ao recarregar a página
  useEffect(() => {
    if (location.state?.mensagem) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const isAtleta = tipoUsuario === 'ATLETA';
  const accentColor = corDoPerfil(tipoUsuario);

  const trocarPerfil = (perfil) => {
    setTipoUsuario(perfil);
    setMensagemErro('');
    setMensagemSucesso('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'login' ? formatarLogin(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagemErro('');
    setMensagemSucesso('');
    setCarregando(true);

    try {
      const { data } = await api.post('/atletas/login', {
        login: formData.login.trim(),
        senha: formData.senha,
        perfil: tipoUsuario,
      });

      localStorage.clear();
      iniciarSessao(data);

      navigate(data.perfil === 'ORGANIZADOR' ? '/organizador/eventos' : '/atleta/home');
    } catch (err) {
      setMensagemErro(mensagemDeErro(err, 'Credenciais inválidas ou erro no servidor.'));
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalAdmin = () => {
    setAdminErro('');
    setAdminUser('');
    setAdminPass('');
    setModalAdminAberto(true);
  };

  const handleLoginMaster = async (e) => {
    e.preventDefault();
    setAdminErro('');
    setCarregandoAdmin(true);

    try {
      const { data } = await api.post('/admin/usuarios/login', { usuario: adminUser, senha: adminPass });
      localStorage.clear();
      iniciarSessao(data);
      setModalAdminAberto(false);
      navigate('/admin/usuarios');
    } catch {
      setAdminErro('Usuário ou senha de administrador incorretos.');
    } finally {
      setCarregandoAdmin(false);
    }
  };

  return (
    <div className="tela-acesso">
      <div className="cartao-acesso" style={styles.cardContainer}>

        {/* Banner lateral (some em telas pequenas) */}
        <div className="cartao-acesso-banner" style={{ flex: 1, backgroundImage: `url("${imagemDoPerfil(tipoUsuario)}")` }}>
          <div style={styles.overlay}>
            <h2 style={{ ...styles.bannerTitle, color: accentColor }}>FAIRPLAY</h2>
            <p style={styles.bannerText}>
              {isAtleta
                ? 'Acesse seu histórico oficial, consulte suas categorias e prepare-se para as arenas.'
                : 'Acesse o painel administrativo e gerencie seus torneios esportivos.'}
            </p>
          </div>
        </div>

        {/* Formulário de login */}
        <div className="cartao-acesso-formulario" style={styles.formSection}>
          <div style={styles.tabContainer}>
            {PERFIS.map((perfil) => {
              const ativo = tipoUsuario === perfil;
              const cor = corDoPerfil(perfil);
              return (
                <button
                  key={perfil}
                  type="button"
                  onClick={() => trocarPerfil(perfil)}
                  style={{
                    ...styles.tabButton,
                    backgroundColor: ativo ? cor : 'transparent',
                    color: ativo ? '#000000' : '#a0aec0',
                    borderColor: ativo ? cor : '#2d3748',
                  }}
                >
                  {perfil}
                </button>
              );
            })}
          </div>

          <div style={styles.header}>
            <h1 style={styles.title}>Acessar Conta</h1>
            <p style={styles.subtitle}>
              Entrando como <strong style={{ color: accentColor }}>{isAtleta ? 'Atleta' : 'Organizador'}</strong>
            </p>
          </div>

          {mensagemSucesso && (
            <div style={{ ...styles.alertSucesso, borderColor: accentColor, color: accentColor }}>
              ✓ {mensagemSucesso}
            </div>
          )}

          {mensagemErro && <div style={styles.alertErro}>{mensagemErro}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <label className="campo">
              <span className="campo-rotulo">E-mail ou CPF</span>
              <input
                type="text"
                name="login"
                className="campo-entrada"
                placeholder="exemplo@email.com ou CPF"
                value={formData.login}
                onChange={handleChange}
                required
              />
            </label>

            <label className="campo">
              <span className="campo-rotulo">Senha</span>
              <input
                type="password"
                name="senha"
                className="campo-entrada"
                placeholder="••••••••"
                value={formData.senha}
                onChange={handleChange}
                required
              />
            </label>

            <button
              type="button"
              className="link-botao"
              onClick={() => setModalEsqueciAberto(true)}
              style={{ color: '#8b949e', fontSize: '0.8rem', alignSelf: 'flex-end', fontWeight: 600 }}
            >
              Esqueci minha senha
            </button>

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

            <p style={styles.registerPrompt}>
              Ainda não tem conta?{' '}
              <Link to={`/cadastro?tipo=${tipoUsuario}`} style={{ ...styles.registerLink, color: accentColor }}>
                Cadastre-se aqui
              </Link>
            </p>

            <button type="button" onClick={abrirModalAdmin} style={styles.btnAcessoMaster}>
              🛡️ Gerenciador de Cadastros (Admin)
            </button>
          </form>
        </div>
      </div>

      {modalEsqueciAberto && <ModalEsqueciSenha perfil={tipoUsuario} onFechar={() => setModalEsqueciAberto(false)} />}

      {modalAdminAberto && (
        <Modal titulo="Acesso Master" corTitulo="#00ff88" largura={380} onFechar={() => setModalAdminAberto(false)}>
          <p style={{ color: '#a0aec0', fontSize: '0.84rem', marginBottom: '16px', lineHeight: '1.4' }}>
            Informe suas credenciais de administrador para acessar a gestão de cadastros.
          </p>

          <Alerta tipo="erro">{adminErro}</Alerta>

          <form onSubmit={handleLoginMaster} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="campo">
              <span className="campo-rotulo">Usuário Master</span>
              <input type="text" className="campo-entrada" placeholder="master" value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)} required />
            </label>

            <label className="campo">
              <span className="campo-rotulo">Senha Master</span>
              <input type="password" className="campo-entrada" placeholder="••••••" value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)} required />
            </label>

            <div className="modal-acoes">
              <button type="button" className="botao botao-secundario" onClick={() => setModalAdminAberto(false)}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-verde" disabled={carregandoAdmin}>
                {carregandoAdmin ? 'Verificando...' : 'Acessar Gerenciador'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  cardContainer: {
    maxWidth: '920px',
    height: '660px',
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
  button: {
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
};
