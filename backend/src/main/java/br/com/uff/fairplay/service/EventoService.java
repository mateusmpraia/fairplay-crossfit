package br.com.uff.fairplay.service;

import br.com.uff.fairplay.dto.CriarCategoriaDTO;
import br.com.uff.fairplay.dto.CriarEventoDTO;
import br.com.uff.fairplay.dto.InscreverAtletaDTO;
import br.com.uff.fairplay.model.*;
import br.com.uff.fairplay.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class EventoService {

    private final EventoRepository eventoRepository;
    private final CategoriaEventoRepository categoriaEventoRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;
    private final AtletaRepository atletaRepository;
    private final ResultadoCampeonatoRepository resultadoCampeonatoRepository;
    private final HistoricoAtletaRepository historicoAtletaRepository;

    public EventoService(EventoRepository eventoRepository,
                         CategoriaEventoRepository categoriaEventoRepository,
                         InscricaoEventoRepository inscricaoEventoRepository,
                         AtletaRepository atletaRepository,
                         ResultadoCampeonatoRepository resultadoCampeonatoRepository,
                         HistoricoAtletaRepository historicoAtletaRepository) {
        this.eventoRepository = eventoRepository;
        this.categoriaEventoRepository = categoriaEventoRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
        this.atletaRepository = atletaRepository;
        this.resultadoCampeonatoRepository = resultadoCampeonatoRepository;
        this.historicoAtletaRepository = historicoAtletaRepository;
    }

    @Transactional
    public Evento criarEvento(CriarEventoDTO dto) {
        Evento evento = new Evento();
        evento.setOrganizadorId(dto.organizadorId());
        evento.setNome(dto.nome());
        evento.setDataInicio(dto.dataInicio());
        evento.setDataFim(dto.dataFim());
        evento.setLocalizacao(dto.localizacao());
        evento.setRegraCampeaoSobe(dto.regraCampeaoSobe());
        evento.setRegraTresPodiosSobe(dto.regraTresPodiosSobe());
        evento.setRegraTresParticipacoesSobe(dto.regraTresParticipacoesSobe());

        if (dto.categorias() != null) {
            for (CriarCategoriaDTO catDto : dto.categorias()) {
                CategoriaEvento cat = new CategoriaEvento();
                cat.setEvento(evento);
                cat.setFormato(catDto.formato());
                cat.setGenero(catDto.genero());
                cat.setNivel(CategoriaCompeticao.fromString(catDto.nivel()));
                evento.getCategorias().add(cat);
            }
        }

        return eventoRepository.save(evento);
    }

    public List<Evento> listarEventosPorOrganizador(Long organizadorId) {
        if (organizadorId == null || organizadorId <= 0) {
            return eventoRepository.findAll();
        }
        List<Evento> eventos = eventoRepository.findByOrganizadorIdOrderByDataInicioDesc(organizadorId);
        if (eventos.isEmpty()) {
            return eventoRepository.findAll();
        }
        return eventos;
    }

    @Transactional
public InscricaoEvento inscreverAtleta(InscreverAtletaDTO dto) {
    CategoriaEvento categoria = categoriaEventoRepository.findById(dto.categoriaEventoId())
            .orElseThrow(() -> new RuntimeException("Categoria do evento não encontrada."));

    Long atletaIdRequisitado = dto.atletaId();
    Atleta atleta;

    // Trata a inscrição quando o ID veio de historico_atletas (ID sintético > 100000)
    if (atletaIdRequisitado != null && atletaIdRequisitado > 100000L) {
        Long historicoId = atletaIdRequisitado - 100000L;
        HistoricoAtleta historico = historicoAtletaRepository.findById(historicoId)
                .orElseThrow(() -> new RuntimeException("Registro do histórico não encontrado."));

        if (historico.getAtletaId() != null) {
            atleta = atletaRepository.findById(historico.getAtletaId())
                    .orElseThrow(() -> new RuntimeException("Atleta vinculado não encontrado."));
        } else {
            // Define o gênero com base na categoria alvo para evitar salvar gênero errado no banco
            String generoDefinido = "MASCULINO";
            if (categoria.getGenero() != null && categoria.getGenero().toUpperCase().contains("FEM")) {
                generoDefinido = "FEMININO";
            }

            // Cria a instância em memória para validar a compatibilidade antes de salvar no banco
            Atleta novoAtleta = new Atleta();
            novoAtleta.setNomeCompleto(historico.getNomeAtleta());
            novoAtleta.setCpf(null);
            novoAtleta.setDataNascimento(LocalDate.of(2000, 1, 1));
            novoAtleta.setGenero(generoDefinido);
            novoAtleta.setCelular(String.format("(00) 9%04d-%04d", historico.getId() / 10000, historico.getId() % 10000));
            novoAtleta.setEmail("historico_" + historico.getId() + "@fairplay.com");
            novoAtleta.setSenha("123456");
            novoAtleta.setCidade("Niterói");
            novoAtleta.setEstado("RJ");
            novoAtleta.setNomeBox(historico.getBoxOrigem() != null ? historico.getBoxOrigem() : "Sem Box");
            novoAtleta.setPerfil("HISTORICO");

            // Valida compatibilidade de gênero antes da inserção
            validarCompatibilidadeGenero(novoAtleta, categoria);

            atleta = atletaRepository.save(novoAtleta);

            // Vincula o id_atleta gerado ao registro de histórico
            historico.setAtletaId(atleta.getId());
            historicoAtletaRepository.save(historico);
        }
    } else {
        atleta = atletaRepository.findById(atletaIdRequisitado)
                .orElseThrow(() -> new RuntimeException("Atleta não encontrado."));
        
        // Valida compatibilidade de gênero para atleta já cadastrado
        validarCompatibilidadeGenero(atleta, categoria);
    }

    if (inscricaoEventoRepository.existsByCategoriaEventoIdAndAtletaId(categoria.getId(), atleta.getId())) {
        throw new RuntimeException("Este atleta já está inscrito nesta categoria.");
    }

    // Avaliação de elegibilidade e sugestão da categoria correta
    ResultadoAuditoria auditoria = auditarElegibilidade(atleta.getId(), categoria);

    InscricaoEvento inscricao = new InscricaoEvento();
    inscricao.setCategoriaEvento(categoria);
    inscricao.setAtleta(atleta);
    inscricao.setStatusElegibilidade(auditoria.status());
    inscricao.setCategoriaRecomendada(auditoria.categoriaRecomendada());
    inscricao.setMotivoIrregularidade(auditoria.motivo());

    return inscricaoEventoRepository.save(inscricao);
}

    private void validarCompatibilidadeGenero(Atleta atleta, CategoriaEvento categoria) {
        String generoCat = categoria.getGenero() != null ? categoria.getGenero().trim().toUpperCase() : "";
    String sexoAtleta = atleta.getGenero() != null ? atleta.getGenero().trim().toUpperCase() : "";

    // Se a categoria for mista, qualquer atleta é aceito
        if (generoCat.contains("MIST")) {
            return;
        }

        boolean isCatMasculina = generoCat.contains("MASC");
        boolean isCatFeminina = generoCat.contains("FEM");

        boolean isAtletaMasculino = sexoAtleta.startsWith("M") || sexoAtleta.contains("MASC");
        boolean isAtletaFeminino = sexoAtleta.startsWith("F") || sexoAtleta.contains("FEM");

        if (isCatMasculina && !isAtletaMasculino) {
            throw new RuntimeException("Atletas do sexo feminino não podem ser inscritos em categorias masculinas.");
        }

        if (isCatFeminina && !isAtletaFeminino) {
            throw new RuntimeException("Atletas do sexo masculino não podem ser inscritos em categorias femininas.");
        }
    }

    private ResultadoAuditoria auditarElegibilidade(Long atletaId, CategoriaEvento categoriaAlvo) {
        Evento evento = categoriaAlvo.getEvento();
        CategoriaCompeticao nivelInscrito = categoriaAlvo.getNivel();

        Atleta atleta = atletaRepository.findById(atletaId)
            .orElseThrow(() -> new RuntimeException("Atleta não encontrado."));

        List<ResultadoCompeticaoHistorico> historicoTotal = new ArrayList<>();

    // 1. Histórico de campeonatos cadastrados manualmente
        for (ResultadoCampeonato r : resultadoCampeonatoRepository.findByAtletaIdOrderByDataCampeonatoDesc(atletaId)) {
            if (r.getCategoria() != null && r.getColocacao() != null) {
                historicoTotal.add(new ResultadoCompeticaoHistorico(r.getCategoria(), r.getColocacao()));
            }
    }

    // 2. Histórico vindo da tabela historico_atletas (busca por ID ou Nome)
        for (HistoricoAtleta h : historicoAtletaRepository.buscarHistoricoPorAtletaIdOuNome(atletaId, atleta.getNomeCompleto())) {
            CategoriaCompeticao cat = converterCategoria(h.getCategoriaPadronizada());
            if (cat != null && h.getColocacao() != null) {
                historicoTotal.add(new ResultadoCompeticaoHistorico(cat, h.getColocacao()));
            }
        }

    List<String> infracoes = new ArrayList<>();

    // Regra 1: Se já foi campeão na mesma categoria ou em categoria superior
        if (evento.isRegraCampeaoSobe()) {
            boolean jaFoiCampeaoAquiOuAcima = historicoTotal.stream().anyMatch(h -> 
            h.colocacao() == 1 && (h.categoria() == nivelInscrito || h.categoria().ordinal() >= nivelInscrito.ordinal())
            );
            if (jaFoiCampeaoAquiOuAcima) {
                infracoes.add("Já conquistou o 1º lugar na categoria " + nivelInscrito.getDescricao() + " ou superior.");
            }
        }

    // Regra 2: 3 ou mais pódios na categoria
    if (evento.isRegraTresPodiosSobe()) {
        long totalPodios = historicoTotal.stream().filter(h -> 
            h.colocacao() <= 3 && h.categoria() == nivelInscrito
        ).count();
        if (totalPodios >= 3) {
            infracoes.add("Possui " + totalPodios + " pódios na categoria " + nivelInscrito.getDescricao() + " (limite: 3).");
        }
    }

    // Regra 3: 3 ou mais participações gerais na mesma categoria
    if (evento.isRegraTresParticipacoesSobe()) {
        long totalParticipacoes = historicoTotal.stream().filter(h -> 
            h.categoria() == nivelInscrito
        ).count();
        if (totalParticipacoes >= 3) {
            infracoes.add("Já participou " + totalParticipacoes + " vezes da categoria " + nivelInscrito.getDescricao() + ".");
        }
    }

    if (infracoes.isEmpty()) {
        return new ResultadoAuditoria(
            "REGULAR", 
            nivelInscrito.getDescricao(), 
            "Atleta cumpre todos os critérios definidos."
        );
    } else {
        String categoriaPromovida = calcularProximoNivel(nivelInscrito);
        return new ResultadoAuditoria(
            "IRREGULAR", 
            categoriaPromovida, 
            String.join(" | ", infracoes)
        );
    }
}

    private String calcularProximoNivel(CategoriaCompeticao nivelAtual) {
        CategoriaCompeticao[] niveis = CategoriaCompeticao.values();
        int proximoOrdinal = nivelAtual.ordinal() + 1;

        if (proximoOrdinal < niveis.length) {
            return niveis[proximoOrdinal].getDescricao();
        }
        return nivelAtual.getDescricao();
    }

    private CategoriaCompeticao converterCategoria(String texto) {
        if (texto == null) return null;
        try {
            return CategoriaCompeticao.fromString(texto);
        } catch (Exception e) {
            String norm = texto.toUpperCase();
            if (norm.contains("MASTER")) return CategoriaCompeticao.MASTER;
            if (norm.contains("ELITE")) return CategoriaCompeticao.ELITE;
            if (norm.contains("RX")) return CategoriaCompeticao.RX;
            if (norm.contains("INTERMEDI")) return CategoriaCompeticao.INTERMEDIARIO;
            if (norm.contains("SCALE")) return CategoriaCompeticao.SCALE;
            if (norm.contains("INIC")) return CategoriaCompeticao.INICIANTE;
            return null;
        }
    }

    @Transactional
    public void excluirEvento(Long eventoId) {
        Evento evento = eventoRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("Evento não encontrado."));
        eventoRepository.delete(evento);
    }

    @Transactional
    public Evento atualizarRegrasEReauditar(Long eventoId, boolean campeaoSobe, boolean tresPodiosSobe, boolean tresParticipacoesSobe) {
        Evento evento = eventoRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("Evento não encontrado."));

        evento.setRegraCampeaoSobe(campeaoSobe);
        evento.setRegraTresPodiosSobe(tresPodiosSobe);
        evento.setRegraTresParticipacoesSobe(tresParticipacoesSobe);
        eventoRepository.save(evento);

        // Reaudita todos os atletas inscritos em todas as categorias deste evento
        for (CategoriaEvento cat : evento.getCategorias()) {
            List<InscricaoEvento> inscricoes = inscricaoEventoRepository.findByCategoriaEventoId(cat.getId());
            for (InscricaoEvento ins : inscricoes) {
                ResultadoAuditoria novaAuditoria = auditarElegibilidade(ins.getAtleta().getId(), cat);
                ins.setStatusElegibilidade(novaAuditoria.status());
                ins.setCategoriaRecomendada(novaAuditoria.categoriaRecomendada());
                ins.setMotivoIrregularidade(novaAuditoria.motivo());
                inscricaoEventoRepository.save(ins);
            }
        }

        return evento;
    }

    @Transactional
    public CategoriaEvento adicionarCategoria(Long eventoId, CriarCategoriaDTO dto) {
        Evento evento = eventoRepository.findById(eventoId)
                .orElseThrow(() -> new RuntimeException("Evento não encontrado."));

        CategoriaEvento cat = new CategoriaEvento();
        cat.setEvento(evento);
        cat.setFormato(dto.formato());
        cat.setGenero(dto.genero());
        cat.setNivel(CategoriaCompeticao.fromString(dto.nivel()));

        return categoriaEventoRepository.save(cat);
    }

    @Transactional
    public void excluirCategoria(Long categoriaId) {
        CategoriaEvento cat = categoriaEventoRepository.findById(categoriaId)
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada."));
        categoriaEventoRepository.delete(cat);
    }

    private record ResultadoCompeticaoHistorico(CategoriaCompeticao categoria, int colocacao) {}
    private record ResultadoAuditoria(String status, String categoriaRecomendada, String motivo) {}
}