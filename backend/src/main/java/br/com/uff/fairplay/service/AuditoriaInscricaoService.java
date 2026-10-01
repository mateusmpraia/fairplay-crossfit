package br.com.uff.fairplay.service;

import br.com.uff.fairplay.model.Atleta;
import br.com.uff.fairplay.model.CategoriaCompeticao;
import br.com.uff.fairplay.model.CategoriaEvento;
import br.com.uff.fairplay.model.Evento;
import br.com.uff.fairplay.model.InscricaoEvento;
import br.com.uff.fairplay.repository.InscricaoEventoRepository;
import br.com.uff.fairplay.service.RegrasElegibilidade.CriteriosEvento;
import br.com.uff.fairplay.service.RegrasElegibilidade.ResultadoAuditoria;
import br.com.uff.fairplay.service.historico.HistoricoCompeticaoFactory;
import br.com.uff.fairplay.service.historico.HistoricoDoAtleta;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Auditoria de elegibilidade das inscrições. O resultado fica gravado na inscrição, então precisa ser
 * refeito sempre que o histórico do atleta muda depois da inscrição: vínculos com o histórico importado
 * (feitos ou desfeitos), troca de nome (a auditoria também busca pelo nome idêntico) e resultados lançados
 * ou apagados em eventos do FairPlay.
 *
 * <p>A auditoria também depende das categorias do evento (só se obriga a subir se houver categoria acima),
 * por isso é refeita quando o organizador adiciona ou exclui uma categoria.
 *
 * <p>Só as inscrições em aberto são refeitas (sem colocação, em eventos que não terminaram): um evento que
 * já aconteceu fica com a auditoria da época. Quando o status muda sozinho, a inscrição guarda o status
 * anterior e aparece em destaque para o organizador até ele marcar "ciente".
 */
@Service
public class AuditoriaInscricaoService {

    private final InscricaoEventoRepository inscricaoEventoRepository;
    private final HistoricoCompeticaoFactory historicoFactory;

    public AuditoriaInscricaoService(InscricaoEventoRepository inscricaoEventoRepository,
                                     HistoricoCompeticaoFactory historicoFactory) {
        this.inscricaoEventoRepository = inscricaoEventoRepository;
        this.historicoFactory = historicoFactory;
    }

    /** Resultado da auditoria e quantas competições do histórico ela considerou. */
    private record Auditoria(ResultadoAuditoria resultado, int competicoesConsideradas) {}

    /** Audita a inscrição do atleta na categoria com o histórico atual dele (sem o próprio evento). */
    private Auditoria auditar(Atleta atleta, CategoriaEvento categoria) {
        Evento evento = categoria.getEvento();
        CriteriosEvento criterios = new CriteriosEvento(evento.isRegraCampeaoSobe(), evento.isRegraTresPodiosSobe(),
                evento.isRegraTresParticipacoesSobe(), evento.isRegraNaoDesce());
        HistoricoDoAtleta historico = historicoFactory.paraAuditoria(atleta, evento);
        ResultadoAuditoria resultado = RegrasElegibilidade.auditar(categoria.getNivel(), criterios,
                historico.participacoes(), niveisDisponiveis(atleta, categoria));
        return new Auditoria(resultado, historico.registros().size());
    }

    /**
     * Níveis das categorias do evento para onde o atleta poderia ir: mesmo formato da categoria inscrita
     * (Individual, Dupla...) e gênero compatível com o dele (a do gênero dele ou uma mista).
     */
    private static Set<CategoriaCompeticao> niveisDisponiveis(Atleta atleta, CategoriaEvento categoria) {
        Set<CategoriaCompeticao> niveis = EnumSet.noneOf(CategoriaCompeticao.class);
        for (CategoriaEvento outra : categoria.getEvento().getCategorias()) {
            if (Objects.equals(outra.getFormato(), categoria.getFormato())
                    && RegrasElegibilidade.generoCompativel(atleta.getGenero(), outra.getGenero())) {
                niveis.add(outra.getNivel());
            }
        }
        return niveis;
    }

    /**
     * Refaz a auditoria a pedido do organizador (inscrição nova ou mudança de critérios). Não gera destaque,
     * pois ele está vendo a mudança; um destaque anterior some se o status voltar ao que era.
     */
    public void aplicar(InscricaoEvento inscricao) {
        gravar(inscricao, auditar(inscricao.getAtleta(), inscricao.getCategoriaEvento()));
        if (Objects.equals(inscricao.getStatusAnterior(), inscricao.getStatusElegibilidade())) {
            limparDestaque(inscricao);
        }
    }

    /** Refaz a auditoria das inscrições em aberto dos atletas cujo histórico mudou. */
    @Transactional
    public void reauditarInscricoesEmAberto(Collection<Long> atletaIds) {
        atletaIds.stream().filter(Objects::nonNull).distinct().forEach(this::reauditarInscricoesEmAberto);
    }

    /** Refaz a auditoria das inscrições em aberto do atleta; devolve quantas mudaram de status. */
    @Transactional
    public int reauditarInscricoesEmAberto(Long atletaId) {
        // Grava pendências (vínculos, nome, colocações) antes de montar o histórico
        inscricaoEventoRepository.flush();
        List<InscricaoEvento> inscricoes = inscricaoEventoRepository.buscarEmAbertoDoAtleta(atletaId, LocalDate.now());

        int mudaram = 0;
        for (InscricaoEvento inscricao : inscricoes) {
            String statusAntes = inscricao.getStatusElegibilidade();
            gravar(inscricao, auditar(inscricao.getAtleta(), inscricao.getCategoriaEvento()));
            String statusDepois = inscricao.getStatusElegibilidade();

            if (!statusDepois.equals(statusAntes)) {
                mudaram++;
                if (inscricao.getAuditoriaAlteradaEm() == null) {
                    inscricao.setStatusAnterior(statusAntes);
                    inscricao.setAuditoriaAlteradaEm(LocalDateTime.now());
                } else if (statusDepois.equals(inscricao.getStatusAnterior())) {
                    // Voltou ao status que o organizador conhecia: não há mais o que destacar
                    limparDestaque(inscricao);
                }
            }
        }
        inscricaoEventoRepository.saveAll(inscricoes);
        return mudaram;
    }

    /** O organizador viu a mudança: a inscrição deixa de aparecer em destaque. */
    public void limparDestaque(InscricaoEvento inscricao) {
        inscricao.setStatusAnterior(null);
        inscricao.setAuditoriaAlteradaEm(null);
    }

    private static void gravar(InscricaoEvento inscricao, Auditoria auditoria) {
        inscricao.setStatusElegibilidade(auditoria.resultado().status());
        inscricao.setCategoriaRecomendada(auditoria.resultado().categoriaRecomendada());
        inscricao.setMotivoIrregularidade(auditoria.resultado().motivo());
        inscricao.setHistoricoConsiderado(auditoria.competicoesConsideradas());
    }
}
