import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api, { mensagemDeErro } from '../api';
import { mascaraCpf, mascaraCelular, mascaraData, dataBrParaIso, cpfValido, TAMANHO_MINIMO_SENHA } from '../utils/formatacao';
import { corDoPerfil, imagemDoPerfil, estiloFeedback } from '../tema';

const PERFIS = ['ATLETA', 'ORGANIZADOR'];

const MASCARAS = {
  cpf: mascaraCpf,
  celular: mascaraCelular,
  dataNascimento: mascaraData,
};

export default function CadastroAtleta() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tipoUsuario, setTipoUsuario] = useState(
    searchParams.get('tipo')?.toUpperCase() === 'ORGANIZADOR' ? 'ORGANIZADOR' : 'ATLETA'
  );

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    cpf: '',
    dataNascimento: '',
    genero: '',
    celular: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    cidade: '',
    estado: '',
    nomeBox: ''
  });

  // Perfis do histórico importado com nome parecido, que o atleta pode vincular à conta
  const [sugestoesHistorico, setSugestoesHistorico] = useState([]);
  const [perfilVinculado, setPerfilVinculado] = useState(null);

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const isAtleta = tipoUsuario === 'ATLETA';
  const accentColor = corDoPerfil(tipoUsuario);

  const nomeParaBusca = formData.nomeCompleto.trim();
  const buscarHistorico = isAtleta && !perfilVinculado && nomeParaBusca.length >= 3;
  const mostrarSugestoes = buscarHistorico && sugestoesHistorico.length > 0;

  // Busca sugestões do histórico enquanto o atleta digita o nome (com atraso de 400 ms)
  useEffect(() => {
    if (!buscarHistorico) return;

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/atletas/historico/sugestoes', { params: { nome: nomeParaBusca } });
        setSugestoesHistorico(data || []);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [buscarHistorico, nomeParaBusca]);

  const trocarPerfil = (perfil) => {
    setTipoUsuario(perfil);
    setErro('');
    setPerfilVinculado(null);
  };

  const handleSelecionarHistorico = (item) => {
    setPerfilVinculado(item);
    setSugestoesHistorico([]);

    // O histórico pode ter vários boxes ("Box A / Box B"): usa o primeiro para preencher o campo
    const boxPrincipal = (item.boxOrigem || '').split(' / ')[0].trim();
    if (boxPrincipal && boxPrincipal !== 'N/D') {
      setFormData((prev) => ({ ...prev, nomeBox: boxPrincipal }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const mascara = MASCARAS[name];
    setFormData({ ...formData, [name]: mascara ? mascara(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!cpfValido(formData.cpf)) {
      setErro('CPF inválido. Confira os números digitados.');
      return;
    }

    if (formData.senha.length < TAMANHO_MINIMO_SENHA) {
      setErro(`A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setErro('A confirmação de senha não confere.');
      return;
    }

    const dataIso = dataBrParaIso(formData.dataNascimento);
    if (!dataIso) {
      setErro('Informe uma data de nascimento válida no formato DD/MM/AAAA.');
      return;
    }

    setCarregando(true);

    try {
      await api.post('/atletas/cadastro', {
        ...formData,
        dataNascimento: dataIso,
        perfil: tipoUsuario,
        historicoNomeAtleta: perfilVinculado?.nomeAtleta ?? null,
      });

      const perfilDescricao = isAtleta ? 'Atleta' : 'Organizador';
      navigate('/login', {
        state: {
          cadastroSucesso: true,
          tipoCadastrado: tipoUsuario,
          mensagem: `Cadastro de ${perfilDescricao} realizado com sucesso! Faça login para continuar.`
        }
      });
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao conectar com o servidor.'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="tela-acesso">
      <div className="cartao-acesso" style={styles.cardContainer}>
        {/* Banner lateral */}
        <div className="cartao-acesso-banner" style={{ ...styles.imageBanner, backgroundImage: `url("${imagemDoPerfil(tipoUsuario)}")` }}>
          <div style={styles.overlay}>
            <h2 style={{ ...styles.bannerTitle, color: accentColor }}>FAIRPLAY</h2>
            <p style={styles.bannerText}>
              {isAtleta
                ? 'Supere seus limites na arena. Cadastre-se e gerencie seus resultados esportivos.'
                : 'Crie e gerencie seus campeonatos de CrossFit com total controle e transparência.'}
            </p>
          </div>
        </div>

        {/* Formulário */}
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
            <h1 style={styles.title}>
              {isAtleta ? 'Cadastro de Atleta' : 'Cadastro de Organizador'}
            </h1>
            <p style={styles.subtitle}>
              {isAtleta
                ? 'Preencha seus dados para competir nas arenas'
                : 'Preencha seus dados para gerenciar campeonatos'}
            </p>
          </div>

          {erro && <div style={{ ...styles.alert, ...estiloFeedback('erro') }}>{erro}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome Completo</label>
              <input
                type="text"
                name="nomeCompleto"
                placeholder="Seu nome completo"
                value={formData.nomeCompleto}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            {mostrarSugestoes && (
              <div style={styles.sugestoesCard}>
                <div style={styles.sugestoesHeader}>
                  <span>🔍 Encontramos competições anteriores no seu nome:</span>
                </div>
                {sugestoesHistorico.map((item) => (
                  <div key={item.nomeAtleta} style={styles.sugestaoItem}>
                    <div>
                      <div style={styles.sugestaoNome}>{item.nomeAtleta}</div>
                      <div style={styles.sugestaoDetalhe}>
                        Box: <strong>{item.boxOrigem || 'N/D'}</strong> • {item.totalCompeticoes} resultado(s)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelecionarHistorico(item)}
                      style={styles.btnVincular}
                    >
                      É você? Vincular
                    </button>
                  </div>
                ))}
              </div>
            )}

            {perfilVinculado && (
              <div style={styles.vinculoAtivoCard}>
                <div>
                  <span style={{ color: '#00ff88', fontWeight: 'bold' }}>✓ Histórico Vinculado:</span>
                  <div style={styles.vinculoAtivoTexto}>
                    {perfilVinculado.nomeAtleta} ({perfilVinculado.boxOrigem})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPerfilVinculado(null)}
                  style={styles.btnDesfazer}
                >
                  Desfazer
                </button>
              </div>
            )}

            <div className="linha-campos">
              <div style={styles.inputGroup}>
                <label style={styles.label}>CPF</label>
                <input
                  type="text"
                  name="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  maxLength={14}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Celular</label>
                <input
                  type="text"
                  name="celular"
                  placeholder="(21) 99999-9999"
                  value={formData.celular}
                  onChange={handleChange}
                  maxLength={15}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div className="linha-campos">
              <div style={styles.inputGroup}>
                <label style={styles.label}>Data de Nascimento (DD/MM/AAAA)</label>
                <input
                  type="text"
                  name="dataNascimento"
                  placeholder="DD/MM/AAAA"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  maxLength={10}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Gênero</label>
                <select
                  name="genero"
                  value={formData.genero}
                  onChange={handleChange}
                  required
                  style={styles.select}
                >
                  <option value="" disabled>Selecione...</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMININO">Feminino</option>
                  <option value="OUTRO">Outro / Prefiro não dizer</option>
                </select>
              </div>
            </div>

            <div className="linha-campos">
              <div style={{ ...styles.inputGroup, flex: 2 }}>
                <label style={styles.label}>Cidade</label>
                <input
                  type="text"
                  name="cidade"
                  placeholder="Ex: Niterói"
                  value={formData.cidade}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>UF</label>
                <input
                  type="text"
                  name="estado"
                  placeholder="RJ"
                  maxLength={2}
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>{isAtleta ? 'Box / CT onde treina' : 'Box / Organização vinculada'}</label>
              <input
                type="text"
                name="nomeBox"
                placeholder="Ex: CrossFit Niterói"
                value={formData.nomeBox}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div className="linha-campos">
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

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar Senha</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  placeholder="••••••••"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
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
              {carregando ? 'CADASTRANDO...' : `CADASTRAR COMO ${tipoUsuario}`}
            </button>

            <p style={styles.loginPrompt}>
              Já tem uma conta?{' '}
              <Link to="/login" style={{ ...styles.loginLink, color: accentColor }}>
                Faça login aqui
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  cardContainer: {
    maxWidth: '1020px',
    height: '740px',
  },
  imageBanner: {
    flex: '0.9',
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
    transition: 'color 0.3s ease',
  },
  bannerText: {
    color: '#a0aec0',
    fontSize: '0.92rem',
    marginTop: '10px',
    lineHeight: '1.5',
  },
  formSection: {
    flex: '1.2',
    padding: '36px 44px',
  },
  tabContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  tabButton: {
    flex: 1,
    padding: '11px',
    borderRadius: '8px',
    border: '1px solid',
    fontWeight: '800',
    fontSize: '0.82rem',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  subtitle: {
    color: '#718096',
    fontSize: '0.85rem',
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
    flex: 1,
  },
  label: {
    fontSize: '0.72rem',
    color: '#a0aec0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#0a0c0e',
    border: '1px solid #2d3748',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#0a0c0e',
    border: '1px solid #2d3748',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  sugestoesCard: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sugestoesHeader: {
    fontSize: '0.78rem',
    color: '#8b949e',
    fontWeight: '600',
  },
  sugestaoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #21262d',
  },
  sugestaoNome: {
    color: '#f0f6fc',
    fontSize: '0.88rem',
    fontWeight: 'bold',
  },
  sugestaoDetalhe: {
    color: '#8b949e',
    fontSize: '0.78rem',
  },
  btnVincular: {
    backgroundColor: '#238636',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  vinculoAtivoCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    border: '1px solid #00ff88',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  vinculoAtivoTexto: {
    color: '#c9d1d9',
    fontSize: '0.85rem',
    marginTop: '2px',
  },
  btnDesfazer: {
    backgroundColor: 'transparent',
    color: '#f85149',
    border: '1px solid #f85149',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  button: {
    marginTop: '6px',
    padding: '13px',
    borderRadius: '8px',
    border: 'none',
    color: '#000000',
    fontWeight: '800',
    fontSize: '0.92rem',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
  },
  alert: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.85rem',
    textAlign: 'center',
    marginBottom: '14px',
    fontWeight: '600',
  },
  loginPrompt: {
    textAlign: 'center',
    color: '#718096',
    fontSize: '0.85rem',
    marginTop: '6px',
  },
  loginLink: {
    fontWeight: '700',
    textDecoration: 'none',
  }
};