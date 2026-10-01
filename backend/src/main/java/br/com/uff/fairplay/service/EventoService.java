package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.AlteracaoAuditoriaDTO;
import br.com.uff.fairplay.dto.AtualizarRegrasDTO;
import br.com.uff.fairplay.dto.CriarCategoriaDTO;
import br.com.uff.fairplay.dto.CriarEventoDTO;
import br.com.uff.fairplay.dto.InscreverAtletaDTO;
import br.com.uff.fairplay.dto.InscreverSemCadastroDTO;
import br.com.uff.fairplay.dto.LancarResultadosDTO;
import br.com.uff.fairplay.dto.ResultadoInscricaoLoteDTO;
import br.com.uff.fairplay.exception.AcessoNegadoException;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.model.*;
import br.com.uff.fairplay.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EventoService {

    /**
     * A busca de atletas ({@code AtletaRepository#buscarPorNomeOuCpf}) devolve atletas do histórico
     * ainda não cadastrados com id = id do histórico + este deslocamento, para não colidir com ids reais.
     */
    private static final long DESLOCAMENTO_ID_HISTORICO = 100000L;

    /** Máximo de CPFs aceitos numa única importação de planilha. */
    private static final int LIMITE_INSCRICAO_EM_LOTE = 2000;

    private static final Set<String> FORMATOS = Set.of("Individual", "Dupla", "Trio", "Time");
    private static final Set<String> GENEROS_CATEGORIA = Set.of("Masculino", "Feminino", "Misto");

    private final EventoRepository eventoRepository;
    private final CategoriaEventoRepository categoriaEventoRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;
    private final AtletaRepository atletaRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final AuditoriaInscricaoService auditoriaService;

    public EventoService(EventoRepository eventoRepository,
                         CategoriaEventoRepository categoriaEventoRepository,
                         InscricaoEventoRepository inscricaoEventoRepository,
                         AtletaRepository atletaRepository,
                         HistoricoAtletaRepository historicoAtletaRepository,
                         AuditoriaInscricaoService auditoriaService) {
        this.eventoRepository = eventoRepository;
        this.categoriaEventoRepository = categoriaEventoRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
        this.atletaRepository = atletaRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.auditoriaService = auditoriaService;
    }

    // ---------------------------------------------------------------- Eventos e categorias

    @Transactional
    public Evento criarEvento(CriarEventoDTO dto, Long organizadorId) {
        if (dto.nome() == null || dto.nome().trim().length() < 3) {
            throw new RegraNegocioException("Informe um nome com pelo menos 3 letras para o evento.");
        }
        if (dto.dataInicio() == null) {
            throw new RegraNegocioException("Informe a data de início do evento.");
        }
        if (dto.dataFim() != null && dto.dataFim().isBefore(dto.dataInicio())) {
            throw new RegraNegocioException("A data de término não pode ser anterior à de início.");
        }
        if (dto.categorias() == null || dto.categorias().isEmpty()) {
            throw new RegraNegocioException("Adicione pelo menos uma categoria ao evento.");
        }

        Evento evento = new Evento();
        evento.setOrganizadorId(organizadorId);
        evento.setNome(dto.nome().trim());
        evento.setDataInicio(dto.dataInicio());
        evento.setDataFim(dto.dataFim());
        evento.setLocalizacao(dto.localizacao());
        evento.setRegraCampeaoSobe(dto.regraCampeaoSobe());
        evento.setRegraTresPodiosSobe(dto.regraTresPodiosSobe());
        evento.setRegraTresParticipacoesSobe(dto.regraTresParticipacoesSobe());
        // Opcional para não quebrar quem ainda não envia o critério (ex.: a versão anterior da tela)
        evento.setRegraNaoDesce(Boolean.TRUE.equals(dto.regraNaoDesce()));

        for (CriarCategoriaDTO catDto : dto.categorias()) {
            evento.getCategorias().add(novaCategoria(evento, catDto));
        }

        return eventoRepository.save(evento);
    }

    public List<Evento> listarEventosDoOrganizador(Long organizadorId) {
        return eventoRepository.findByOrganizadorIdOrderByDataInicioDesc(organizadorId);
    }

    /** Exclui o evento; os resultados lançados nele saem do histórico dos atletas, que são reauditados. */
    @Transactional
    public void excluirEvento(Long eventoId, Long organizadorId) {
        Evento evento = buscarEventoDoOrganizador(eventoId, organizadorId);
        List<Long> atletasComResultado = atletasComResultado(evento.getCategorias());
        eventoRepository.delete(evento);
        auditoriaService.reauditarInscricoesEmAberto(atletasComResultado);
    }

    /** Atualiza os critérios de promoção do evento e refaz a auditoria de todos os inscritos. */
    @Transactional
    public Evento atualizarRegrasEReauditar(Long eventoId, AtualizarRegrasDTO regras, Long organizadorId) {
        Evento evento = buscarEventoDoOrganizador(eventoId, organizadorId);
        evento.setRegraCampeaoSobe(regras.regraCampeaoSobe());
        evento.setRegraTresPodiosSobe(regras.regraTresPodiosSobe());
        evento.setRegraTresParticipacoesSobe(regras.regraTresParticipacoesSobe());
        if (regras.regraNaoDesce() != null) {
            evento.setRegraNaoDesce(regras.regraNaoDesce());
        }
        eventoRepository.save(evento);
        reauditarEvento(evento);
        return evento;
    }

    /** Refaz a auditoria de todos os inscritos do evento, a pedido do organizador (critérios ou categorias mudaram). */
    private void reauditarEvento(Evento evento) {
        for (CategoriaEvento categoria : evento.getCategorias()) {
            for (InscricaoEvento inscricao : inscricaoEventoRepository.findByCategoriaEventoId(categoria.getId())) {
                auditoriaService.aplicar(inscricao);
                inscricaoEventoRepository.save(inscricao);
            }
        }
    }

    /**
     * Adiciona a categoria e refaz a auditoria do evento: com uma categoria acima, quem atingiu um critério
     * de promoção passa a ser obrigado a subir.
     */
    @Transactional
    public CategoriaEvento adicionarCategoria(Long eventoId, CriarCategoriaDTO dto, Long organizadorId) {
        Evento evento = buscarEventoDoOrganizador(eventoId, organizadorId);
        CategoriaEvento categoria = novaCategoria(evento, dto);
        evento.getCategorias().add(categoria);
        CategoriaEvento salva = categoriaEventoRepository.save(categoria);
        reauditarEvento(evento);
        return salva;
    }

    @Transactional
    public void excluirCategoria(Long categoriaId, Long organizadorId) {
        CategoriaEvento categoria = buscarCategoriaDoOrganizador(categoriaId, organizadorId);
        // A categoria sai da lista do evento: como a lista é carregada junto com o evento e salva em cascata,
        // apagar só a categoria faria o Hibernate desfazer a exclusão ao gravar o evento
        List<Long> atletasComResultado = atletasComResultado(List.of(categoria));
        Evento evento = categoria.getEvento();
        evento.getCategorias().remove(categoria);
        categoriaEventoRepository.delete(categoria);
        auditoriaService.reauditarInscricoesEmAberto(atletasComResultado);
        // Sem a categoria, quem era obrigado a subir para ela pode passar a competir onde está
        reauditarEvento(evento);
    }

    /** Atletas com colocação lançada nas categorias (o histórico deles muda se as categorias forem apagadas). */
    private List<Long> atletasComResultado(List<CategoriaEvento> categorias) {
        List<Long> ids = categorias.stream().map(CategoriaEvento::getId).toList();
        return ids.isEmpty() ? List.of() : inscricaoEventoRepository.buscarAtletasComResultado(ids);
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
        CategoriaCompeticao nivel = CategoriaCompeticao.fromString(dto.nivel());
        if (!FORMATOS.contains(dto.formato()) || !GENEROS_CATEGORIA.contains(dto.genero()) || nivel == null) {
            throw new RegraNegocioException("Categoria inválida: informe formato, gênero e nível entre as opções disponíveis.");
        }

        CategoriaEvento categoria = new CategoriaEvento();
        categoria.setEvento(evento);
        categoria.setFormato(dto.formato());
        categoria.setGenero(dto.genero());
        categoria.setNivel(nivel);
        return categoria;
    }

    // ---------------------------------------------------------------- Inscrições

    @Transactional
    public InscricaoEvento inscreverAtleta(InscreverAtletaDTO dto, Long organizadorId) {
        CategoriaEvento categoria = buscarCategoriaDoOrganizador(dto.categoriaEventoId(), organizadorId);

        if (dto.atletaId() == null) {
            throw new RegraNegocioException("Informe o atleta a inscrever.");
        }
        Atleta atleta = dto.atletaId() > DESLOCAMENTO_ID_HISTORICO
                ? obterAtletaDoHistorico(dto.atletaId() - DESLOCAMENTO_ID_HISTORICO, categoria)
                : obterAtletaCadastrado(dto.atletaId(), categoria);

        return criarInscricao(categoria, atleta);
    }

    /**
     * Inscreve na categoria os atletas cadastrados com os CPFs informados (vindos de uma planilha).
     * Cada CPF é tratado de forma independente: os válidos são inscritos e os demais voltam
     * na lista de falhas com o motivo, sem impedir os outros.
     */
    @Transactional
    public ResultadoInscricaoLoteDTO inscreverEmLote(Long categoriaId, List<String> cpfs, Long organizadorId) {
        CategoriaEvento categoria = buscarCategoriaDoOrganizador(categoriaId, organizadorId);

        if (cpfs == null || cpfs.isEmpty()) {
            throw new RegraNegocioException("Nenhum CPF foi enviado.");
        }
        if (cpfs.size() > LIMITE_INSCRICAO_EM_LOTE) {
            throw new RegraNegocioException("Envie no máximo " + LIMITE_INSCRICAO_EM_LOTE + " CPFs por vez.");
        }

        List<String> cpfsDistintos = cpfs.stream().map(EventoService::apenasDigitos).distinct().toList();
        List<String> cpfsValidos = cpfsDistintos.stream().filter(c -> c.length() == 11).toList();

        Map<String, Atleta> atletasPorCpf = cpfsValidos.isEmpty() ? Map.of()
                : atletaRepository.buscarAtletasPorCpfs(cpfsValidos).stream()
                        .collect(Collectors.toMap(a -> apenasDigitos(a.getCpf()), a -> a, (a, b) -> a));

        List<InscricaoEvento> inscritos = new ArrayList<>();
        List<ResultadoInscricaoLoteDTO.Falha> falhas = new ArrayList<>();

        for (String cpf : cpfsDistintos) {
            Atleta atleta = atletasPorCpf.get(cpf);
            if (cpf.length() != 11) {
                falhas.add(new ResultadoInscricaoLoteDTO.Falha(cpf, "CPF inválido (deve ter 11 dígitos)."));
            } else if (atleta == null) {
                falhas.add(new ResultadoInscricaoLoteDTO.Falha(cpf, "Nenhum atleta cadastrado com este CPF."));
            } else {
                try {
                    RegrasElegibilidade.validarGenero(atleta.getGenero(), categoria.getGenero());
                    inscritos.add(criarInscricao(categoria, atleta));
                } catch (RegraNegocioException e) {
                    falhas.add(new ResultadoInscricaoLoteDTO.Falha(cpf, e.getMessage()));
                }
            }
        }

        return new ResultadoInscricaoLoteDTO(inscritos, falhas);
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
        // Se já tinha colocação, o resultado sai do histórico do atleta
        if (inscricao.getColocacao() != null) {
            auditoriaService.reauditarInscricoesEmAberto(inscricao.getAtleta().getId());
        }
    }

    /** Quantas inscrições de cada categoria do organizador mudaram de status sozinhas e ele ainda não viu. */
    public List<AlteracaoAuditoriaDTO> alteracoesDeAuditoria(Long organizadorId) {
        return inscricaoEventoRepository.contarAlteracoesDoOrganizador(organizadorId);
    }

    /** O organizador marcou que viu a mudança de status da inscrição. */
    @Transactional
    public InscricaoEvento marcarCiente(Long inscricaoId, Long organizadorId) {
        InscricaoEvento inscricao = inscricaoEventoRepository.findById(inscricaoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Inscrição não encontrada."));
        exigirDono(inscricao.getCategoriaEvento().getEvento(), organizadorId);
        auditoriaService.limparDestaque(inscricao);
        return inscricaoEventoRepository.save(inscricao);
    }

    /**
     * Grava as colocações finais da categoria. Esses resultados passam a fazer parte do histórico
     * do atleta (painel, recomendação e auditoria de eventos futuros), então as inscrições em aberto
     * de quem teve a colocação alterada são reauditadas.
     */
    @Transactional
    public List<InscricaoEvento> lancarResultados(Long categoriaId, LancarResultadosDTO dto, Long organizadorId) {
        CategoriaEvento categoria = buscarCategoriaDoOrganizador(categoriaId, organizadorId);
        Map<Long, InscricaoEvento> inscricoes = inscricaoEventoRepository.findByCategoriaEventoId(categoria.getId()).stream()
                .collect(Collectors.toMap(InscricaoEvento::getId, Function.identity()));

        if (dto.resultados() == null) {
            throw new RegraNegocioException("Nenhum resultado foi enviado.");
        }
        Set<Long> atletasAlterados = new HashSet<>();
        for (LancarResultadosDTO.Item item : dto.resultados()) {
            InscricaoEvento inscricao = inscricoes.get(item.inscricaoId());
            if (inscricao == null) {
                throw new RegraNegocioException("Uma das inscrições enviadas não pertence a esta categoria.");
            }
            if (item.colocacao() != null && item.colocacao() < 1) {
                throw new RegraNegocioException("A colocação deve ser um número inteiro a partir de 1.");
            }
            if (!Objects.equals(inscricao.getColocacao(), item.colocacao())) {
                atletasAlterados.add(inscricao.getAtleta().getId());
            }
            inscricao.setColocacao(item.colocacao());
        }

        List<InscricaoEvento> salvas = inscricaoEventoRepository.saveAll(inscricoes.values());
        auditoriaService.reauditarInscricoesEmAberto(atletasAlterados);
        return salvas;
    }

    /**
     * Inscreve um atleta que não tem cadastro nem histórico no sistema. Se o CPF for informado e já houver
     * um atleta sem cadastro com ele (inscrito antes em outro evento), reaproveita esse registro; se o CPF
     * for de uma conta de atleta, recusa, pois ele deve ser buscado e inscrito normalmente.
     */
    @Transactional
    public InscricaoEvento inscreverSemCadastro(InscreverSemCadastroDTO dto, Long organizadorId) {
        CategoriaEvento categoria = buscarCategoriaDoOrganizador(dto.categoriaEventoId(), organizadorId);

        String nome = dto.nomeCompleto() != null ? dto.nomeCompleto().trim().replaceAll("\\s+", " ") : "";
        if (nome.length() < 3) {
            throw new RegraNegocioException("Informe o nome completo do atleta.");
        }

        String cpf = null;
        if (dto.cpf() != null && !apenasDigitos(dto.cpf()).isEmpty()) {
            if (!ValidacaoCadastro.cpfValido(dto.cpf())) {
                throw new RegraNegocioException("CPF inválido. Confira os números ou deixe o campo em branco.");
            }
            cpf = ValidacaoCadastro.formatarCpf(dto.cpf());
            if (atletaRepository.existsByCpfAndPerfil(cpf, Atleta.PERFIL_ATLETA)) {
                throw new RegraNegocioException("Já existe um atleta cadastrado com este CPF. Busque pelo CPF para inscrevê-lo.");
            }
            Optional<Atleta> jaInscritoAntes = atletaRepository.findByCpfAndPerfil(cpf, Atleta.PERFIL_SEM_CADASTRO);
            if (jaInscritoAntes.isPresent()) {
                RegrasElegibilidade.validarGenero(jaInscritoAntes.get().getGenero(), categoria.getGenero());
                return criarInscricao(categoria, jaInscritoAntes.get());
            }
        }

        String box = dto.nomeBox() != null ? dto.nomeBox().trim() : "";
        if (box.length() > 100) {
            throw new RegraNegocioException("O nome do box deve ter até 100 caracteres.");
        }

        Atleta atleta = new Atleta();
        atleta.setNomeCompleto(nome);
        atleta.setCpf(cpf);
        atleta.setGenero(generoParaCategoria(dto.genero(), categoria));
        atleta.setNomeBox(box.isEmpty() ? "Sem Box" : box);
        atleta.setPerfil(Atleta.PERFIL_SEM_CADASTRO);
        return criarInscricao(categoria, atletaRepository.save(atleta));
    }

    /** Gênero informado pelo organizador ou, se não informado, o da categoria (obrigatório em categorias mistas). */
    private static String generoParaCategoria(String generoInformado, CategoriaEvento categoria) {
        String genero = generoInformado != null ? generoInformado.trim().toUpperCase() : "";
        if (genero.isEmpty()) {
            String daCategoria = categoria.getGenero() != null ? categoria.getGenero().toUpperCase() : "";
            if (daCategoria.contains("MASC")) return "MASCULINO";
            if (daCategoria.contains("FEM")) return "FEMININO";
            throw new RegraNegocioException("Informe o gênero do atleta: a categoria é mista.");
        }
        if (!Set.of("MASCULINO", "FEMININO", "OUTRO").contains(genero)) {
            throw new RegraNegocioException("Gênero inválido.");
        }
        RegrasElegibilidade.validarGenero(genero, categoria.getGenero());
        return genero;
    }

    private Atleta obterAtletaCadastrado(Long atletaId, CategoriaEvento categoria) {
        Atleta atleta = atletaRepository.findById(atletaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta não encontrado."));
        if (Atleta.PERFIL_ORGANIZADOR.equals(atleta.getPerfil())) {
            throw new RegraNegocioException("Organizadores não podem ser inscritos como atletas.");
        }
        RegrasElegibilidade.validarGenero(atleta.getGenero(), categoria.getGenero());
        return atleta;
    }

    /**
     * Resolve um atleta vindo do histórico importado. Se o registro ainda não está vinculado a ninguém,
     * cria um atleta pendente (perfil HISTORICO) só com nome, gênero e box — sem dados de contato
     * inventados — e vincula a ele os registros do histórico com esse nome. A pessoa pode reivindicar
     * esse registro depois, ao se cadastrar.
     */
    private Atleta obterAtletaDoHistorico(Long historicoId, CategoriaEvento categoria) {
        HistoricoAtleta historico = historicoAtletaRepository.findById(historicoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Registro do histórico não encontrado."));

        List<Long> vinculados = historicoAtletaRepository.buscarAtletasVinculados(historicoId);
        if (!vinculados.isEmpty()) {
            return atletaRepository.findById(vinculados.get(0))
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Atleta vinculado não encontrado."));
        }

        // O histórico não informa o gênero: usa o da categoria em que o atleta está sendo inscrito
        String genero = categoria.getGenero() != null && categoria.getGenero().toUpperCase().contains("FEM")
                ? "FEMININO"
                : "MASCULINO";

        Atleta pendente = new Atleta();
        pendente.setNomeCompleto(historico.getNomeAtleta());
        pendente.setGenero(genero);
        pendente.setNomeBox(historico.getBoxOrigem() != null ? historico.getBoxOrigem() : "Sem Box");
        pendente.setPerfil(Atleta.PERFIL_HISTORICO);

        Atleta salvo = atletaRepository.save(pendente);
        historicoAtletaRepository.vincularHistoricoAoAtleta(salvo.getId(), historico.getNomeAtleta());
        return salvo;
    }

    /** Cria a inscrição já auditada; recusa se o atleta já estiver inscrito na categoria. */
    private InscricaoEvento criarInscricao(CategoriaEvento categoria, Atleta atleta) {
        if (inscricaoEventoRepository.existsByCategoriaEventoIdAndAtletaId(categoria.getId(), atleta.getId())) {
            throw new RegraNegocioException("Este atleta já está inscrito nesta categoria.");
        }

        InscricaoEvento inscricao = new InscricaoEvento();
        inscricao.setCategoriaEvento(categoria);
        inscricao.setAtleta(atleta);
        auditoriaService.aplicar(inscricao);

        return inscricaoEventoRepository.save(inscricao);
    }

    private static String apenasDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }
}
