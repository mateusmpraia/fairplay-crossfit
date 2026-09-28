import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CadastroAtleta() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tipoParam = searchParams.get('tipo');
  const tipoInicial = tipoParam && tipoParam.toUpperCase() === 'ORGANIZADOR' ? 'ORGANIZADOR' : 'ATLETA';

  const [tipoUsuario, setTipoUsuario] = useState(tipoInicial);

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

  const [sugestoesHistorico, setSugestoesHistorico] = useState([]);
  const [perfilVinculado, setPerfilVinculado] = useState(null);

  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (tipoParam && (tipoParam.toUpperCase() === 'ATLETA' || tipoParam.toUpperCase() === 'ORGANIZADOR')) {
      setTipoUsuario(tipoParam.toUpperCase());
    }
  }, [tipoParam]);

  useEffect(() => {
    if (tipoUsuario !== 'ATLETA' || perfilVinculado || formData.nomeCompleto.trim().length < 3) {
      setSugestoesHistorico([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(
          `http://localhost:8080/api/atletas/historico/sugestoes?nome=${encodeURIComponent(formData.nomeCompleto.trim())}`
        );
        setSugestoesHistorico(response.data || []);
      } catch (err) {
        console.error("Erro ao buscar histórico:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.nomeCompleto, tipoUsuario, perfilVinculado]);

  const handleSelecionarHistorico = (item) => {
    setPerfilVinculado(item);
    setSugestoesHistorico([]);
    
    let boxPrincipal = item.boxOrigem || '';
    if (boxPrincipal.includes(' / ')) {
      boxPrincipal = boxPrincipal.split(' / ')[0].trim();
    }

    setFormData((prev) => ({
      ...prev,
      nomeBox: boxPrincipal && boxPrincipal !== 'N/D' ? boxPrincipal : prev.nomeBox
    }));
  };

  const handleRemoverVinculo = () => {
    setPerfilVinculado(null);
  };

  const maskCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')       .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')       .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskDate = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')       .replace(/(\d{4})\d+?$/, '$1');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') formattedValue = maskCPF(value);
    if (name === 'celular') formattedValue = maskPhone(value);
    if (name === 'dataNascimento') formattedValue = maskDate(value);

    setFormData({ ...formData, [name]: formattedValue });
  };

  const formatarDataParaIso = (dataBr) => {
    if (!dataBr || dataBr.length !== 10) return null;
    const partes = dataBr.split('/');
    if (partes.length !== 3) return null;

    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const ano = parseInt(partes[2], 10);

    if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return null;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || ano < 1900 || ano > 2100) return null;

    const diaStr = String(dia).padStart(2, '0');
    const mesStr = String(mes).padStart(2, '0');

    return `${ano}-${mesStr}-${diaStr}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    if (formData.senha !== formData.confirmarSenha) {
      setMensagem({ tipo: 'erro', texto: 'A confirmação de senha não confere.' });
      return;
    }

    const dataIso = formatarDataParaIso(formData.dataNascimento);
    if (!dataIso) {
      setMensagem({ tipo: 'erro', texto: 'Informe uma data de nascimento válida no formato DD/MM/AAAA.' });
      return;
    }

    setCarregando(true);

    try {
      const payload = {
        ...formData,
        dataNascimento: dataIso,
        perfil: tipoUsuario,
        historicoNomeAtleta: perfilVinculado ? perfilVinculado.nomeAtleta : null,
        historicoBoxOrigem: perfilVinculado ? perfilVinculado.boxOrigem : null
      };

      const response = await axios.post('http://localhost:8080/api/atletas/cadastro', payload);

      if (response.status === 201) {
        const perfilDescricao = tipoUsuario === 'ORGANIZADOR' ? 'Organizador' : 'Atleta';
        navigate('/login', {
          state: {
            cadastroSucesso: true,
            tipoCadastrado: tipoUsuario,
            mensagem: `Cadastro de ${perfilDescricao} realizado com sucesso! Faça login para continuar.`
          }
        });
      }
    } catch (err) {
      const errorMsg = typeof err.response?.data === 'string'
        ? err.response.data
        : 'Erro ao conectar com o servidor.';
      setMensagem({ tipo: 'erro', texto: errorMsg });
    } finally {
      setCarregando(false);
    }
  };

  const isAtleta = tipoUsuario === 'ATLETA';
  const accentColor = isAtleta ? '#00ff88' : '#00bfff';

  const atletaImg = 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1000';
  const organizadorImg = 'https://images.pexels.com/photos/618612/pexels-photo-618612.jpeg?v=2&auto=compress&cs=tinysrgb&w=1000';

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.cardContainer}>
        {/* Banner Lateral */}
        <div
          style={{
            ...styles.imageBanner,
            backgroundImage: `url("${isAtleta ? atletaImg : organizadorImg}")`
          }}
        >
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
        <div style={styles.formSection}>
          <div style={styles.tabContainer}>
            <button
              type="button"
              onClick={() => {
                setTipoUsuario('ATLETA');
                setMensagem({ tipo: '', texto: '' });
                setPerfilVinculado(null);
              }}
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
              onClick={() => {
                setTipoUsuario('ORGANIZADOR');
                setMensagem({ tipo: '', texto: '' });
                setPerfilVinculado(null);
                setSugestoesHistorico([]);
              }}
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
            <h1 style={styles.title}>
              {isAtleta ? 'Cadastro de Atleta' : 'Cadastro de Organizador'}
            </h1>
            <p style={styles.subtitle}>
              {isAtleta
                ? 'Preencha seus dados para competir nas arenas'
                : 'Preencha seus dados para gerenciar campeonatos'}
            </p>
          </div>

          {mensagem.texto && (
            <div
              style={{
                ...styles.alert,
                backgroundColor:
                  mensagem.tipo === 'sucesso'
                    ? 'rgba(0, 255, 136, 0.1)'
                    : 'rgba(255, 68, 68, 0.1)',
                borderColor: mensagem.tipo === 'sucesso' ? accentColor : '#ff4444',
                color: mensagem.tipo === 'sucesso' ? accentColor : '#ff4444',
              }}
            >
              {mensagem.texto}
            </div>
          )}

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

            {isAtleta && sugestoesHistorico.length > 0 && !perfilVinculado && (
              <div style={styles.sugestoesCard}>
                <div style={styles.sugestoesHeader}>
                  <span>🔍 Encontramos competições anteriores no seu nome:</span>
                </div>
                {sugestoesHistorico.map((item, idx) => (
                  <div key={idx} style={styles.sugestaoItem}>
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
                  onClick={handleRemoverVinculo}
                  style={styles.btnDesfazer}
                >
                  Desfazer
                </button>
              </div>
            )}

            <div style={styles.row}>
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

            <div style={styles.row}>
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

            <div style={styles.row}>
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

            <div style={styles.row}>
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
              <a href="/login" style={{ ...styles.loginLink, color: accentColor }}>
                Faça login aqui
              </a>
            </p>
          </form>
        </div>
      </div>
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
    maxWidth: '1020px',
    height: '740px',
    backgroundColor: '#111418',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #22272e',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
  },
  imageBanner: {
    flex: '0.9',
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
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
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
  row: {
    display: 'flex',
    gap: '12px',
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