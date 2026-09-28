import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function DashboardOrganizador() {
  const navigate = useNavigate();
  const organizadorId = localStorage.getItem('atletaId');
  const organizadorNome = localStorage.getItem('usuarioNome') || 'Organizador';

  const [eventos, setEventos] = useState([]);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [inscritos, setInscritos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados de Criação de Evento
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [erroModalEvento, setErroModalEvento] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [novoEvento, setNovoEvento] = useState({
    nome: '',
    dataInicio: '',
    dataFim: '',
    localizacao: '',
    regraCampeaoSobe: true,
    regraTresPodiosSobe: true,
    regraTresParticipacoesSobe: false,
    categorias: []
  });
  const [novaCatCriacao, setNovaCatCriacao] = useState({ formato: 'Individual', genero: 'Masculino', nivel: 'Scale' });

  // Estados para Adicionar Categoria no Evento já Existente
  const [modalAddCatAberto, setModalAddCatAberto] = useState(false);
  const [novaCatExistente, setNovaCatExistente] = useState({ formato: 'Individual', genero: 'Masculino', nivel: 'Scale' });

  // Estados de Busca de Atleta
  const [termoBuscaAtleta, setTermoBuscaAtleta] = useState('');
  const [sugestoesAtletas, setSugestoesAtletas] = useState([]);
  const [feedbackInscricao, setFeedbackInscricao] = useState({ tipo: '', texto: '' });
  const [inscrevendo, setInscrevendo] = useState(false);

  // Modais de Exclusão
  const [modalExcluirInscricaoAberto, setModalExcluirInscricaoAberto] = useState(false);
  const [inscricaoParaExcluir, setInscricaoParaExcluir] = useState(null);

  const [modalExcluirEventoAberto, setModalExcluirEventoAberto] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState(null);

  const [modalExcluirCatAberto, setModalExcluirCatAberto] = useState(false);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null);

  const [processandoAcao, setProcessandoAcao] = useState(false);

  useEffect(() => {
    carregarEventos();
  }, [organizadorId]);

  const carregarEventos = async () => {
    try {
      setCarregando(true);
      const res = await axios.get(`http://localhost:8080/api/eventos/organizador/${organizadorId}`);
      setEventos(res.data || []);
      if (res.data && res.data.length > 0) {
        selecionarEvento(res.data[0]);
      } else {
        setEventoSelecionado(null);
        setCategoriaSelecionada(null);
        setInscritos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setCarregando(false);
    }
  };

  const selecionarEvento = (ev) => {
    setEventoSelecionado(ev);
    if (ev.categorias && ev.categorias.length > 0) {
      selecionarCategoria(ev.categorias[0]);
    } else {
      setCategoriaSelecionada(null);
      setInscritos([]);
    }
  };

  const selecionarCategoria = async (cat) => {
    setCategoriaSelecionada(cat);
    setTermoBuscaAtleta('');
    setSugestoesAtletas([]);
    try {
      const res = await axios.get(`http://localhost:8080/api/eventos/categorias/${cat.id}/inscricoes`);
      setInscritos(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar inscritos:', err);
    }
  };

  const formatarCpfParaExibicao = (cpf) => {
    if (!cpf) return '';
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return cpf;
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Busca de atletas otimizada com debounce
  useEffect(() => {
    const termoLimpo = termoBuscaAtleta.trim();

    if (termoLimpo.length < 3) {
      setSugestoesAtletas([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/eventos/atletas/buscar?termo=${encodeURIComponent(termoLimpo)}`);
        setSugestoesAtletas(res.data || []);
      } catch (err) {
        console.error('Erro na busca de atletas:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [termoBuscaAtleta, categoriaSelecionada]);

  const handleInscreverAtletaDireto = async (atleta) => {
    if (!atleta || !categoriaSelecionada || inscrevendo) return;

    // Validação de Compatibilidade de Gênero
    const generoCat = (categoriaSelecionada.genero || '').toUpperCase();
    const sexoAtleta = (atleta.genero || atleta.sexo || '').toUpperCase();

    const isMisto = generoCat.includes('MIST');
    const isCatMasc = generoCat.includes('MASC');
    const isCatFem = generoCat.includes('FEM');

    const isAtletaMasc = sexoAtleta.startsWith('M');
    const isAtletaFem = sexoAtleta.startsWith('F');

    if (!isMisto) {
      if (isCatMasc && !isAtletaMasc) {
        setFeedbackInscricao({
          tipo: 'erro',
          texto: `O atleta ${atleta.nomeCompleto} (Feminino) não pode ser inscrito em uma categoria masculina.`
        });
        setTermoBuscaAtleta('');
        setSugestoesAtletas([]);
        return;
      }

      if (isCatFem && !isAtletaFem) {
        setFeedbackInscricao({
          tipo: 'erro',
          texto: `O atleta ${atleta.nomeCompleto} (Masculino) não pode ser inscrito em uma categoria feminina.`
        });
        setTermoBuscaAtleta('');
        setSugestoesAtletas([]);
        return;
      }
    }

    // Validação se já está inscrito localmente
    const jaInscrito = inscritos.some(ins => ins.atleta?.id === atleta.id);
    if (jaInscrito) {
      setFeedbackInscricao({
        tipo: 'aviso',
        texto: `O atleta ${atleta.nomeCompleto} já está cadastrado nesta categoria.`
      });
      setTermoBuscaAtleta('');
      setSugestoesAtletas([]);
      return;
    }

    setFeedbackInscricao({ tipo: '', texto: '' });
    setInscrevendo(true);
    setTermoBuscaAtleta('');
    setSugestoesAtletas([]);

    try {
      const res = await axios.post('http://localhost:8080/api/eventos/inscricoes', {
        categoriaEventoId: categoriaSelecionada.id,
        atletaId: atleta.id
      });

      setInscritos((prev) => [res.data, ...prev]);
      setFeedbackInscricao({
        tipo: res.data.statusElegibilidade === 'REGULAR' ? 'sucesso' : 'aviso',
        texto: `Atleta ${atleta.nomeCompleto} inscrito com status: ${res.data.statusElegibilidade}`
      });
    } catch (err) {
      setFeedbackInscricao({
        tipo: 'erro',
        texto: typeof err.response?.data === 'string' ? err.response.data : (err.response?.data?.message || 'Erro ao inscrever atleta.')
      });
    } finally {
      setInscrevendo(false);
    }
  };

  // Inscrição via Enter
  const handleKeyDownBusca = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (!categoriaSelecionada || inscrevendo) return;

    const termoLimpo = termoBuscaAtleta.trim();
    if (termoLimpo.length < 3) return;

    const apenasDigitos = termoLimpo.replace(/\D/g, '');

    if (sugestoesAtletas.length > 0) {
      if (apenasDigitos.length === 11) {
        const atletaExato = sugestoesAtletas.find(a => (a.cpf || '').replace(/\D/g, '') === apenasDigitos);
        if (atletaExato) {
          handleInscreverAtletaDireto(atletaExato);
          return;
        }
      }
      handleInscreverAtletaDireto(sugestoesAtletas[0]);
      return;
    }

    try {
      setInscrevendo(true);
      const res = await axios.get(`http://localhost:8080/api/eventos/atletas/buscar?termo=${encodeURIComponent(termoLimpo)}`);
      const lista = res.data || [];
      if (lista.length > 0) {
        if (apenasDigitos.length === 11) {
          const exato = lista.find(a => (a.cpf || '').replace(/\D/g, '') === apenasDigitos);
          handleInscreverAtletaDireto(exato || lista[0]);
        } else {
          handleInscreverAtletaDireto(lista[0]);
        }
      } else {
        setFeedbackInscricao({
          tipo: 'erro',
          texto: 'Nenhum atleta encontrado com este nome ou CPF.'
        });
      }
    } catch (err) {
      setFeedbackInscricao({
        tipo: 'erro',
        texto: 'Erro ao buscar atleta para inscrição.'
      });
    } finally {
      setInscrevendo(false);
    }
  };

  const handleToggleRegra = async (campoRegra) => {
    if (!eventoSelecionado) return;

    const regrasAtualizadas = {
      regraCampeaoSobe: campoRegra === 'regraCampeaoSobe' ? !eventoSelecionado.regraCampeaoSobe : eventoSelecionado.regraCampeaoSobe,
      regraTresPodiosSobe: campoRegra === 'regraTresPodiosSobe' ? !eventoSelecionado.regraTresPodiosSobe : eventoSelecionado.regraTresPodiosSobe,
      regraTresParticipacoesSobe: campoRegra === 'regraTresParticipacoesSobe' ? !eventoSelecionado.regraTresParticipacoesSobe : eventoSelecionado.regraTresParticipacoesSobe
    };

    try {
      const res = await axios.put(`http://localhost:8080/api/eventos/${eventoSelecionado.id}/regras`, regrasAtualizadas);
      
      const eventoAtualizado = {
        ...eventoSelecionado,
        ...res.data,
        categorias: eventoSelecionado.categorias
      };

      setEventoSelecionado(eventoAtualizado);
      setEventos(prev => prev.map(ev => ev.id === eventoAtualizado.id ? eventoAtualizado : ev));

      if (categoriaSelecionada) {
        const resInscritos = await axios.get(`http://localhost:8080/api/eventos/categorias/${categoriaSelecionada.id}/inscricoes`);
        setInscritos(resInscritos.data || []);
      }

      setFeedbackInscricao({
        tipo: 'sucesso',
        texto: 'Critérios atualizados e auditoria recalculada para todos os atletas.'
      });
    } catch (err) {
      alert('Erro ao atualizar regras do torneio.');
    }
  };

  const confirmarExclusaoEvento = async () => {
    if (!eventoParaExcluir) return;
    setProcessandoAcao(true);

    try {
      await axios.delete(`http://localhost:8080/api/eventos/${eventoParaExcluir.id}`);
      const novaLista = eventos.filter(ev => ev.id !== eventoParaExcluir.id);
      setEventos(novaLista);
      setModalExcluirEventoAberto(false);
      setEventoParaExcluir(null);

      if (novaLista.length > 0) {
        selecionarEvento(novaLista[0]);
      } else {
        setEventoSelecionado(null);
        setCategoriaSelecionada(null);
        setInscritos([]);
      }
    } catch (err) {
      alert('Erro ao excluir evento.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  const confirmarExclusaoAtleta = async () => {
    if (!inscricaoParaExcluir) return;
    setProcessandoAcao(true);

    try {
      await axios.delete(`http://localhost:8080/api/eventos/inscricoes/${inscricaoParaExcluir.id}`);
      setInscritos((prev) => prev.filter((ins) => ins.id !== inscricaoParaExcluir.id));
      setModalExcluirInscricaoAberto(false);
      setInscricaoParaExcluir(null);
      setFeedbackInscricao({
        tipo: 'sucesso',
        texto: 'Atleta removido da categoria com sucesso.'
      });
    } catch (err) {
      alert('Não foi possível remover o atleta.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleSalvarNovaCategoriaExistente = async (e) => {
    e.preventDefault();
    if (!eventoSelecionado) return;

    try {
      const res = await axios.post(`http://localhost:8080/api/eventos/${eventoSelecionado.id}/categorias`, novaCatExistente);
      const novaCatCriada = res.data;

      const categoriasAtualizadas = [...(eventoSelecionado.categorias || []), novaCatCriada];
      const eventoAtualizado = { ...eventoSelecionado, categorias: categoriasAtualizadas };

      setEventoSelecionado(eventoAtualizado);
      setEventos(prev => prev.map(ev => ev.id === eventoAtualizado.id ? eventoAtualizado : ev));
      setModalAddCatAberto(false);
      selecionarCategoria(novaCatCriada);
    } catch (err) {
      alert('Erro ao incluir nova categoria no torneio.');
    }
  };

  const confirmarExclusaoCategoria = async () => {
    if (!categoriaParaExcluir) return;
    setProcessandoAcao(true);

    try {
      await axios.delete(`http://localhost:8080/api/eventos/categorias/${categoriaParaExcluir.id}`);
      const catsRestantes = eventoSelecionado.categorias.filter(c => c.id !== categoriaParaExcluir.id);
      const eventoAtualizado = { ...eventoSelecionado, categorias: catsRestantes };

      setEventoSelecionado(eventoAtualizado);
      setEventos(prev => prev.map(ev => ev.id === eventoAtualizado.id ? eventoAtualizado : ev));
      setModalExcluirCatAberto(false);
      setCategoriaParaExcluir(null);

      if (catsRestantes.length > 0) {
        selecionarCategoria(catsRestantes[0]);
      } else {
        setCategoriaSelecionada(null);
        setInscritos([]);
      }
    } catch (err) {
      alert('Erro ao excluir categoria.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  const maskDate = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const formatarParaIso = (dataPtBr) => {
    if (!dataPtBr || dataPtBr.length !== 10) return null;
    const [dia, mes, ano] = dataPtBr.split('/');
    return `${ano}-${mes}-${dia}`;
  };

  const formatarParaExibicao = (dataIso) => {
    if (!dataIso) return '';
    const partes = dataIso.split('-');
    if (partes.length !== 3) return dataIso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const handleSalvarNovoEvento = async (e) => {
    e.preventDefault();
    setErroModalEvento('');

    if (!novoEvento.nome || novoEvento.nome.trim().length < 3) {
      setErroModalEvento('Informe um nome com pelo menos 3 letras para o evento.');
      return;
    }

    if (!novoEvento.dataInicio || novoEvento.dataInicio.length !== 10) {
      setErroModalEvento('Informe a data de início no formato DD/MM/AAAA.');
      return;
    }

    if (novoEvento.categorias.length === 0) {
      setErroModalEvento('Adicione pelo menos uma categoria ao evento.');
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        ...novoEvento,
        dataInicio: formatarParaIso(novoEvento.dataInicio),
        dataFim: novoEvento.dataFim ? formatarParaIso(novoEvento.dataFim) : null,
        organizadorId: Number(organizadorId)
      };

      const res = await axios.post('http://localhost:8080/api/eventos', payload);
      setEventos([res.data, ...eventos]);
      selecionarEvento(res.data);
      setModalCriarAberto(false);
      setErroModalEvento('');
      setNovoEvento({
        nome: '',
        dataInicio: '',
        dataFim: '',
        localizacao: '',
        regraCampeaoSobe: true,
        regraTresPodiosSobe: true,
        regraTresParticipacoesSobe: false,
        categorias: []
      });
    } catch (err) {
      setErroModalEvento('Erro ao criar torneio no servidor.');
    } finally {
      setSalvando(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      {/* Barra de Navegação Superior */}
      <header style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.brand}>FairPlay</span>
          <span style={styles.roleBadge}>Organizador</span>
        </div>
        <div style={styles.navRight}>
          <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Olá, <strong>{organizadorNome}</strong></span>
          <button onClick={() => { setErroModalEvento(''); setModalCriarAberto(true); }} style={styles.btnNovoEvento}>
            + Criar novo evento
          </button>
          <button onClick={handleLogout} style={styles.btnLogout}>Sair</button>
        </div>
      </header>

      {/* Estrutura Principal */}
      <div style={styles.contentLayout}>
        {/* Painel Lateral: Lista de Eventos */}
        <aside style={styles.sidebarEventos}>
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Meus torneios</h3>
            <span style={styles.badgeContador}>{eventos.length}</span>
          </div>

          {carregando ? (
            <p style={{ color: '#718096', fontSize: '0.85rem' }}>Carregando torneios...</p>
          ) : eventos.length === 0 ? (
            <div style={styles.emptySidebar}>
              <p style={{ color: '#718096', fontSize: '0.85rem', margin: 0 }}>Nenhum torneio criado ainda.</p>
              <button onClick={() => setModalCriarAberto(true)} style={styles.btnCriarPrimeiro}>Criar primeiro evento</button>
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
                        setModalExcluirEventoAberto(true);
                      }}
                      style={styles.btnExcluirEventoMini}
                      title="Excluir evento"
                    >
                      Excluir
                    </button>
                  </div>
                  <div style={styles.eventoCardMeta}>
                    <span>📅 {formatarParaExibicao(ev.dataInicio)}</span>
                    <span>📍 {ev.localizacao || 'Local a definir'}</span>
                  </div>
                </div>
              );
            })
          )}
        </aside>

        {/* Área de Gestão do Torneio Selecionado */}
        <main style={styles.mainGestao}>
          {eventoSelecionado ? (
            <>
              {/* Cabeçalho do Evento Selecionado */}
              <div style={styles.eventoHeader}>
                <div>
                  <span style={styles.labelSub}>Painel de auditoria do evento</span>
                  <h1 style={styles.eventoNomeTitulo}>{eventoSelecionado.nome}</h1>
                  <p style={styles.eventoInfoDetalhe}>
                    📍 {eventoSelecionado.localizacao || 'Arena Oficial'} • 📅 Data: <strong>{formatarParaExibicao(eventoSelecionado.dataInicio)}</strong>
                  </p>
                </div>

                {/* Caixa de Critérios de Promoção */}
                <div style={styles.regrasBox}>
                  <span style={styles.regrasTitulo}>Critérios para promoção obrigatória:</span>
                  <div style={styles.regrasCheckboxesContainer}>
                    <label style={styles.checkboxRegraInline}>
                      <input
                        type="checkbox"
                        checked={eventoSelecionado.regraCampeaoSobe}
                        onChange={() => handleToggleRegra('regraCampeaoSobe')}
                      />
                      <span>Já foi campeão</span>
                    </label>

                    <label style={styles.checkboxRegraInline}>
                      <input
                        type="checkbox"
                        checked={eventoSelecionado.regraTresPodiosSobe}
                        onChange={() => handleToggleRegra('regraTresPodiosSobe')}
                      />
                      <span>3 pódios na categoria</span>
                    </label>

                    <label style={styles.checkboxRegraInline}>
                      <input
                        type="checkbox"
                        checked={eventoSelecionado.regraTresParticipacoesSobe}
                        onChange={() => handleToggleRegra('regraTresParticipacoesSobe')}
                      />
                      <span>3 participações</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Categorias do Evento */}
              <div style={styles.categoriasNavContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={styles.categoriasNavLabel}>Categorias do evento:</span>
                  <button
                    type="button"
                    onClick={() => setModalAddCatAberto(true)}
                    style={styles.btnAdicionarCategoria}
                  >
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
                          {cat.formato} • {cat.genero} • {cat.nivel}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoriaParaExcluir(cat);
                            setModalExcluirCatAberto(true);
                          }}
                          style={{
                            ...styles.btnExcluirCatPill,
                            color: ativa ? '#7a0000' : '#ff4444'
                          }}
                          title="Excluir categoria do evento"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gestão das Inscrições */}
              {categoriaSelecionada && (
                <div style={styles.gestaoInscricoesCard}>
                  <div style={styles.inscricaoHeader}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}>
                        Inscrições: <span style={{ color: '#00bfff' }}>{categoriaSelecionada.formato} {categoriaSelecionada.genero} ({categoriaSelecionada.nivel})</span>
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#718096' }}>
                        Digite pelo menos 3 caracteres do nome ou CPF do atleta para buscar e pressione <strong>Enter</strong> ou clique para inscrever.
                      </p>
                    </div>
                  </div>

                  {/* Campo de Busca de Atletas */}
                  <div style={styles.formInserirAtleta}>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="Digite pelo menos 3 letras ou o CPF do atleta para buscar..."
                        value={termoBuscaAtleta}
                        onChange={(e) => setTermoBuscaAtleta(e.target.value)}
                        onKeyDown={handleKeyDownBusca}
                        style={styles.inputBusca}
                      />

                      {sugestoesAtletas.length > 0 && (
                        <div style={styles.dropdownSugestoes}>
                          {sugestoesAtletas.map((a) => (
                            <div
                              key={a.id}
                              onClick={() => handleInscreverAtletaDireto(a)}
                              style={styles.dropdownItem}
                            >
                              <div>
                                <span style={styles.dropdownNome}>
                                  {a.nomeCompleto}{' '}
                                  {a.cpf && (
                                    <span style={{ fontSize: '0.78rem', color: '#00bfff', fontWeight: 'normal' }}>
                                      (CPF: {formatarCpfParaExibicao(a.cpf)})
                                    </span>
                                  )}
                                  <span style={{ fontSize: '0.75rem', color: '#ffd700', marginLeft: '8px', fontWeight: 'bold' }}>
                                    📊 {a.totalHistoricos || 0} histórico(s)
                                  </span>
                                </span>
                                <span style={styles.dropdownBox}>Box: {a.nomeBox || 'Sem Box'} • {a.cidade}/{a.estado}</span>
                              </div>
                              <span style={styles.badgeInscreverDireto}>+ Inscrever</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alerta de Feedback */}
                  {feedbackInscricao.texto && (
                    <div style={{
                      ...styles.feedbackBox,
                      backgroundColor: feedbackInscricao.tipo === 'sucesso'
                        ? 'rgba(0, 255, 136, 0.1)'
                        : feedbackInscricao.tipo === 'aviso'
                        ? 'rgba(255, 215, 0, 0.1)'
                        : 'rgba(255, 68, 68, 0.1)',
                      color: feedbackInscricao.tipo === 'sucesso' ? '#00ff88' : feedbackInscricao.tipo === 'aviso' ? '#ffd700' : '#ff4444',
                      borderColor: feedbackInscricao.tipo === 'sucesso' ? '#00ff88' : feedbackInscricao.tipo === 'aviso' ? '#ffd700' : '#ff4444'
                    }}>
                      {feedbackInscricao.texto}
                    </div>
                  )}

                  {/* Tabela de Atletas Inscritos */}
                  <div style={styles.tabelaWrapper}>
                    <table style={styles.tabela}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th style={styles.th}>Atleta</th>
                          <th style={styles.th}>Box / CT</th>
                          <th style={styles.th}>Categoria recomendada</th>
                          <th style={styles.th}>Status da auditoria</th>
                          <th style={styles.th}>Diagnóstico</th>
                          <th style={{ ...styles.th, textAlign: 'center' }}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inscritos.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#718096', fontSize: '0.9rem' }}>
                              Nenhum atleta inscrito nesta categoria até o momento.
                            </td>
                          </tr>
                        ) : (
                          inscritos.map((ins) => {
                            const isRegular = ins.statusElegibilidade === 'REGULAR';
                            const recCat = ins.categoriaRecomendada || (isRegular ? categoriaSelecionada.nivel : 'Consulte regras');

                            return (
                              <tr key={ins.id} style={styles.tr}>
                                <td style={{ ...styles.td, fontWeight: '700', color: '#ffffff' }}>
                                  {ins.atleta?.nomeCompleto}
                                </td>
                                <td style={styles.td}>
                                  {ins.atleta?.nomeBox || 'N/D'}{' '}
                                  <small style={{ color: '#718096' }}>({ins.atleta?.cidade}/{ins.atleta?.estado})</small>
                                </td>
                                <td style={styles.td}>
                                  <span style={styles.badgeCategoriaRec}>
                                    ⭐ {recCat}
                                  </span>
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
                                </td>
                                <td style={{ ...styles.td, fontSize: '0.82rem', color: isRegular ? '#a0aec0' : '#ffa500' }}>
                                  {ins.motivoIrregularidade || 'Cumpre todos os requisitos do regulamento.'}
                                </td>
                                <td style={{ ...styles.td, textAlign: 'center' }}>
                                  <button
                                    onClick={() => {
                                      setInscricaoParaExcluir(ins);
                                      setModalExcluirInscricaoAberto(true);
                                    }}
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

      {/* Modal de Confirmação: Excluir Evento */}
      {modalExcluirEventoAberto && eventoParaExcluir && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#ff4444', margin: 0, fontSize: '1.15rem' }}>Excluir evento</h3>
              <button type="button" onClick={() => setModalExcluirEventoAberto(false)} style={styles.btnFecharModal}>✕</button>
            </div>
            
            <p style={{ color: '#cbd5e0', fontSize: '0.9rem', lineHeight: '1.5', margin: '14px 0 20px 0' }}>
              Tem certeza de que deseja excluir o evento <strong>{eventoParaExcluir.nome}</strong> em definitivo? Todas as categorias e inscrições vinculadas serão apagadas.
            </p>

            <div style={styles.modalActions}>
              <button type="button" onClick={() => setModalExcluirEventoAberto(false)} style={styles.btnCancelar}>
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={processandoAcao}
                onClick={confirmarExclusaoEvento} 
                style={styles.btnConfirmarExclusao}
              >
                {processandoAcao ? 'Excluindo...' : 'Sim, excluir evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Excluir Categoria */}
      {modalExcluirCatAberto && categoriaParaExcluir && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#ff4444', margin: 0, fontSize: '1.15rem' }}>Excluir categoria</h3>
              <button type="button" onClick={() => setModalExcluirCatAberto(false)} style={styles.btnFecharModal}>✕</button>
            </div>
            
            <p style={{ color: '#cbd5e0', fontSize: '0.9rem', lineHeight: '1.5', margin: '14px 0 20px 0' }}>
              Tem certeza de que deseja remover a categoria <strong>{categoriaParaExcluir.formato} • {categoriaParaExcluir.genero} • {categoriaParaExcluir.nivel}</strong> deste torneio?
            </p>

            <div style={styles.modalActions}>
              <button type="button" onClick={() => setModalExcluirCatAberto(false)} style={styles.btnCancelar}>
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={processandoAcao}
                onClick={confirmarExclusaoCategoria} 
                style={styles.btnConfirmarExclusao}
              >
                {processandoAcao ? 'Excluindo...' : 'Sim, excluir categoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Excluir Inscrição de Atleta */}
      {modalExcluirInscricaoAberto && inscricaoParaExcluir && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#ff4444', margin: 0, fontSize: '1.15rem' }}>Remover atleta da categoria</h3>
              <button type="button" onClick={() => setModalExcluirInscricaoAberto(false)} style={styles.btnFecharModal}>✕</button>
            </div>
            
            <p style={{ color: '#cbd5e0', fontSize: '0.9rem', lineHeight: '1.5', margin: '14px 0 20px 0' }}>
              Tem certeza de que deseja remover o atleta <strong>{inscricaoParaExcluir.atleta?.nomeCompleto}</strong> desta categoria?
            </p>

            <div style={styles.modalActions}>
              <button type="button" onClick={() => setModalExcluirInscricaoAberto(false)} style={styles.btnCancelar}>
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={processandoAcao}
                onClick={confirmarExclusaoAtleta} 
                style={styles.btnConfirmarExclusao}
              >
                {processandoAcao ? 'Removendo...' : 'Sim, remover atleta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Categoria a Evento Existente */}
      {modalAddCatAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContentSmall}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#00bfff', margin: 0, fontSize: '1.2rem' }}>Adicionar categoria ao torneio</h3>
              <button type="button" onClick={() => setModalAddCatAberto(false)} style={styles.btnFecharModal}>✕</button>
            </div>

            <form onSubmit={handleSalvarNovaCategoriaExistente} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Formato</label>
                <select
                  value={novaCatExistente.formato}
                  onChange={(e) => setNovaCatExistente({ ...novaCatExistente, formato: e.target.value })}
                  style={styles.select}
                >
                  <option value="Individual">Individual</option>
                  <option value="Dupla">Dupla</option>
                  <option value="Trio">Trio</option>
                  <option value="Time">Time</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Gênero</label>
                <select
                  value={novaCatExistente.genero}
                  onChange={(e) => setNovaCatExistente({ ...novaCatExistente, genero: e.target.value })}
                  style={styles.select}
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Misto">Misto</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Nível</label>
                <select
                  value={novaCatExistente.nivel}
                  onChange={(e) => setNovaCatExistente({ ...novaCatExistente, nivel: e.target.value })}
                  style={styles.select}
                >
                  <option value="Iniciante">Iniciante</option>
                  <option value="Scale">Scale</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="RX">RX</option>
                  <option value="Elite">Elite</option>
                  <option value="Master">Master</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setModalAddCatAberto(false)} style={styles.btnCancelar}>
                  Cancelar
                </button>
                <button type="submit" style={styles.btnSalvarTorneio}>
                  Adicionar categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Criação de Novo Evento */}
      {modalCriarAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ color: '#00bfff', margin: 0, fontSize: '1.3rem' }}>Criar torneio esportivo</h2>
              <button 
                type="button" 
                onClick={() => { setModalCriarAberto(false); setErroModalEvento(''); }} 
                style={styles.btnFecharModal}
              >
                ✕
              </button>
            </div>

            {erroModalEvento && (
              <div style={styles.modalAlertErro}>
                ⚠️ {erroModalEvento}
              </div>
            )}

            <form onSubmit={handleSalvarNovoEvento} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome do evento</label>
                <input
                  type="text"
                  placeholder="Ex: Torneio CrossFit Rio 2026"
                  value={novoEvento.nome}
                  onChange={(e) => {
                    setNovoEvento({ ...novoEvento, nome: e.target.value });
                    setErroModalEvento('');
                  }}
                  required
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Data de início (DD/MM/AAAA)</label>
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={novoEvento.dataInicio}
                    onChange={(e) => {
                      setNovoEvento({ ...novoEvento, dataInicio: maskDate(e.target.value) });
                      setErroModalEvento('');
                    }}
                    required
                    style={styles.input}
                  />
                </div>
                <div style={{ ...styles.inputGroup, flex: 1 }}>
                  <label style={styles.label}>Data de término (opcional)</label>
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={novoEvento.dataFim}
                    onChange={(e) => {
                      setNovoEvento({ ...novoEvento, dataFim: maskDate(e.target.value) });
                      setErroModalEvento('');
                    }}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Localização</label>
                <input
                  type="text"
                  placeholder="Ex: Ginásio Caio Martins - Niterói, RJ"
                  value={novoEvento.localizacao}
                  onChange={(e) => {
                    setNovoEvento({ ...novoEvento, localizacao: e.target.value });
                    setErroModalEvento('');
                  }}
                  style={styles.input}
                />
              </div>

              {/* Critérios Iniciais */}
              <div style={styles.regrasSection}>
                <span style={{ ...styles.label, color: '#00bfff' }}>Selecione os critérios para subir de categoria:</span>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={novoEvento.regraCampeaoSobe}
                    onChange={(e) => setNovoEvento({ ...novoEvento, regraCampeaoSobe: e.target.checked })}
                  />
                  <span>Já foi campeão na categoria anterior</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={novoEvento.regraTresPodiosSobe}
                    onChange={(e) => setNovoEvento({ ...novoEvento, regraTresPodiosSobe: e.target.checked })}
                  />
                  <span>Já conquistou 3 pódios na categoria anterior</span>
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={novoEvento.regraTresParticipacoesSobe}
                    onChange={(e) => setNovoEvento({ ...novoEvento, regraTresParticipacoesSobe: e.target.checked })}
                  />
                  <span>Já participou 3x da mesma categoria</span>
                </label>
              </div>

              {/* Construtor de Categorias na Criação */}
              <div style={styles.categoriasBuilder}>
                <span style={styles.label}>Categorias do torneio:</span>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={novaCatCriacao.formato}
                    onChange={(e) => setNovaCatCriacao({ ...novaCatCriacao, formato: e.target.value })}
                    style={styles.select}
                  >
                    <option value="Individual">Individual</option>
                    <option value="Dupla">Dupla</option>
                    <option value="Trio">Trio</option>
                    <option value="Time">Time</option>
                  </select>

                  <select
                    value={novaCatCriacao.genero}
                    onChange={(e) => setNovaCatCriacao({ ...novaCatCriacao, genero: e.target.value })}
                    style={styles.select}
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Misto">Misto</option>
                  </select>

                  <select
                    value={novaCatCriacao.nivel}
                    onChange={(e) => setNovaCatCriacao({ ...novaCatCriacao, nivel: e.target.value })}
                    style={styles.select}
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Scale">Scale</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="RX">RX</option>
                    <option value="Elite">Elite</option>
                    <option value="Master">Master</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setNovoEvento(prev => ({ ...prev, categorias: [...prev.categorias, { ...novaCatCriacao }] }));
                      setErroModalEvento('');
                    }}
                    style={styles.btnAddCat}
                  >
                    + Adicionar
                  </button>
                </div>

                <div style={styles.categoriasListChips}>
                  {novoEvento.categorias.map((c, i) => (
                    <span key={i} style={styles.catChip}>
                      {c.formato} • {c.genero} • {c.nivel}
                      <button
                        type="button"
                        onClick={() => setNovoEvento(prev => ({ ...prev, categorias: prev.categorias.filter((_, idx) => idx !== i) }))}
                        style={styles.btnRemoverChip}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => { setModalCriarAberto(false); setErroModalEvento(''); }} 
                  style={styles.btnCancelar}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={salvando}
                  style={styles.btnSalvarTorneio}
                >
                  {salvando ? 'Salvando...' : 'Concluir e salvar torneio'}
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
  container: { minHeight: '100vh', backgroundColor: '#0a0c0e', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 36px', backgroundColor: '#111418', borderBottom: '1px solid #22272e' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  brand: { fontSize: '1.4rem', fontWeight: '900', letterSpacing: '2px', color: '#00bfff' },
  roleBadge: { fontSize: '0.7rem', fontWeight: '800', backgroundColor: 'rgba(0, 191, 255, 0.12)', color: '#00bfff', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(0, 191, 255, 0.3)' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  btnNovoEvento: { backgroundColor: '#00bfff', color: '#000000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' },
  btnLogout: { backgroundColor: 'transparent', border: '1px solid #2d3748', color: '#cbd5e0', padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' },
  contentLayout: { display: 'flex', minHeight: 'calc(100vh - 67px)' },
  sidebarEventos: { width: '300px', backgroundColor: '#0d1117', borderRight: '1px solid #22272e', padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  sidebarTitle: { margin: 0, fontSize: '0.85rem', color: '#a0aec0', letterSpacing: '0.5px', fontWeight: '700' },
  badgeContador: { backgroundColor: '#1f2937', color: '#00bfff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' },
  emptySidebar: { textAlign: 'center', padding: '20px 10px' },
  btnCriarPrimeiro: { marginTop: '10px', backgroundColor: 'transparent', border: '1px dashed #00bfff', color: '#00bfff', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' },
  eventoCard: { padding: '14px 16px', borderRadius: '10px', border: '1px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'all 0.2s' },
  eventoCardNome: { margin: 0, fontSize: '0.98rem', fontWeight: '700' },
  btnExcluirEventoMini: { backgroundColor: 'transparent', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 6px', cursor: 'pointer', fontWeight: '600' },
  eventoCardMeta: { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.78rem', color: '#8b949e' },
  mainGestao: { flex: 1, padding: '32px 40px', overflowY: 'auto' },
  labelSub: { fontSize: '0.75rem', fontWeight: '700', color: '#00bfff' },
  eventoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  eventoNomeTitulo: { fontSize: '2rem', fontWeight: '900', margin: '4px 0 0 0' },
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
  gestaoInscricoesCard: { backgroundColor: '#111418', border: '1px solid #22272e', borderRadius: '14px', padding: '26px' },
  inscricaoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  formInserirAtleta: { display: 'flex', gap: '10px', marginBottom: '18px', position: 'relative' },
  inputBusca: { width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#0a0c0e', border: '1px solid #2d3748', color: '#ffffff', outline: 'none', fontSize: '0.9rem' },
  dropdownSugestoes: { position: 'absolute', top: '48px', left: 0, right: 0, backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', zIndex: 99, maxHeight: '240px', overflowY: 'auto', boxShadow: '0 12px 28px rgba(0,0,0,0.8)' },
  dropdownItem: { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  dropdownNome: { display: 'block', color: '#ffffff', fontWeight: 'bold', fontSize: '0.88rem' },
  dropdownBox: { display: 'block', color: '#8b949e', fontSize: '0.78rem', marginTop: '2px' },
  badgeInscreverDireto: { fontSize: '0.75rem', backgroundColor: '#238636', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' },
  feedbackBox: { padding: '10px 16px', borderRadius: '8px', border: '1px solid', marginBottom: '16px', fontSize: '0.84rem', fontWeight: 'bold' },
  tabelaWrapper: { overflowX: 'auto' },
  tabela: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { borderBottom: '1px solid #2d3748' },
  th: { padding: '14px 12px', color: '#718096', fontSize: '0.75rem', fontWeight: '700' },
  tr: { borderBottom: '1px solid #1a202c' },
  td: { padding: '16px 12px', fontSize: '0.88rem', verticalAlign: 'middle' },
  statusBadge: { padding: '4px 10px', borderRadius: '6px', border: '1px solid', fontWeight: '800', fontSize: '0.72rem', display: 'inline-block' },
  badgeCategoriaRec: { backgroundColor: 'rgba(0, 191, 255, 0.12)', color: '#00bfff', border: '1px solid rgba(0, 191, 255, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem', display: 'inline-block' },
  btnExcluirAtleta: { backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '6px', padding: '7px 14px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' },
  modalContent: { backgroundColor: '#111418', border: '1px solid #22272e', borderRadius: '14px', padding: '28px', maxWidth: '560px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.9)' },
  modalContentSmall: { backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.9)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  modalAlertErro: { backgroundColor: 'rgba(255, 68, 68, 0.12)', border: '1px solid #ff4444', color: '#ff4444', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', marginBottom: '14px' },
  btnFecharModal: { background: 'transparent', border: 'none', color: '#8b949e', fontSize: '1.2rem', cursor: 'pointer' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '0.75rem', color: '#a0aec0', fontWeight: '700' },
  input: { padding: '11px', borderRadius: '8px', backgroundColor: '#0a0c0e', border: '1px solid #2d3748', color: '#ffffff', fontSize: '0.9rem', outline: 'none' },
  select: { padding: '9px', borderRadius: '8px', backgroundColor: '#0a0c0e', border: '1px solid #2d3748', color: '#ffffff', fontSize: '0.82rem', outline: 'none' },
  regrasSection: { backgroundColor: '#161b22', padding: '14px', borderRadius: '10px', border: '1px solid #21262d', display: 'flex', flexDirection: 'column', gap: '8px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#cbd5e0', cursor: 'pointer' },
  categoriasBuilder: { display: 'flex', flexDirection: 'column', gap: '8px' },
  btnAddCat: { backgroundColor: '#238636', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0 14px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' },
  categoriasListChips: { display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' },
  catChip: { backgroundColor: '#1f2937', color: '#00bfff', border: '1px solid rgba(0, 191, 255, 0.3)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px' },
  btnRemoverChip: { background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.85rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' },
  btnCancelar: { backgroundColor: 'transparent', border: '1px solid #30363d', color: '#cbd5e0', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' },
  btnSalvarTorneio: { backgroundColor: '#00bfff', color: '#000000', border: 'none', padding: '9px 20px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' },
  btnConfirmarExclusao: { backgroundColor: '#da3633', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem' },
  emptyMain: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '360px', textAlign: 'center' }
};