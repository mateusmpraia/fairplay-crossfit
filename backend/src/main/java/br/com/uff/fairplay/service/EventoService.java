package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.AtualizarRegrasDTO;
import br.com.uff.fairplay.dto.CriarCategoriaDTO;
import br.com.uff.fairplay.dto.CriarEventoDTO;
import br.com.uff.fairplay.dto.InscreverAtletaDTO;
import br.com.uff.fairplay.exception.AcessoNegadoException;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.model.*;
import br.com.uff.fairplay.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class EventoService {

    /**
     * A busca de atletas ({@code AtletaRepository#buscarPorNomeOuCpf}) devolve atletas do histórico
     * ainda não cadastrados com id = id do histórico + este deslocamento, para não colidir com ids reais.
     */
    private static final long DESLOCAMENTO_ID_HISTORICO = 100000L;

    private final EventoRepository eventoRepository;
    private final CategoriaEventoRepository categoriaEventoRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;
    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoCampeonatoRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final PasswordEncoder passwordEncoder;

    public EventoService(EventoRepository eventoRepository,
                         CategoriaEventoRepository categoriaEventoRepository,
                         InscricaoEventoRepository inscricaoEventoRepository,
                         AtletaRepository atletaRepository,
                         ResultadoCampeonatoRepository resultadoCampeonatoRepository,
                         HistoricoAtletaRepository historicoAtletaRepository,
                         PasswordEncoder passwordEncoder) {
        this.eventoRepository = eventoRepository;
        this.categoriaEventoRepository = categoriaEventoRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
        this.atletaRepository = atletaRepository;
        this.resultadoCampeonatoRepository = resultadoCampeonatoRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ---------------------------------------------------------------- Eventos e categorias

    @Transactional
    public Evento criarEvento(CriarEventoDTO dto, Long organizadorId) {
        Evento evento = new Evento();
        evento.setOrganizadorId(organizadorId);
        evento.setNome(dto.nome());
        evento.setDataInicio(dto.dataInicio());
        evento.setDataFim(dto.dataFim());
        evento.setLocalizacao(dto.localizacao());
        evento.setRegraCampeaoSobe(dto.regraCampeaoSobe());
        evento.setRegraTresPodiosSobe(dto.regraTresPodiosSobe());
        evento.setRegraTresParticipacoesSobe(dto.regraTresParticipacoesSobe());

        if (dto.categorias() != null) {
            for (CriarCategoriaDTO catDto : dto.categorias()) {
                evento.getCategorias().add(novaCategoria(evento, catDto));
            }
        }

        return eventoRepository.save(evento);
    }

    public List<Evento> listarEventosDoOrganizador(Long organizadorId) {
        return eventoRepository.findByOrganizadorIdOrderByDataInicioDesc(organizadorId);
    }

    @Transactional
    public void excluirEvento(Long eventoId, Long organizadorId) {
        eventoRepository.delete(buscarEventoDoOrganizador(eventoId, organizadorId));
    }

    /** Atualiza os critérios de promoção do evento e refaz a auditoria de todos os inscritos. */
    @Transactional
    public Evento atualizarRegrasEReauditar(Long eventoId, AtualizarRegrasDTO regras, Long organizadorId) {
        Evento evento = buscarEventoDoOrganizador(eventoId, organizadorId);
        evento.setRegraCampeaoSobe(regras.regraCampeaoSobe());
        evento.setRegraTresPodiosSobe(regras.regraTresPodiosSobe());
        evento.setRegraTresParticipacoesSobe(regras.regraTresParticipacoesSobe());
        eventoRepository.save(evento);

        for (CategoriaEvento categoria : evento.getCategorias()) {
            for (InscricaoEvento inscricao : inscricaoEventoRepository.findByCategoriaEventoId(categoria.getId())) {
                aplicarAuditoria(inscricao, auditarElegibilidade(inscricao.getAtleta(), categoria));
                inscricaoEventoRepository.save(inscricao);
            }
        }

        return evento;
    }

    @Transactional
    public CategoriaEvento adicionarCategoria(Long eventoId, CriarCategoriaDTO dto, Long organizadorId) {
        return categoriaEventoRepository.save(novaCategoria(buscarEventoDoOrganizador(eventoId, organizadorId), dto));
    }

    @Transactional
    public void excluirCategoria(Long categoriaId, Long organizadorId) {
        categoriaEventoRepository.delete(buscarCategoriaDoOrganizador(categoriaId, organizadorId));
    }

    /** Busca o evento e garante que ele pertence ao organizador logado. */
    private Evento buscarEventoDoOrganizador(Long eventoId, Long organizadorId) {
        Evento evento = eventoRepository.findById(eventoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Evento não encontrado."));
        exigirDono(evento, organizadorId);
        return evento;
    }

    /** Busca a categoria e garante que o evento dela pertence ao organizador logado. */
    private CategoriaEvento buscarCategoriaDoOrganizador(Long categoriaId, Long organizadorId) {
        CategoriaEvento categoria = categoriaEventoRepository.findById(categoriaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria do evento não encontrada."));
        exigirDono(categoria.getEvento(), organizadorId);
        return categoria;
    }

    private static void exigirDono(Evento evento, Long organizadorId) {
        if (!evento.getOrganizadorId().equals(organizadorId)) {
            throw new AcessoNegadoException("Este evento pertence a outro organizador.");
        }
    }

    private CategoriaEvento novaCategoria(Evento evento, CriarCategoriaDTO dto) {
        CategoriaEvento categoria = new CategoriaEvento();
        categoria.setEvento(evento);
        categoria.setFormato(dto.formato());
        categoria.setGenero(dto.genero());
        categoria.setNivel(CategoriaCompeticao.fromString(dto.nivel()));
        return categoria;
    }

    // ---------------------------------------------------------------- Inscrições

    @Transactional
    public InscricaoEvento inscreverAtleta(InscreverAtletaDTO dto, Long organizadorId) {
        CategoriaEvento categoria = buscarCategoriaDoOrganizador(dto.categoriaEventoId(), organizadorId);

        Atleta atleta = dto.atletaId() != null && dto.atletaId() > DESLOCAMENTO_ID_HISTORICO
                ? obterAtletaDoHistorico(dto.atletaId() - DESLOCAMENTO_ID_HISTORICO, categoria)
                : obterAtletaCadastrado(dto.atletaId(), categoria);

        if (inscricaoEventoRepository.existsByCategoriaEventoIdAndAtletaId(categoria.getId(), atleta.getId())) {
            throw new RegraNegocioException("Este atleta já está inscrito nesta categoria.");
        }

        InscricaoEvento inscricao = new InscricaoEvento();
        inscricao.setCategoriaEvento(categoria);
        inscricao.setAtleta(atleta);
        aplicarAuditoria(inscricao, auditarElegibilidade(atleta, categoria));

        return inscricaoEventoRepository.save(inscricao);
    }

    @Transactional(readOnly = true)
    public List<InscricaoEvento> listarInscricoes(Long categoriaId, Long organizadorId) {
        return inscricaoEventoRepository.findByCategoriaEventoId(buscarCategoriaDoOrganizador(categoriaId, organizadorId).getId());
    }

    @Transactional
    public void removerInscricao(Long inscricaoId, Long organizadorId) {
        InscricaoEvento inscricao = inscricaoEventoRepository.findById(inscricaoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Inscrição não encontrada."));
        exigirDono(inscricao.getCategoriaEvento().getEvento(), organizadorId);
        inscricaoEventoRepository.delete(inscricao);
    }

    private Atleta obterAtletaCadastrado(Long atletaId, CategoriaEvento categoria) {
        Atleta atleta = atletaRepository.findById(atletaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado."));
        if ("ORGANIZADOR".equals(atleta.getPerfil())) {
            throw new RegraNegocioException("Organizadores não podem ser inscritos como atletas.");
        }
        validarCompatibilidadeGenero(atleta, categoria);
        return atleta;
    }

    /**
     * Resolve um atleta vindo do histórico importado. Se o registro ainda não tem atleta associado,
     * cria um atleta com perfil HISTORICO (dados fictícios de contato) e o vincula ao registro.
     */
    private Atleta obterAtletaDoHistorico(Long historicoId, CategoriaEvento categoria) {
        HistoricoAtleta historico = historicoAtletaRepository.findById(historicoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Registro do histórico não encontrado."));

        if (historico.getAtletaId() != null) {
            return atletaRepository.findById(historico.getAtletaId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta vinculado não encontrado."));
        }

        // O histórico não tem gênero: assume o da categoria alvo para não gravar um gênero incompatível
        String genero = categoria.getGenero() != null && categoria.getGenero().toUpperCase().contains("FEM")
                ? "FEMININO"
                : "MASCULINO";

        Atleta novoAtleta = new Atleta();
        novoAtleta.setNomeCompleto(historico.getNomeAtleta());
        novoAtleta.setDataNascimento(LocalDate.of(2000, 1, 1));
        novoAtleta.setGenero(genero);
        novoAtleta.setCelular(String.format("(00) 9%04d-%04d", historicoId / 10000, historicoId % 10000));
        novoAtleta.setEmail("historico_" + historicoId + "@fairplay.com");
        novoAtleta.setSenha(passwordEncoder.encode("123456"));
        novoAtleta.setCidade("Niterói");
        novoAtleta.setEstado("RJ");
        novoAtleta.setNomeBox(historico.getBoxOrigem() != null ? historico.getBoxOrigem() : "Sem Box");
        novoAtleta.setPerfil("HISTORICO");

        validarCompatibilidadeGenero(novoAtleta, categoria);

        Atleta salvo = atletaRepository.save(novoAtleta);
        historico.setAtletaId(salvo.getId());
        historicoAtletaRepository.save(historico);
        return salvo;
    }

    private void validarCompatibilidadeGenero(Atleta atleta, CategoriaEvento categoria) {
        String generoCategoria = categoria.getGenero() != null ? categoria.getGenero().trim().toUpperCase() : "";
        String generoAtleta = atleta.getGenero() != null ? atleta.getGenero().trim().toUpperCase() : "";

        if (generoCategoria.contains("MIST")) {
            return;
        }

        boolean atletaMasculino = generoAtleta.startsWith("M") || generoAtleta.contains("MASC");
        boolean atletaFeminino = generoAtleta.startsWith("F") || generoAtleta.contains("FEM");

        if (generoCategoria.contains("MASC") && !atletaMasculino) {
            throw new RegraNegocioException("Atletas do sexo feminino não podem ser inscritos em categorias masculinas.");
        }
        if (generoCategoria.contains("FEM") && !atletaFeminino) {
            throw new RegraNegocioException("Atletas do sexo masculino não podem ser inscritos em categorias femininas.");
        }
    }

    // ---------------------------------------------------------------- Auditoria de elegibilidade

    private void aplicarAuditoria(InscricaoEvento inscricao, ResultadoAuditoria auditoria) {
        inscricao.setStatusElegibilidade(auditoria.status());
        inscricao.setCategoriaRecomendada(auditoria.categoriaRecomendada());
        inscricao.setMotivoIrregularidade(auditoria.motivo());
    }

    /**
     * Verifica o histórico do atleta (resultados lançados + histórico importado) contra os critérios
     * de promoção ativos no evento. Cada critério violado vira uma infração.
     */
    private ResultadoAuditoria auditarElegibilidade(Atleta atleta, CategoriaEvento categoriaAlvo) {
        Evento evento = categoriaAlvo.getEvento();
        CategoriaCompeticao nivelInscrito = categoriaAlvo.getNivel();
        List<Participacao> participacoes = buscarParticipacoes(atleta);
        List<String> infracoes = new ArrayList<>();

        if (evento.isRegraCampeaoSobe()) {
            boolean jaFoiCampeaoAquiOuAcima = participacoes.stream()
                    .anyMatch(p -> p.colocacao() == 1 && p.categoria().ordinal() >= nivelInscrito.ordinal());
            if (jaFoiCampeaoAquiOuAcima) {
                infracoes.add("Já conquistou o 1º lugar na categoria " + nivelInscrito.getDescricao() + " ou superior.");
            }
        }

        if (evento.isRegraTresPodiosSobe()) {
            long podios = participacoes.stream()
                    .filter(p -> p.categoria() == nivelInscrito && p.colocacao() <= 3)
                    .count();
            if (podios >= 3) {
                infracoes.add("Possui " + podios + " pódios na categoria " + nivelInscrito.getDescricao() + " (limite: 3).");
            }
        }

        if (evento.isRegraTresParticipacoesSobe()) {
            long vezes = participacoes.stream()
                    .filter(p -> p.categoria() == nivelInscrito)
                    .count();
            if (vezes >= 3) {
                infracoes.add("Já participou " + vezes + " vezes da categoria " + nivelInscrito.getDescricao() + ".");
            }
        }

        if (infracoes.isEmpty()) {
            return new ResultadoAuditoria("REGULAR", nivelInscrito.getDescricao(), "Atleta cumpre todos os critérios definidos.");
        }
        return new ResultadoAuditoria("IRREGULAR", proximoNivel(nivelInscrito).getDescricao(), String.join(" | ", infracoes));
    }

    private List<Participacao> buscarParticipacoes(Atleta atleta) {
        List<Participacao> participacoes = new ArrayList<>();

        for (ResultadoCampeonato r : resultadoCampeonatoRepository.findByAtletaIdOrderByDataCampeonatoDesc(atleta.getId())) {
            if (r.getCategoria() != null && r.getColocacao() != null) {
                participacoes.add(new Participacao(r.getCategoria(), r.getColocacao()));
            }
        }

        for (HistoricoAtleta h : historicoAtletaRepository.buscarHistoricoPorAtletaIdOuNome(atleta.getId(), atleta.getNomeCompleto())) {
            CategoriaCompeticao categoria = CategoriaCompeticao.fromString(h.getCategoriaPadronizada());
            if (categoria != null && h.getColocacao() != null) {
                participacoes.add(new Participacao(categoria, h.getColocacao()));
            }
        }

        return participacoes;
    }

    /** Próximo nível na ordem do enum (ELITE sobe para MASTER; MASTER permanece). */
    private CategoriaCompeticao proximoNivel(CategoriaCompeticao nivelAtual) {
        CategoriaCompeticao[] niveis = CategoriaCompeticao.values();
        int proximo = nivelAtual.ordinal() + 1;
        return proximo < niveis.length ? niveis[proximo] : nivelAtual;
    }

    private record Participacao(CategoriaCompeticao categoria, int colocacao) {}

    private record ResultadoAuditoria(String status, String categoriaRecomendada, String motivo) {}
}
