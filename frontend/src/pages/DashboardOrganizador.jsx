import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { mensagemDeErro, encerrarSessao } from '../api';
import { mascaraData, dataBrParaIso, dataIsoParaBr, formatarCpf } from '../utils/formatacao';
import { baixarPlanilha } from '../utils/exportacao';
import Modal from '../components/Modal';
import Alerta from '../components/Alerta';
import ModalConfirmacao from '../components/ModalConfirmacao';
import ModalTrocarSenha from '../components/ModalTrocarSenha';
import ImportacaoCpfs from '../components/ImportacaoCpfs';

const FORMATOS = ['Individual', 'Dupla', 'Trio', 'Time'];
const GENEROS = ['Masculino', 'Feminino', 'Misto'];
const NIVEIS = ['Iniciante', 'Scale', 'Intermediário', 'RX', 'Elite', 'Master'];

const CATEGORIA_PADRAO = { formato: 'Individual', genero: 'Masculino', nivel: 'Scale' };

const EVENTO_VAZIO = {
  nome: '',
  dataInicio: '',
  dataFim: '',
  localizacao: '',
  regraCampeaoSobe: true,
  regraTresPodiosSobe: true,
  regraTresParticipacoesSobe: false,
  categorias: []
};

/** Critérios de promoção obrigatória: rótulo curto (painel do evento) e longo (criação do evento). */
const REGRAS = [
  { campo: 'regraCampeaoSobe', rotuloCurto: 'Já foi campeão', rotuloLongo: 'Já foi campeão na categoria anterior' },
  { campo: 'regraTresPodiosSobe', rotuloCurto: '3 pódios na categoria', rotuloLongo: 'Já conquistou 3 pódios na categoria anterior' },
  { campo: 'regraTresParticipacoesSobe', rotuloCurto: '3 participações', rotuloLongo: 'Já participou 3x da mesma categoria' },
];

const SEM_FEEDBACK = { tipo: '', texto: '' };

const descreverCategoria = (categoria) => `${categoria.formato} • ${categoria.genero} • ${categoria.nivel}`;

/** Se o termo for um CPF completo, prefere o atleta com esse CPF; senão, o primeiro da lista. */
function escolherAtleta(lista, termo) {
  const cpfDigitado = termo.replace(/\D/g, '');
  if (cpfDigitado.length === 11) {
    const exato = lista.find((a) => (a.cpf || '').replace(/\D/g, '') === cpfDigitado);
    if (exato) return exato;
  }
  return lista[0];
}

/** "Cidade/UF" ou vazio (atletas do histórico não têm cidade). */
const cidadeUf = (pessoa) => (pessoa?.cidade ? `${pessoa.cidade}/${pessoa.estado}` : '');

function Opcoes({ valores }) {
  return valores.map((valor) => <option key={valor} value={valor}>{valor}</option>);
}

export default function DashboardOrganizador() {
  const navigate = useNavigate();
  const organizadorNome = localStorage.getItem('usuarioNome') || 'Organizador';

  const [eventos, setEventos] = useState([]);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [inscritos, setInscritos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Criação de evento
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [erroModalEvento, setErroModalEvento] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [novoEvento, setNovoEvento] = useState(EVENTO_VAZIO);
  const [novaCatCriacao, setNovaCatCriacao] = useState(CATEGORIA_PADRAO);

  // Nova categoria em evento existente, importação por planilha e troca de senha
  const [modalAddCatAberto, setModalAddCatAberto] = useState(false);
  const [novaCatExistente, setNovaCatExistente] = useState(CATEGORIA_PADRAO);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);

  // Busca e inscrição de atletas
  const [termoBuscaAtleta, setTermoBuscaAtleta] = useState('');
  const [sugestoesAtletas, setSugestoesAtletas] = useState([]);
  const [feedbackInscricao, setFeedbackInscricao] = useState(SEM_FEEDBACK);
  const [inscrevendo, setInscrevendo] = useState(false);

  // Resultados: colocações digitadas e ainda não salvas, por id da inscrição
  const [colocacoesEditadas, setColocacoesEditadas] = useState({});
  const [salvandoResultados, setSalvandoResultados] = useState(false);

  // Confirmações de exclusão: o modal fica aberto enquanto o item estiver definido
  const [eventoParaExcluir, setEventoParaExcluir] = useState(null);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null);
  const [inscricaoParaExcluir, setInscricaoParaExcluir] = useState(null);
  const [processandoAcao, setProcessandoAcao] = useState(false);

  // Inscrições cuja auditoria mudou sozinha (o histórico do atleta mudou depois da inscrição), por categoria
  const [alteracoes, setAlteracoes] = useState([]);
  const carregarAlteracoes = useCallback(() => {
    api.get('/eventos/alteracoes-auditoria')
      .then(({ data }) => setAlteracoes(data || []))
      .catch(() => {});
  }, []);
  const alteracoesDoEvento = (eventoId) =>
    alteracoes.filter((a) => a.eventoId === eventoId).reduce((total, a) => total + a.quantidade, 0);
  const alteracoesDaCategoria = (categoriaId) => alteracoes.find((a) => a.categoriaId === categoriaId)?.quantidade || 0;

  const termoBusca = termoBuscaAtleta.trim();
  const buscaAtiva = termoBusca.length >= 3;
  const sugestoesVisiveis = buscaAtiva ? sugestoesAtletas : [];

  const limparBusca = () => {
    setTermoBuscaAtleta('');
    setSugestoesAtletas([]);
  };

  const selecionarCategoria = useCallback(async (categoria) => {
    setCategoriaSelecionada(categoria);
    carregarAlteracoes();
    setTermoBuscaAtleta('');
    setSugestoesAtletas([]);
    setColocacoesEditadas({});
    try {
      const { data } = await api.get(`/eventos/categorias/${categoria.id}/inscricoes`);
      setInscritos(data || []);
    } catch (err) {
      console.error('Erro ao carregar inscritos:', err);
    }
  }, [carregarAlteracoes]);

  const selecionarEvento = useCallback((evento) => {
    setEventoSelecionado(evento);
    if (evento.categorias?.length > 0) {
      selecionarCategoria(evento.categorias[0]);
    } else {
      setCategoriaSelecionada(null);
      setInscritos([]);
    }
  }, [selecionarCategoria]);

  const limparSelecao = () => {
    setEventoSelecionado(null);
    setCategoriaSelecionada(null);
    setInscritos([]);
  };

  /** Substitui o evento alterado tanto na seleção atual quanto na lista lateral. */
  const atualizarEvento = (eventoAtualizado) => {
    setEventoSelecionado(eventoAtualizado);
    setEventos((prev) => prev.map((ev) => (ev.id === eventoAtualizado.id ? eventoAtualizado : ev)));
  };

  useEffect(() => {
    api.get('/eventos')
      .then(({ data }) => {
        const lista = data || [];
        setEventos(lista);
        if (lista.length > 0) selecionarEvento(lista[0]);
      })
      .catch((err) => console.error('Erro ao carregar eventos:', err))
      .finally(() => setCarregando(false));
  }, [selecionarEvento]);

  // Busca de atletas enquanto o organizador digita (com atraso de 300 ms)
  useEffect(() => {
    if (!buscaAtiva) return;

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/eventos/atletas/buscar', { params: { termo: termoBusca } });
        setSugestoesAtletas(data || []);
      } catch (err) {
        console.error('Erro na busca de atletas:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [buscaAtiva, termoBusca]);

  // ---------------------------------------------------------------- Inscrições

  /**
   * Motivo pelo qual o atleta não pode ser inscrito na categoria selecionada, ou null se puder.
   * Mesma regra do backend: só bloqueia masculino em categoria feminina e vice-versa
   * (gênero "Outro" e atletas do histórico, sem gênero conhecido, são aceitos).
   */
  const verificarImpedimento = (atleta) => {
    const generoCategoria = (categoriaSelecionada.genero || '').toUpperCase();
    const generoAtleta = (atleta.genero || '').toUpperCase();

    if (!generoCategoria.includes('MIST')) {
      if (generoCategoria.includes('MASC') && generoAtleta.startsWith('F')) {
        return { tipo: 'erro', texto: `O atleta ${atleta.nomeCompleto} (Feminino) não pode ser inscrito em uma categoria masculina.` };
      }
      if (generoCategoria.includes('FEM') && generoAtleta.startsWith('M')) {
        return { tipo: 'erro', texto: `O atleta ${atleta.nomeCompleto} (Masculino) não pode ser inscrito em uma categoria feminina.` };
      }
    }

    if (inscritos.some((ins) => ins.atleta?.id === atleta.id)) {
      return { tipo: 'aviso', texto: `O atleta ${atleta.nomeCompleto} já está cadastrado nesta categoria.` };
    }

    return null;
  };

  const handleInscreverAtleta = async (atleta) => {
    if (!atleta || !categoriaSelecionada || inscrevendo) return;

    limparBusca();

    const impedimento = verificarImpedimento(atleta);
    if (impedimento) {
      setFeedbackInscricao(impedimento);
      return;
    }

    setFeedbackInscricao(SEM_FEEDBACK);
    setInscrevendo(true);

    try {
      const { data } = await api.post('/eventos/inscricoes', {
        categoriaEventoId: categoriaSelecionada.id,
        atletaId: atleta.id
      });

      setInscritos((prev) => [data, ...prev]);
      setFeedbackInscricao({
        tipo: data.statusElegibilidade === 'REGULAR' ? 'sucesso' : 'aviso',
        texto: `Atleta ${atleta.nomeCompleto} inscrito com status: ${data.statusElegibilidade}`
      });
    } catch (err) {
      setFeedbackInscricao({ tipo: 'erro', texto: mensagemDeErro(err, 'Erro ao inscrever atleta.') });
    } finally {
      setInscrevendo(false);
    }
  };

  // Enter no campo de busca inscreve o melhor resultado (buscando na hora se ainda não houver sugestões)
  const handleKeyDownBusca = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (!categoriaSelecionada || inscrevendo || !buscaAtiva) return;

    if (sugestoesVisiveis.length > 0) {
      handleInscreverAtleta(escolherAtleta(sugestoesVisiveis, termoBusca));
      return;
    }

    try {
      setInscrevendo(true);
      const { data } = await api.get('/eventos/atletas/buscar', { params: { termo: termoBusca } });
      const lista = data || [];
      if (lista.length > 0) {
        handleInscreverAtleta(escolherAtleta(lista, termoBusca));
      } else {
        setFeedbackInscricao({ tipo: 'erro', texto: 'Nenhum atleta encontrado com este nome ou CPF.' });
      }
    } catch {
      setFeedbackInscricao({ tipo: 'erro', texto: 'Erro ao buscar atleta para inscrição.' });
    } finally {
      setInscrevendo(false);
    }
  };

  /** Acrescenta à tabela os atletas inscritos pela importação de planilha. */
  const handleInscritosPorPlanilha = (novos) => {
    if (novos.length === 0) return;
    setInscritos((prev) => [...novos, ...prev]);
    setFeedbackInscricao({
      tipo: 'sucesso',
      texto: `${novos.length} ${novos.length === 1 ? 'atleta inscrito' : 'atletas inscritos'} pela planilha.`
    });
  };

  const confirmarExclusaoInscricao = async () => {
    setProcessandoAcao(true);
    try {
      await api.delete(`/eventos/inscricoes/${inscricaoParaExcluir.id}`);
      setInscritos((prev) => prev.filter((ins) => ins.id !== inscricaoParaExcluir.id));
      setInscricaoParaExcluir(null);
      carregarAlteracoes();
      setFeedbackInscricao({ tipo: 'sucesso', texto: 'Atleta removido da categoria com sucesso.' });
    } catch (err) {
      alert(mensagemDeErro(err, 'Não foi possível remover o atleta.'));
    } finally {
      setProcessandoAcao(false);
    }
  };

  /** O organizador viu que a auditoria mudou: a inscrição deixa de aparecer em destaque. */
  const marcarCiente = async (inscricao) => {
    try {
      const { data } = await api.post(`/eventos/inscricoes/${inscricao.id}/ciente`);
      setInscritos((prev) => prev.map((ins) => (ins.id === data.id ? data : ins)));
      carregarAlteracoes();
    } catch (err) {
      setFeedbackInscricao({ tipo: 'erro', texto: mensagemDeErro(err, 'Não foi possível registrar a ciência.') });
    }
  };

  // ---------------------------------------------------------------- Resultados e exportação

  const colocacaoExibida = (ins) => colocacoesEditadas[ins.id] ?? (ins.colocacao ?? '');
  const haResultadosNaoSalvos = Object.keys(colocacoesEditadas).length > 0;

  const handleColocacao = (inscricaoId, valor) => {
    setColocacoesEditadas((prev) => ({ ...prev, [inscricaoId]: valor.replace(/\D/g, '').slice(0, 4) }));
  };

  /** Grava as colocações da categoria; elas passam a contar no histórico dos atletas. */
  const handleSalvarResultados = async () => {
    const resultados = inscritos.map((ins) => {
      const valor = String(colocacaoExibida(ins)).trim();
      return { inscricaoId: ins.id, colocacao: valor === '' ? null : Number(valor) };
    });
    if (resultados.some((r) => r.colocacao !== null && r.colocacao < 1)) {
      setFeedbackInscricao({ tipo: 'erro', texto: 'A colocação deve ser um número a partir de 1.' });
      return;
    }

    setSalvandoResultados(true);
    try {
      const { data } = await api.put(`/eventos/categorias/${categoriaSelecionada.id}/resultados`, { resultados });
      const atualizadas = new Map(data.map((ins) => [ins.id, ins]));
      setInscritos((prev) => prev.map((ins) => atualizadas.get(ins.id) || ins));
      setColocacoesEditadas({});
      carregarAlteracoes();
      setFeedbackInscricao({ tipo: 'sucesso', texto: 'Resultados salvos. Eles já contam no histórico dos atletas.' });
    } catch (err) {
      setFeedbackInscricao({ tipo: 'erro', texto: mensagemDeErro(err, 'Erro ao salvar os resultados.') });
    } finally {
      setSalvandoResultados(false);
    }
  };

  const handleExportar = () => {
    const linhas = inscritos.map((ins) => ({
      Atleta: ins.atleta?.nomeCompleto || '',
      CPF: ins.atleta?.cpf || '',
      'Box / CT': ins.atleta?.nomeBox || '',
      'Cidade/UF': cidadeUf(ins.atleta),
      'Status da auditoria': ins.statusElegibilidade === 'REGULAR' ? 'Regular' : 'Irregular',
      'Categoria recomendada': ins.categoriaRecomendada || '',
      Diagnóstico: ins.motivoIrregularidade || '',
      Colocação: ins.colocacao ?? '',
    }));
    baixarPlanilha(
      `${eventoSelecionado.nome} - ${categoriaSelecionada.formato} ${categoriaSelecionada.genero} ${categoriaSelecionada.nivel}`,
      'Inscritos',
      linhas,
      [30, 16, 24, 18, 18, 20, 60, 10]
    );
  };

  // ---------------------------------------------------------------- Regras e categorias do evento

  /** Liga/desliga um critério de promoção; o backend refaz a auditoria de todos os inscritos. */
  const handleToggleRegra = async (campo) => {
    if (!eventoSelecionado) return;

    const regras = {
      regraCampeaoSobe: eventoSelecionado.regraCampeaoSobe,
      regraTresPodiosSobe: eventoSelecionado.regraTresPodiosSobe,
      regraTresParticipacoesSobe: eventoSelecionado.regraTresParticipacoesSobe,
      [campo]: !eventoSelecionado[campo],
    };

    try {
      const { data } = await api.put(`/eventos/${eventoSelecionado.id}/regras`, regras);
      atualizarEvento({ ...eventoSelecionado, ...data, categorias: eventoSelecionado.categorias });

      if (categoriaSelecionada) {
        const resInscritos = await api.get(`/eventos/categorias/${categoriaSelecionada.id}/inscricoes`);
        setInscritos(resInscritos.data || []);
      }
      carregarAlteracoes();

      setFeedbackInscricao({ tipo: 'sucesso', texto: 'Critérios atualizados e auditoria recalculada para todos os atletas.' });
    } catch (err) {
      alert(mensagemDeErro(err, 'Erro ao atualizar regras do torneio.'));
    }
  };

  const handleSalvarNovaCategoriaExistente = async (e) => {
    e.preventDefault();
    if (!eventoSelecionado) return;

    try {
      const { data: categoriaCriada } = await api.post(`/eventos/${eventoSelecionado.id}/categorias`, novaCatExistente);
      atualizarEvento({
        ...eventoSelecionado,
        categorias: [...(eventoSelecionado.categorias || []), categoriaCriada]
      });
      setModalAddCatAberto(false);
      selecionarCategoria(categoriaCriada);
    } catch (err) {
      alert(mensagemDeErro(err, 'Erro ao incluir nova categoria no torneio.'));
    }
  };

  const confirmarExclusaoCategoria = async () => {
    setProcessandoAcao(true);
    try {
      await api.delete(`/eventos/categorias/${categoriaParaExcluir.id}`);
      const categoriasRestantes = eventoSelecionado.categorias.filter((c) => c.id !== categoriaParaExcluir.id);
      atualizarEvento({ ...eventoSelecionado, categorias: categoriasRestantes });
      setCategoriaParaExcluir(null);
      carregarAlteracoes();

      if (categoriasRestantes.length > 0) {
        selecionarCategoria(categoriasRestantes[0]);
      } else {
        setCategoriaSelecionada(null);
        setInscritos([]);
      }
    } catch (err) {
      alert(mensagemDeErro(err, 'Erro ao excluir categoria.'));
    } finally {
      setProcessandoAcao(false);
    }
  };

  // ---------------------------------------------------------------- Eventos

  const confirmarExclusaoEvento = async () => {
    setProcessandoAcao(true);
    try {
      await api.delete(`/eventos/${eventoParaExcluir.id}`);
      const eventosRestantes = eventos.filter((ev) => ev.id !== eventoParaExcluir.id);
      setEventos(eventosRestantes);
      setEventoParaExcluir(null);
      carregarAlteracoes();

      if (eventosRestantes.length > 0) {
        selecionarEvento(eventosRestantes[0]);
      } else {
        limparSelecao();
      }
    } catch (err) {
      alert(mensagemDeErro(err, 'Erro ao excluir evento.'));
    } finally {
      setProcessandoAcao(false);
    }
  };

  const abrirModalCriar = () => {
    setErroModalEvento('');
    setModalCriarAberto(true);
  };

  const fecharModalCriar = () => {
    setModalCriarAberto(false);
    setErroModalEvento('');
  };

  const alterarNovoEvento = (campo, valor) => {
    setNovoEvento((prev) => ({ ...prev, [campo]: valor }));
    setErroModalEvento('');
  };

  const handleSalvarNovoEvento = async (e) => {
    e.preventDefault();
    setErroModalEvento('');

    const dataInicio = dataBrParaIso(novoEvento.dataInicio);
    const dataFim = novoEvento.dataFim ? dataBrParaIso(novoEvento.dataFim) : null;

    if (novoEvento.nome.trim().length < 3) {
      setErroModalEvento('Informe um nome com pelo menos 3 letras para o evento.');
      return;
    }
    if (!dataInicio) {
      setErroModalEvento('Informe a data de início no formato DD/MM/AAAA.');
      return;
    }
    if (novoEvento.dataFim && !dataFim) {
      setErroModalEvento('Informe a data de término no formato DD/MM/AAAA ou deixe em branco.');
      return;
    }
    if (novoEvento.categorias.length === 0) {
      setErroModalEvento('Adicione pelo menos uma categoria ao evento.');
      return;
    }

    setSalvando(true);

    try {
      const { data } = await api.post('/eventos', { ...novoEvento, dataInicio, dataFim });
      setEventos((prev) => [data, ...prev]);
      selecionarEvento(data);
      fecharModalCriar();
      setNovoEvento(EVENTO_VAZIO);
    } catch (err) {
      setErroModalEvento(mensagemDeErro(err, 'Erro ao criar torneio no servidor.'));
    } finally {
      setSalvando(false);
    }
  };

  const handleLogout = () => {
    encerrarSessao();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <header className="barra-topo">
        <div style={styles.navLeft}>
          <span style={styles.brand}>FairPlay</span>
          <span style={styles.roleBadge}>Organizador</span>
        </div>
        <div className="barra-topo-acoes">
          <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Olá, <strong>{organizadorNome}</strong></span>
          <button onClick={abrirModalCriar} className="botao botao-azul">+ Criar novo evento</button>
          <button onClick={() => setModalSenhaAberto(true)} className="botao botao-secundario">🔑 Trocar senha</button>
          <button onClick={handleLogout} className="botao botao-secundario">Sair</button>
        </div>
      </header>

      <div className="painel-organizador">
        {/* Lista de eventos */}
        <aside className="painel-organizador-lateral" style={styles.sidebarEventos}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Meus torneios</h3>
            <span style={styles.badgeContador}>{eventos.length}</span>
          </div>

          {carregando ? (
            <p style={{ color: '#718096', fontSize: '0.85rem' }}>Carregando torneios...</p>
          ) : eventos.length === 0 ? (
            <div style={styles.emptySidebar}>
              <p style={{ color: '#718096', fontSize: '0.85rem', margin: 0 }}>Nenhum torneio criado ainda.</p>
              <button onClick={abrirModalCriar} style={styles.btnCriarPrimeiro}>Criar primeiro evento</button>
            </div>
          ) : (
            eventos.map((ev) => {
              const isSelected = eventoSelecionado?.id === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => selecionarEvento(ev)}
                  style={{
                    ...styles.eventoCard,
                    borderColor: isSelected ? '#00bfff' : '#22272e',
                    backgroundColor: isSelected ? 'rgba(0, 191, 255, 0.06)' : '#111418',
                    boxShadow: isSelected ? '0 4px 14px rgba(0, 191, 255, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h4 style={{ ...styles.eventoCardNome, color: isSelected ? '#00bfff' : '#ffffff' }}>{ev.nome}</h4>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventoParaExcluir(ev);
                      }}
                      style={styles.btnExcluirEventoMini}
                      title="Excluir evento"
                    >
                      Excluir
                    </button>
                  </div>
                  <div style={styles.eventoCardMeta}>
                    <span>📅 {dataIsoParaBr(ev.dataInicio)}</span>
                    <span>📍 {ev.localizacao || 'Local a definir'}</span>
                  </div>
                  {alteracoesDoEvento(ev.id) > 0 && (
                    <span style={styles.badgeAlteracao}>⚠ {alteracoesDoEvento(ev.id)} mudança(s) na auditoria</span>
                  )}
                </div>
              );
            })
          )}
        </aside>

        {/* Gestão do evento selecionado */}
        <main className="painel-organizador-conteudo">
          {eventoSelecionado ? (
            <>
              <div style={styles.eventoHeader}>
                <div>
                  <span style={styles.labelSub}>Painel de auditoria do evento</span>
                  <h1 style={styles.eventoNomeTitulo}>{eventoSelecionado.nome}</h1>
                  <p style={styles.eventoInfoDetalhe}>
                    📍 {eventoSelecionado.localizacao || 'Arena Oficial'} • 📅 Data: <strong>{dataIsoParaBr(eventoSelecionado.dataInicio)}</strong>
                  </p>
                </div>

                <div style={styles.regrasBox}>
                  <span style={styles.regrasTitulo}>Critérios para promoção obrigatória:</span>
                  <div style={styles.regrasCheckboxesContainer}>
                    {REGRAS.map(({ campo, rotuloCurto }) => (
                      <label key={campo} style={styles.checkboxRegraInline}>
                        <input
                          type="checkbox"
                          checked={eventoSelecionado[campo]}
                          onChange={() => handleToggleRegra(campo)}
                        />
                        <span>{rotuloCurto}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Categorias do evento */}
              <div style={styles.categoriasNavContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '10px' }}>
                  <span style={styles.categoriasNavLabel}>Categorias do evento:</span>
                  <button type="button" onClick={() => setModalAddCatAberto(true)} style={styles.btnAdicionarCategoria}>
                    + Adicionar categoria
                  </button>
                </div>

                <div style={styles.categoriasNav}>
                  {eventoSelecionado.categorias?.map((cat) => {
                    const ativa = categoriaSelecionada?.id === cat.id;
                    return (
                      <div
                        key={cat.id}
                        style={{
                          ...styles.categoriaPill,
                          backgroundColor: ativa ? '#00bfff' : '#111418',
                          borderColor: ativa ? '#00bfff' : '#2d3748',
                        }}
                      >
                        <span
                          onClick={() => selecionarCategoria(cat)}
                          style={{
                            cursor: 'pointer',
                            color: ativa ? '#000000' : '#cbd5e0',
                            fontWeight: ativa ? '800' : '600',
                            fontSize: '0.82rem'
                          }}
                        >
                          {descreverCategoria(cat)}
                          {alteracoesDaCategoria(cat.id) > 0 && (
                            <span style={styles.pillAlteracao} title="Inscrições cuja auditoria mudou depois da inscrição">
                              ⚠ {alteracoesDaCategoria(cat.id)}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoriaParaExcluir(cat);
                          }}
                          style={{ ...styles.btnExcluirCatPill, color: ativa ? '#7a0000' : '#ff4444' }}
                          title="Excluir categoria do evento"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inscrições da categoria selecionada */}
              {categoriaSelecionada && (
                <div style={styles.gestaoInscricoesCard}>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
                      Inscrições: <span style={{ color: '#00bfff' }}>{categoriaSelecionada.formato} {categoriaSelecionada.genero} ({categoriaSelecionada.nivel})</span>
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#718096' }}>
                      Digite pelo menos 3 caracteres do nome ou CPF do atleta para buscar e pressione <strong>Enter</strong> ou clique para inscrever.
                      Para inscrever vários de uma vez, importe uma planilha com a coluna <strong>CPF</strong>.
                      Depois do evento, preencha a <strong>colocação</strong> de cada atleta e salve os resultados.
                    </p>
                  </div>

                  <div className="linha-ferramentas" style={{ marginBottom: '18px' }}>
                    <div style={{ position: 'relative', flex: '1 1 280px' }}>
                      <input
                        type="text"
                        placeholder="Digite pelo menos 3 letras ou o CPF do atleta para buscar..."
                        value={termoBuscaAtleta}
                        onChange={(e) => setTermoBuscaAtleta(e.target.value)}
                        onKeyDown={handleKeyDownBusca}
                        style={styles.inputBusca}
                      />

                      {sugestoesVisiveis.length > 0 && (
                        <div style={styles.dropdownSugestoes}>
                          {sugestoesVisiveis.map((a) => (
                            <div key={a.id} onClick={() => handleInscreverAtleta(a)} style={styles.dropdownItem}>
                              <div>
                                <span style={styles.dropdownNome}>
                                  {a.nomeCompleto}{' '}
                                  {a.cpf && (
                                    <span style={{ fontSize: '0.78rem', color: '#00bfff', fontWeight: 'normal' }}>
                                      (CPF: {formatarCpf(a.cpf)})
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.75rem', color: '#ffd700', marginLeft: '8px', fontWeight: 'bold' }}>
                                    📊 {a.totalHistoricos || 0} histórico(s)
                                  </span>
                                </span>
                                <span style={styles.dropdownBox}>
                                  Box: {a.nomeBox || 'Sem Box'}{cidadeUf(a) ? ` • ${cidadeUf(a)}` : ''}
                                  {a.perfil === 'HISTORICO' && ' • só no histórico (sem cadastro)'}
                                </span>
                              </div>
                              <span style={styles.badgeInscreverDireto}>+ Inscrever</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => setModalImportarAberto(true)} className="botao botao-contorno-azul">
                      📄 Importar planilha
                    </button>
                    <button type="button" onClick={handleExportar} disabled={inscritos.length === 0} className="botao botao-secundario">
                      ⬇ Exportar Excel
                    </button>
                  </div>

                  <Alerta tipo={feedbackInscricao.tipo} style={{ marginBottom: '16px' }}>{feedbackInscricao.texto}</Alerta>
                  <Alerta tipo="aviso" style={{ marginBottom: '16px' }}>
                    {alteracoesDaCategoria(categoriaSelecionada.id) > 0 &&
                      `⚠ ${alteracoesDaCategoria(categoriaSelecionada.id)} inscrição(ões) desta categoria mudaram de status depois da inscrição, porque o histórico do atleta foi atualizado (novo vínculo, resultado lançado ou nome alterado). Confira e marque "Ciente".`}
                  </Alerta>

                  <div className="tabela-rolavel">
                    <table style={styles.tabela}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th style={styles.th}>Atleta</th>
                          <th style={styles.th}>Box / CT</th>
                          <th style={styles.th}>Categoria recomendada</th>
                          <th style={styles.th}>Status da auditoria</th>
                          <th style={styles.th}>Diagnóstico</th>
                          <th style={styles.th}>Colocação</th>
                          <th style={{ ...styles.th, textAlign: 'center' }}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inscritos.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#718096', fontSize: '0.9rem' }}>
                              Nenhum atleta inscrito nesta categoria até o momento.
                            </td>
                          </tr>
                        ) : (
                          inscritos.map((ins) => {
                            const isRegular = ins.statusElegibilidade === 'REGULAR';
                            const categoriaRecomendada = ins.categoriaRecomendada || (isRegular ? categoriaSelecionada.nivel : 'Consulte regras');

                            return (
                              <tr key={ins.id} style={ins.auditoriaAlteradaEm ? { ...styles.tr, ...styles.trAlterada } : styles.tr}>
                                <td style={{ ...styles.td, fontWeight: '700', color: '#ffffff' }}>
                                  {ins.atleta?.nomeCompleto}
                                </td>
                                <td style={styles.td}>
                                  {ins.atleta?.nomeBox || 'N/D'}{' '}
                                  {cidadeUf(ins.atleta) && <small style={{ color: '#718096' }}>({cidadeUf(ins.atleta)})</small>}
                                </td>
                                <td style={styles.td}>
                                  <span style={styles.badgeCategoriaRec}>⭐ {categoriaRecomendada}</span>
                                </td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.statusBadge,
                                    backgroundColor: isRegular ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 68, 68, 0.12)',
                                    color: isRegular ? '#00ff88' : '#ff4444',
                                    borderColor: isRegular ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 68, 68, 0.4)'
                                  }}>
                                    {isRegular ? '● Regular' : '▲ Irregular'}
                                  </span>
                                  {ins.auditoriaAlteradaEm && (
                                    <div style={styles.alteracaoAuditoria}>
                                      <span>
                                        Era {ins.statusAnterior === 'REGULAR' ? 'Regular' : 'Irregular'}; mudou em{' '}
                                        {new Date(ins.auditoriaAlteradaEm).toLocaleDateString('pt-BR')} após atualização do histórico do atleta.
                                      </span>
                                      <button type="button" className="link-botao" style={{ color: '#ffa500' }} onClick={() => marcarCiente(ins)}>
                                        Ciente
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td style={{ ...styles.td, fontSize: '0.82rem', color: isRegular ? '#a0aec0' : '#ffa500' }}>
                                  {ins.motivoIrregularidade || 'Cumpre todos os requisitos do regulamento.'}
                                </td>
                                <td style={styles.td}>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    aria-label={`Colocação de ${ins.atleta?.nomeCompleto}`}
                                    placeholder="—"
                                    value={colocacaoExibida(ins)}
                                    onChange={(e) => handleColocacao(ins.id, e.target.value)}
                                    style={styles.inputColocacao}
                                  />
                                </td>
                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                  <button
                                    onClick={() => setInscricaoParaExcluir(ins)}
                                    style={styles.btnExcluirAtleta}
                                    title="Remover da categoria"
                                  >
                                    Excluir atleta
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {inscritos.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                      {haResultadosNaoSalvos && <span style={{ color: '#ffd700', fontSize: '0.8rem' }}>Há colocações não salvas.</span>}
                      <button
                        type="button"
                        onClick={handleSalvarResultados}
                        disabled={!haResultadosNaoSalvos || salvandoResultados}
                        className="botao botao-verde"
                      >
                        {salvandoResultados ? 'Salvando...' : '🏆 Salvar resultados'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyMain}>
              <span style={{ fontSize: '2rem' }}>📋</span>
              <h3 style={{ color: '#cbd5e0', marginTop: '10px' }}>Nenhum torneio selecionado</h3>
              <p style={{ color: '#718096', fontSize: '0.88rem' }}>Selecione um torneio na barra lateral ou cadastre um novo evento.</p>
            </div>
          )}
        </main>
      </div>

      {eventoParaExcluir && (
        <ModalConfirmacao
          titulo="Excluir evento"
          textoConfirmar="Sim, excluir evento"
          textoProcessando="Excluindo..."
          processando={processandoAcao}
          onConfirmar={confirmarExclusaoEvento}
          onCancelar={() => setEventoParaExcluir(null)}
        >
          Tem certeza de que deseja excluir o evento <strong>{eventoParaExcluir.nome}</strong> em definitivo? Todas as categorias e inscrições vinculadas serão apagadas.
        </ModalConfirmacao>
      )}

      {categoriaParaExcluir && (
        <ModalConfirmacao
          titulo="Excluir categoria"
          textoConfirmar="Sim, excluir categoria"
          textoProcessando="Excluindo..."
          processando={processandoAcao}
          onConfirmar={confirmarExclusaoCategoria}
          onCancelar={() => setCategoriaParaExcluir(null)}
        >
          Tem certeza de que deseja remover a categoria <strong>{descreverCategoria(categoriaParaExcluir)}</strong> deste torneio?
        </ModalConfirmacao>
      )}

      {inscricaoParaExcluir && (
        <ModalConfirmacao
          titulo="Remover atleta da categoria"
          textoConfirmar="Sim, remover atleta"
          textoProcessando="Removendo..."
          processando={processandoAcao}
          onConfirmar={confirmarExclusaoInscricao}
          onCancelar={() => setInscricaoParaExcluir(null)}
        >
          Tem certeza de que deseja remover o atleta <strong>{inscricaoParaExcluir.atleta?.nomeCompleto}</strong> desta categoria?
        </ModalConfirmacao>
      )}

      {modalImportarAberto && categoriaSelecionada && (
        <ImportacaoCpfs
          categoria={categoriaSelecionada}
          onInscritos={handleInscritosPorPlanilha}
          onFechar={() => setModalImportarAberto(false)}
        />
      )}

      {modalSenhaAberto && <ModalTrocarSenha onFechar={() => setModalSenhaAberto(false)} />}

      {modalAddCatAberto && (
        <Modal titulo="Adicionar categoria ao torneio" onFechar={() => setModalAddCatAberto(false)}>
          <form onSubmit={handleSalvarNovaCategoriaExistente} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label className="campo">
              <span className="campo-rotulo">Formato</span>
              <select
                value={novaCatExistente.formato}
                onChange={(e) => setNovaCatExistente({ ...novaCatExistente, formato: e.target.value })}
                style={styles.select}
              >
                <Opcoes valores={FORMATOS} />
              </select>
            </label>

            <label className="campo">
              <span className="campo-rotulo">Gênero</span>
              <select
                value={novaCatExistente.genero}
                onChange={(e) => setNovaCatExistente({ ...novaCatExistente, genero: e.target.value })}
                style={styles.select}
              >
                <Opcoes valores={GENEROS} />
              </select>
            </label>

            <label className="campo">
              <span className="campo-rotulo">Nível</span>
              <select
                value={novaCatExistente.nivel}
                onChange={(e) => setNovaCatExistente({ ...novaCatExistente, nivel: e.target.value })}
                style={styles.select}
              >
                <Opcoes valores={NIVEIS} />
              </select>
            </label>

            <div className="modal-acoes">
              <button type="button" className="botao botao-secundario" onClick={() => setModalAddCatAberto(false)}>
                Cancelar
              </button>
              <button type="submit" className="botao botao-azul">Adicionar categoria</button>
            </div>
          </form>
        </Modal>
      )}

      {modalCriarAberto && (
        <Modal titulo="Criar torneio esportivo" largura={560} onFechar={fecharModalCriar} bloqueado={salvando}>
          <Alerta tipo="erro">{erroModalEvento && `⚠️ ${erroModalEvento}`}</Alerta>

          <form onSubmit={handleSalvarNovoEvento} style={styles.modalForm}>
            <label className="campo">
              <span className="campo-rotulo">Nome do evento</span>
              <input
                type="text"
                className="campo-entrada"
                placeholder="Ex: Torneio CrossFit Rio 2026"
                value={novoEvento.nome}
                onChange={(e) => alterarNovoEvento('nome', e.target.value)}
                required
              />
            </label>

            <div className="linha-campos">
              <label className="campo" style={{ flex: 1 }}>
                <span className="campo-rotulo">Data de início (DD/MM/AAAA)</span>
                <input
                  type="text"
                  className="campo-entrada"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={novoEvento.dataInicio}
                  onChange={(e) => alterarNovoEvento('dataInicio', mascaraData(e.target.value))}
                  required
                />
              </label>
              <label className="campo" style={{ flex: 1 }}>
                <span className="campo-rotulo">Data de término (opcional)</span>
                <input
                  type="text"
                  className="campo-entrada"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={novoEvento.dataFim}
                  onChange={(e) => alterarNovoEvento('dataFim', mascaraData(e.target.value))}
                />
              </label>
            </div>

            <label className="campo">
              <span className="campo-rotulo">Localização</span>
              <input
                type="text"
                className="campo-entrada"
                placeholder="Ex: Ginásio Caio Martins - Niterói, RJ"
                value={novoEvento.localizacao}
                onChange={(e) => alterarNovoEvento('localizacao', e.target.value)}
              />
            </label>

            <div style={styles.regrasSection}>
              <span className="campo-rotulo" style={{ color: '#00bfff' }}>Selecione os critérios para subir de categoria:</span>
              {REGRAS.map(({ campo, rotuloLongo }) => (
                <label key={campo} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={novoEvento[campo]}
                    onChange={(e) => alterarNovoEvento(campo, e.target.checked)}
                  />
                  <span>{rotuloLongo}</span>
                </label>
              ))}
            </div>

            <div style={styles.categoriasBuilder}>
              <span className="campo-rotulo">Categorias do torneio:</span>
              <div className="linha-ferramentas">
                <select
                  value={novaCatCriacao.formato}
                  onChange={(e) => setNovaCatCriacao({ ...novaCatCriacao, formato: e.target.value })}
                  style={styles.select}
                >
                  <Opcoes valores={FORMATOS} />
                </select>

                <select
                  value={novaCatCriacao.genero}
                  onChange={(e) => setNovaCatCriacao({ ...novaCatCriacao, genero: e.target.value })}
                  style={styles.select}
                >
                  <Opcoes valores={GENEROS} />
                </select>

                <select
                  value={novaCatCriacao.nivel}
                  onChange={(e) => setNovaCatCriacao({ ...novaCatCriacao, nivel: e.target.value })}
                  style={styles.select}
                >
                  <Opcoes valores={NIVEIS} />
                </select>

                <button
                  type="button"
                  onClick={() => alterarNovoEvento('categorias', [...novoEvento.categorias, { ...novaCatCriacao }])}
                  className="botao botao-verde"
                >
                  + Adicionar
                </button>
              </div>

              <div style={styles.categoriasListChips}>
                {novoEvento.categorias.map((c, i) => (
                  <span key={i} style={styles.catChip}>
                    {descreverCategoria(c)}
                    <button
                      type="button"
                      onClick={() => alterarNovoEvento('categorias', novoEvento.categorias.filter((_, idx) => idx !== i))}
                      style={styles.btnRemoverChip}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-acoes">
              <button type="button" className="botao botao-secundario" onClick={fecharModalCriar}>Cancelar</button>
              <button type="submit" disabled={salvando} className="botao botao-azul">
                {salvando ? 'Salvando...' : 'Concluir e salvar torneio'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0a0c0e', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  brand: { fontSize: '1.4rem', fontWeight: '900', letterSpacing: '2px', color: '#00bfff' },
  roleBadge: { fontSize: '0.7rem', fontWeight: '800', backgroundColor: 'rgba(0, 191, 255, 0.12)', color: '#00bfff', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(0, 191, 255, 0.3)' },
  sidebarEventos: { backgroundColor: '#0d1117', borderRight: '1px solid #22272e', padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  sidebarTitle: { margin: 0, fontSize: '0.85rem', color: '#a0aec0', letterSpacing: '0.5px', fontWeight: '700' },
  badgeContador: { backgroundColor: '#1f2937', color: '#00bfff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' },
  emptySidebar: { textAlign: 'center', padding: '20px 10px' },
  btnCriarPrimeiro: { marginTop: '10px', backgroundColor: 'transparent', border: '1px dashed #00bfff', color: '#00bfff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' },
  eventoCard: { padding: '14px 16px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'all 0.2s' },
  eventoCardNome: { margin: 0, fontSize: '0.98rem', fontWeight: '700' },
  btnExcluirEventoMini: { backgroundColor: 'transparent', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 6px', cursor: 'pointer', fontWeight: '600' },
  eventoCardMeta: { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.78rem', color: '#8b949e' },
  labelSub: { fontSize: '0.75rem', fontWeight: '700', color: '#00bfff' },
  eventoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  eventoNomeTitulo: { fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: '900', margin: '4px 0 0 0' },
  eventoInfoDetalhe: { color: '#8b949e', fontSize: '0.92rem', marginTop: '6px' },
  regrasBox: { backgroundColor: '#111418', border: '1px solid #22272e', padding: '12px 18px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' },
  regrasTitulo: { fontSize: '0.78rem', color: '#a0aec0', fontWeight: 'bold' },
  regrasCheckboxesContainer: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  checkboxRegraInline: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e0', cursor: 'pointer' },
  categoriasNavContainer: { marginBottom: '20px' },
  categoriasNavLabel: { fontSize: '0.78rem', color: '#8b949e', fontWeight: '700' },
  btnAdicionarCategoria: { backgroundColor: 'transparent', border: '1px dashed #00bfff', color: '#00bfff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' },
  categoriasNav: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' },
  categoriaPill: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', border: '1px solid', whiteSpace: 'nowrap' },
  btnExcluirCatPill: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: '0 2px' },
  gestaoInscricoesCard: { backgroundColor: '#111418', border: '1px solid #22272e', borderRadius: '14px', padding: 'clamp(16px, 3vw, 26px)' },
  inputBusca: { width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#0a0c0e', border: '1px solid #2d3748', color: '#ffffff', outline: 'none', fontSize: '0.9rem' },
  dropdownSugestoes: { position: 'absolute', top: '48px', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', zIndex: 99, maxHeight: '240px', overflowY: 'auto', boxShadow: '0 12px 28px rgba(0,0,0,0.8)' },
  dropdownItem: { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
  dropdownNome: { display: 'block', color: '#ffffff', fontWeight: 'bold', fontSize: '0.88rem' },
  dropdownBox: { display: 'block', color: '#8b949e', fontSize: '0.78rem', marginTop: '2px' },
  badgeInscreverDireto: { fontSize: '0.75rem', backgroundColor: '#238636', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  tabela: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '1px solid #2d3748' },
  th: { padding: '14px 12px', color: '#718096', fontSize: '0.75rem', fontWeight: '700' },
  tr: { borderBottom: '1px solid #1a202c' },
  td: { padding: '16px 12px', fontSize: '0.88rem', verticalAlign: 'middle' },
  trAlterada: { backgroundColor: 'rgba(255, 165, 0, 0.06)', boxShadow: 'inset 3px 0 0 #ffa500' },
  alteracaoAuditoria: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '6px', maxWidth: '220px', fontSize: '0.74rem', color: '#ffa500', lineHeight: '1.35' },
  badgeAlteracao: { display: 'inline-block', marginTop: '8px', fontSize: '0.72rem', fontWeight: '700', color: '#ffa500', border: '1px solid rgba(255, 165, 0, 0.4)', borderRadius: '6px', padding: '2px 8px' },
  pillAlteracao: { marginLeft: '6px', fontSize: '0.72rem', fontWeight: '800', color: '#000000', backgroundColor: '#ffa500', borderRadius: '10px', padding: '1px 7px' },
  statusBadge: { padding: '4px 10px', borderRadius: '6px', border: '1px solid', fontWeight: '800', fontSize: '0.72rem', display: 'inline-block', whiteSpace: 'nowrap' },
  badgeCategoriaRec: { backgroundColor: 'rgba(0, 191, 255, 0.12)', color: '#00bfff', border: '1px solid rgba(0, 191, 255, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', display: 'inline-block', whiteSpace: 'nowrap' },
  inputColocacao: { width: '64px', padding: '8px', borderRadius: '6px', backgroundColor: '#0a0c0e', border: '1px solid #2d3748', color: '#ffffff', fontSize: '0.9rem', textAlign: 'center', outline: 'none' },
  btnExcluirAtleta: { backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '6px', padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '14px' },
  select: { padding: '9px', borderRadius: '8px', backgroundColor: '#0a0c0e', border: '1px solid #2d3748', color: '#ffffff', fontSize: '0.82rem', outline: 'none' },
  regrasSection: { backgroundColor: '#0d1117', padding: '14px', borderRadius: '10px', border: '1px solid #21262d', display: 'flex', flexDirection: 'column', gap: '8px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#cbd5e0', cursor: 'pointer' },
  categoriasBuilder: { display: 'flex', flexDirection: 'column', gap: '8px' },
  categoriasListChips: { display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' },
  catChip: { backgroundColor: '#1f2937', color: '#00bfff', border: '1px solid rgba(0, 191, 255, 0.3)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px' },
  btnRemoverChip: { background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.85rem' },
  emptyMain: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '360px', textAlign: 'center' }
};
