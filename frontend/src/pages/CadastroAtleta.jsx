import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api, { mensagemDeErro } from '../api';
import Modal from '../components/Modal';
import ListaSugestoes from '../components/ListaSugestoes';
import SeletorCompeticoes from '../components/SeletorCompeticoes';
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

  // Busca de nomes do histórico importado parecidos com o do atleta, que ele pode vincular à conta.
  // status: 'ocioso' | 'buscando' | 'concluida' | 'erro'; "nome" é o nome a que as sugestões se referem.
  const [busca, setBusca] = useState({ nome: '', sugestoes: [], status: 'ocioso' });
  // Respostas do atleta, uma por nome do histórico: { nomeAtleta, boxOrigem, ids (marcadas), recusados (desmarcadas) }
  const [respostasHistorico, setRespostasHistorico] = useState([]);
  // Nome para o qual o atleta respondeu "Não sou eu" (volta a sugerir se ele mudar o nome)
  const [nomeDispensado, setNomeDispensado] = useState(null);
  const [perguntarHistorico, setPerguntarHistorico] = useState(false);
  // Nome do histórico cujas competições o atleta está conferindo, e de onde ele veio (formulário ou envio)
  const [nomeEmAnalise, setNomeEmAnalise] = useState(null);
  const [analiseAoEnviar, setAnaliseAoEnviar] = useState(false);
  const ultimoNomePesquisado = useRef('');
  const idBuscaAtual = useRef(0);

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const isAtleta = tipoUsuario === 'ATLETA';
  const accentColor = corDoPerfil(tipoUsuario);

  const nomeParaBusca = formData.nomeCompleto.trim().replace(/\s+/g, ' ');
  const buscarHistorico = isAtleta && nomeParaBusca.length >= 3;
  const historicoDispensado = nomeDispensado !== null && nomeDispensado === nomeParaBusca;
  const vinculosFeitos = respostasHistorico.filter((r) => r.ids.length > 0);
  const sugestoesPendentes = busca.sugestoes.filter((s) => !respostasHistorico.some((r) => r.nomeAtleta === s.nomeAtleta));
  const mostrarSugestoes = buscarHistorico && !historicoDispensado && sugestoesPendentes.length > 0;
  const buscaPendente = busca.status === 'buscando' || busca.nome !== nomeParaBusca;

  const pesquisarHistorico = useCallback(async (nome) => {
    const id = ++idBuscaAtual.current;
    ultimoNomePesquisado.current = nome;
    // Mantém as sugestões anteriores na tela enquanto a nova busca não volta, para o cartão não piscar
    setBusca((anterior) => ({ ...anterior, status: 'buscando' }));

    try {
      const { data } = await api.get('/atletas/historico/sugestoes', { params: { nome } });
      const sugestoes = data || [];
      if (id === idBuscaAtual.current) setBusca({ nome, sugestoes, status: 'concluida' });
      return sugestoes;
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      if (id === idBuscaAtual.current) setBusca({ nome, sugestoes: [], status: 'erro' });
      return [];
    }
  }, []);

  // Busca sugestões do histórico enquanto o atleta digita o nome (com atraso de 400 ms)
  useEffect(() => {
    if (!buscarHistorico) return;

    const timer = setTimeout(() => {
      if (ultimoNomePesquisado.current !== nomeParaBusca) pesquisarHistorico(nomeParaBusca);
    }, 400);

    return () => clearTimeout(timer);
  }, [buscarHistorico, nomeParaBusca, pesquisarHistorico]);

  // Ao sair do campo de nome, busca na hora: é quando o atleta terminou de digitar e olha para a tela
  const handleBlurNome = () => {
    if (buscarHistorico && ultimoNomePesquisado.current !== nomeParaBusca) pesquisarHistorico(nomeParaBusca);
  };

  const trocarPerfil = (perfil) => {
    setTipoUsuario(perfil);
    setErro('');
    setRespostasHistorico([]);
  };

  const analisarNome = (item, aoEnviar) => {
    setNomeEmAnalise(item);
    setAnaliseAoEnviar(aoEnviar);
  };

  /** O atleta conferiu as competições de um nome: guarda a resposta e, se veio do envio, conclui o cadastro. */
  const confirmarCompeticoes = ({ ids, recusados }) => {
    const resposta = { nomeAtleta: nomeEmAnalise.nomeAtleta, boxOrigem: nomeEmAnalise.boxOrigem, ids, recusados };
    const respostas = [...respostasHistorico, resposta];
    setRespostasHistorico(respostas);
    setNomeEmAnalise(null);

    // O histórico pode ter vários boxes ("Box A / Box B"): usa o primeiro se o atleta ainda não informou o box
    const boxPrincipal = (resposta.boxOrigem || '').split(' / ')[0].trim();
    if (ids.length > 0 && boxPrincipal && boxPrincipal !== 'N/D') {
      setFormData((prev) => (prev.nomeBox.trim() ? prev : { ...prev, nomeBox: boxPrincipal }));
    }

    if (analiseAoEnviar) {
      setPerguntarHistorico(false);
      enviarCadastro(respostas);
    }
  };

  const desfazerResposta = (nomeAtleta) => {
    setRespostasHistorico((prev) => prev.filter((r) => r.nomeAtleta !== nomeAtleta));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const mascara = MASCARAS[name];
    setFormData({ ...formData, [name]: mascara ? mascara(value) : value });
  };

  const validarFormulario = () => {
    if (!cpfValido(formData.cpf)) return 'CPF inválido. Confira os números digitados.';
    if (formData.senha.length < TAMANHO_MINIMO_SENHA) return `A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
    if (formData.senha !== formData.confirmarSenha) return 'A confirmação de senha não confere.';
    if (!dataBrParaIso(formData.dataNascimento)) return 'Informe uma data de nascimento válida no formato DD/MM/AAAA.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    // Antes de cadastrar, garante que o atleta viu (e respondeu) as competições encontradas no nome dele
    if (buscarHistorico && respostasHistorico.length === 0 && !historicoDispensado) {
      setCarregando(true);
      const sugestoes = busca.status === 'concluida' && busca.nome === nomeParaBusca
        ? busca.sugestoes
        : await pesquisarHistorico(nomeParaBusca);
      setCarregando(false);

      if (sugestoes.length > 0) {
        setPerguntarHistorico(true);
        return;
      }
    }

    enviarCadastro(respostasHistorico);
  };

  const recusarVinculoAoEnviar = () => {
    setPerguntarHistorico(false);
    setNomeDispensado(nomeParaBusca);
    enviarCadastro(respostasHistorico);
  };

  const enviarCadastro = async (respostas) => {
    setCarregando(true);

    try {
      await api.post('/atletas/cadastro', {
        ...formData,
        dataNascimento: dataBrParaIso(formData.dataNascimento),
        perfil: tipoUsuario,
        historicoIds: isAtleta ? respostas.flatMap((r) => r.ids) : [],
        historicoRecusadosIds: isAtleta ? respostas.flatMap((r) => r.recusados) : [],
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
              {/* O Chrome ignora autocomplete="off" em campos que ele reconhece como nome, procurando a palavra
                  "nome" no rótulo, no placeholder e no atributo name. A lista de preenchimento dele cobriria as
                  sugestões do histórico, então nenhum dos três contém a palavra: o rótulo tem um caractere
                  invisível (U+200B) entre "No" e "me" e o campo usa name="identificacao". */}
              <label style={styles.label}>{'No\u200Bme Completo'}</label>
              <input
                type="text"
                name="identificacao"
                placeholder="Ex.: Ana Paula Souza"
                value={formData.nomeCompleto}
                onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                onBlur={handleBlurNome}
                autoComplete="off"
                required
                style={styles.input}
              />
              {isAtleta && vinculosFeitos.length === 0 && (
                <span style={styles.dicaNome}>
                  {!buscarHistorico
                    ? 'Já competiu antes? Digite seu nome como aparecia nas inscrições para trazer seus resultados.'
                    : buscaPendente
                      ? 'Procurando competições anteriores com esse nome…'
                      : busca.status === 'erro'
                        ? 'Não foi possível procurar competições anteriores agora.'
                        : busca.status === 'concluida' && busca.sugestoes.length === 0
                          ? 'Nenhuma competição anterior encontrada com esse nome.'
                          : ''}
                </span>
              )}
            </div>

            {mostrarSugestoes && (
              <div style={styles.sugestoesCard}>
                <div style={styles.sugestoesHeader}>
                  <span>
                    🔍 Encontramos competições anteriores{vinculosFeitos.length > 0 ? ' com nomes parecidos. Usou outra forma do nome?' : ' no seu nome:'}
                  </span>
                  <button type="button" onClick={() => setNomeDispensado(nomeParaBusca)} style={styles.btnNaoSouEu}>
                    {vinculosFeitos.length > 0 ? 'Ocultar' : 'Não sou eu'}
                  </button>
                </div>
                <ListaSugestoes sugestoes={sugestoesPendentes} onEscolher={(item) => analisarNome(item, false)} />
              </div>
            )}

            {vinculosFeitos.length > 0 && (
              <div style={styles.vinculoAtivoCard}>
                <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '0.85rem' }}>✓ Histórico vinculado</span>
                {vinculosFeitos.map((r) => (
                  <div key={r.nomeAtleta} style={styles.vinculoAtivoLinha}>
                    <span style={styles.vinculoAtivoTexto}>
                      <strong>{r.nomeAtleta}</strong> • {r.ids.length} competição(ões)
                    </span>
                    <button type="button" onClick={() => desfazerResposta(r.nomeAtleta)} style={styles.btnDesfazer}>
                      Desfazer
                    </button>
                  </div>
                ))}
                <span style={styles.dicaNome}>Competiu com outro nome? Você também pode vincular depois, pelo seu painel.</span>
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
                  autoComplete="tel-national"
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
                  autoComplete="address-level2"
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
                autoComplete="email"
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
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

      {nomeEmAnalise ? (
        <Modal titulo="Quais competições são suas?" corTitulo="#00ff88" largura={560} onFechar={() => setNomeEmAnalise(null)}>
          <SeletorCompeticoes
            nome={nomeEmAnalise.nomeAtleta}
            onConfirmar={confirmarCompeticoes}
            onVoltar={() => setNomeEmAnalise(null)}
            processando={carregando}
          />
        </Modal>
      ) : perguntarHistorico && (
        <Modal titulo="Você já competiu antes?" corTitulo="#00ff88" largura={480} onFechar={() => setPerguntarHistorico(false)}>
          <p style={styles.textoModal}>
            Encontramos competições anteriores com um nome parecido com <strong>{nomeParaBusca}</strong>.
            Se alguma for sua, vincule para trazer seus resultados para a conta.
          </p>
          <ListaSugestoes sugestoes={sugestoesPendentes} onEscolher={(item) => analisarNome(item, true)} textoBotao="Sou eu, ver competições" />
          <div className="modal-acoes">
            <button type="button" className="botao botao-secundario" onClick={recusarVinculoAoEnviar}>
              Não sou eu, continuar cadastro
            </button>
          </div>
        </Modal>
      )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.78rem',
    color: '#8b949e',
    fontWeight: '600',
  },
  btnNaoSouEu: {
    backgroundColor: 'transparent',
    color: '#8b949e',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '0.72rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  dicaNome: {
    fontSize: '0.75rem',
    color: '#718096',
    minHeight: '1em',
  },
  textoModal: {
    color: '#cbd5e0',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    marginTop: 0,
  },
  vinculoAtivoCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    border: '1px solid #00ff88',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  vinculoAtivoLinha: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
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
