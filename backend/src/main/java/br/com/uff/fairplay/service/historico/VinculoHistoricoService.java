package br.com.uff.fairplay.service.historico;

import br.com.uff.fairplay.dto.CompeticaoHistoricoDTO;
import br.com.uff.fairplay.dto.VinculoHistoricoDTO;
import br.com.uff.fairplay.exception.RecursoNaoEncontradoException;
import br.com.uff.fairplay.exception.RegraNegocioException;
import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.InscricaoEvento;
import br.com.uff.fairplay.model.PedidoDesvinculo;
import br.com.uff.fairplay.repository.AtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository;
import br.com.uff.fairplay.repository.HistoricoAtletaRepository.ContaVinculada;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import br.com.uff.fairplay.repository.PedidoDesvinculoRepository;
import br.com.uff.fairplay.service.AuditoriaInscricaoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Vínculos do atleta com as competições do histórico importado, escolhidas uma a uma (a mesma pessoa
 * pode aparecer com nomes diferentes, e o mesmo nome pode ser de pessoas diferentes).
 *
 * <ul>
 *   <li>Vincular é livre: só aumenta o histórico do atleta e deixa a auditoria mais rigorosa;</li>
 *   <li>desvincular é livre só durante o prazo {@code fairplay.vinculo.prazo-desvinculo-horas}, para corrigir
 *       enganos. Depois, o atleta envia um pedido e o administrador decide — assim ninguém apaga o próprio
 *       histórico antes de se inscrever numa categoria abaixo do seu nível;</li>
 *   <li>competições desmarcadas ou desvinculadas ficam registradas como "não é minha", e a auditoria
 *       deixa de considerá-las mesmo que o nome seja idêntico ao do atleta.</li>
 * </ul>
 */
@Service
public class VinculoHistoricoService {

    private final HistoricoAtletaRepository historicoAtletaRepository;
    private final AtletaRepository atletaRepository;
    private final InscricaoEventoRepository inscricaoEventoRepository;
    private final PedidoDesvinculoRepository pedidoDesvinculoRepository;
    private final AuditoriaInscricaoService auditoriaService;
    private final long prazoDesvinculoMinutos;

    public VinculoHistoricoService(HistoricoAtletaRepository historicoAtletaRepository,
                                   AtletaRepository atletaRepository,
                                   InscricaoEventoRepository inscricaoEventoRepository,
                                   PedidoDesvinculoRepository pedidoDesvinculoRepository,
                                   AuditoriaInscricaoService auditoriaService,
                                   @Value("${fairplay.vinculo.prazo-desvinculo-horas:24}") long prazoDesvinculoHoras) {
        this.historicoAtletaRepository = historicoAtletaRepository;
        this.atletaRepository = atletaRepository;
        this.inscricaoEventoRepository = inscricaoEventoRepository;
        this.pedidoDesvinculoRepository = pedidoDesvinculoRepository;
        this.auditoriaService = auditoriaService;
        this.prazoDesvinculoMinutos = prazoDesvinculoHoras * 60;
    }

    /** Resultado de um vínculo: quantas competições entraram e quais estavam vinculadas a outra conta. */
    public record ResultadoVinculo(int vinculadas, List<Long> vinculadasAOutraConta) {}

    /**
     * Competições registradas com este nome no histórico e a situação de cada uma para o atleta logado
     * ({@code atletaId} nulo durante o cadastro, quando ainda não há conta).
     */
    public List<CompeticaoHistoricoDTO> competicoesDoNome(String nome, Long atletaId) {
        return historicoAtletaRepository.buscarCompeticoesPorNome(nome.trim()).stream()
                .map(c -> new CompeticaoHistoricoDTO(
                        c.getId(), c.getNomeAtleta(), c.getNomeCompeticao(), c.getCategoria(), c.getColocacao(), c.getBoxOrigem(),
                        situacao(c.getAtletaVinculadoId(), atletaId)))
                .toList();
    }

    private static String situacao(Long atletaVinculadoId, Long atletaId) {
        if (atletaVinculadoId == null) return CompeticaoHistoricoDTO.LIVRE;
        return atletaVinculadoId.equals(atletaId) ? CompeticaoHistoricoDTO.MINHA : CompeticaoHistoricoDTO.OUTRA_CONTA;
    }

    /**
     * Vincula ao atleta as competições marcadas e registra as desmarcadas como "não é minha".
     * Competições vinculadas à conta de outro atleta ficam de fora. Se alguma estava com um atleta
     * pendente (criado quando um organizador inscreveu essa pessoa a partir do histórico), o pendente
     * é incorporado a esta conta: as inscrições dele passam para o atleta.
     */
    @Transactional
    public ResultadoVinculo vincular(Atleta atleta, List<Long> historicoIds, List<Long> recusadosIds) {
        Set<Long> marcadas = semRepetidos(historicoIds);
        Set<Long> desmarcadas = semRepetidos(recusadosIds);
        desmarcadas.removeAll(marcadas);

        List<Long> vinculadasAOutraConta = new ArrayList<>();
        if (!marcadas.isEmpty()) {
            Set<Long> pendentes = new LinkedHashSet<>();
            for (ContaVinculada conta : historicoAtletaRepository.buscarContasVinculadas(List.copyOf(marcadas))) {
                if (conta.getAtletaId().equals(atleta.getId())) continue;
                if (Atleta.PERFIL_HISTORICO.equals(conta.getPerfil())) {
                    pendentes.add(conta.getAtletaId());
                } else {
                    vinculadasAOutraConta.add(conta.getHistoricoId());
                }
            }
            pendentes.forEach(pendenteId -> incorporarPendente(pendenteId, atleta));
            marcadas.removeAll(vinculadasAOutraConta);
        }

        if (!marcadas.isEmpty()) {
            historicoAtletaRepository.vincularCompeticoes(atleta.getId(), List.copyOf(marcadas));
            historicoAtletaRepository.removerRecusas(atleta.getId(), List.copyOf(marcadas));
        }
        if (!desmarcadas.isEmpty()) {
            historicoAtletaRepository.registrarRecusas(atleta.getId(), List.copyOf(desmarcadas));
        }
        // O histórico mudou: as inscrições em aberto (inclusive as herdadas de um pendente) são reauditadas
        auditoriaService.reauditarInscricoesEmAberto(atleta.getId());
        return new ResultadoVinculo(marcadas.size(), List.copyOf(new LinkedHashSet<>(vinculadasAOutraConta)));
    }

    /**
     * Passa as inscrições do atleta pendente para a conta e apaga o pendente (os vínculos dele somem junto;
     * a conta fica só com as competições que a pessoa marcou). Se os dois estavam inscritos na mesma
     * categoria, a inscrição do pendente é descartada.
     */
    private void incorporarPendente(Long pendenteId, Atleta atleta) {
        List<InscricaoEvento> inscricoes = inscricaoEventoRepository.findByAtletaId(pendenteId);
        for (InscricaoEvento inscricao : inscricoes) {
            if (inscricaoEventoRepository.existsByCategoriaEventoIdAndAtletaId(inscricao.getCategoriaEvento().getId(), atleta.getId())) {
                inscricaoEventoRepository.delete(inscricao);
            } else {
                inscricao.setAtleta(atleta);
            }
        }
        inscricaoEventoRepository.flush();
        atletaRepository.deleteById(pendenteId);
        atletaRepository.flush();
    }

    /** Competições vinculadas ao atleta, com o tempo que resta para ele desfazer cada vínculo sozinho. */
    public List<VinculoHistoricoDTO> vinculosDoAtleta(Long atletaId) {
        return historicoAtletaRepository.buscarVinculosDoAtleta(atletaId).stream()
                .map(v -> new VinculoHistoricoDTO(
                        v.getHistoricoId(), v.getNomeAtleta(), v.getNomeCompeticao(), v.getCategoria(), v.getColocacao(),
                        v.getBoxOrigem(), minutosParaDesfazer(v.getMinutosDesdeVinculo()),
                        PedidoDesvinculo.APROVADO.equals(v.getStatusPedido()) ? null : v.getStatusPedido()))
                .toList();
    }

    private long minutosParaDesfazer(Long minutosDesdeVinculo) {
        return Math.max(0, prazoDesvinculoMinutos - (minutosDesdeVinculo != null ? minutosDesdeVinculo : Long.MAX_VALUE / 2));
    }

    /** Desfaz o vínculo, se ainda estiver dentro do prazo livre. A competição passa a contar como "não é minha". */
    @Transactional
    public void desvincular(Long atletaId, Long historicoId) {
        if (buscarVinculo(atletaId, historicoId).minutosParaDesfazer() <= 0) {
            throw new RegraNegocioException(
                    "O prazo para desfazer este vínculo sozinho terminou. Envie um pedido ao administrador explicando o motivo.");
        }
        removerVinculo(atletaId, historicoId);
    }

    /** Registra o pedido de desvínculo para o administrador analisar (só depois do prazo livre). */
    @Transactional
    public void pedirDesvinculo(Long atletaId, Long historicoId, String motivo) {
        VinculoHistoricoDTO vinculo = buscarVinculo(atletaId, historicoId);
        if (vinculo.minutosParaDesfazer() > 0) {
            throw new RegraNegocioException("Você ainda está no prazo para desfazer este vínculo sozinho.");
        }
        String motivoLimpo = motivo != null ? motivo.trim() : "";
        if (motivoLimpo.length() < 10) {
            throw new RegraNegocioException("Explique em pelo menos 10 caracteres por que esta competição não é sua.");
        }
        if (motivoLimpo.length() > 500) {
            throw new RegraNegocioException("O motivo deve ter até 500 caracteres.");
        }
        if (pedidoDesvinculoRepository.existsByAtletaIdAndHistoricoIdAndStatus(atletaId, historicoId, PedidoDesvinculo.PENDENTE)) {
            throw new RegraNegocioException("Já existe um pedido em análise para esta competição.");
        }

        PedidoDesvinculo pedido = new PedidoDesvinculo();
        pedido.setAtletaId(atletaId);
        pedido.setHistorico(historicoAtletaRepository.getReferenceById(historicoId));
        pedido.setMotivo(motivoLimpo);
        pedidoDesvinculoRepository.save(pedido);
    }

    /** Decisão do administrador: aprovar desfaz o vínculo; recusar mantém. */
    @Transactional
    public void decidirPedido(Long pedidoId, boolean aprovar) {
        PedidoDesvinculo pedido = pedidoDesvinculoRepository.findById(pedidoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Pedido não encontrado."));
        if (!PedidoDesvinculo.PENDENTE.equals(pedido.getStatus())) {
            throw new RegraNegocioException("Este pedido já foi decidido.");
        }
        if (aprovar) {
            removerVinculo(pedido.getAtletaId(), pedido.getHistorico().getId());
        }
        pedido.setStatus(aprovar ? PedidoDesvinculo.APROVADO : PedidoDesvinculo.RECUSADO);
        pedido.setDataDecisao(LocalDateTime.now());
        pedidoDesvinculoRepository.save(pedido);
    }

    private void removerVinculo(Long atletaId, Long historicoId) {
        historicoAtletaRepository.desvincular(atletaId, historicoId);
        historicoAtletaRepository.registrarRecusas(atletaId, List.of(historicoId));
        auditoriaService.reauditarInscricoesEmAberto(atletaId);
    }

    private VinculoHistoricoDTO buscarVinculo(Long atletaId, Long historicoId) {
        return vinculosDoAtleta(atletaId).stream()
                .filter(v -> v.historicoId().equals(historicoId))
                .findFirst()
                .orElseThrow(() -> new RecursoNaoEncontradoException("Esta competição não está vinculada à sua conta."));
    }

    private static Set<Long> semRepetidos(List<Long> ids) {
        Set<Long> resultado = new LinkedHashSet<>();
        if (ids != null) ids.stream().filter(Objects::nonNull).forEach(resultado::add);
        return resultado;
    }
}
