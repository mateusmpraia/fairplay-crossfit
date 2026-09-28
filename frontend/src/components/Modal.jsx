/**
 * Janela modal padrão do sistema: fundo escurecido, cabeçalho com título e botão de fechar.
 *
 * @param titulo     texto do cabeçalho
 * @param corTitulo  cor do título (padrão: azul do organizador)
 * @param largura    largura máxima da janela (padrão 420px)
 * @param onFechar   chamado ao clicar no ✕; se omitido, o botão não aparece
 * @param bloqueado  desabilita o ✕ (ex.: enquanto uma operação está em andamento)
 */
export default function Modal({ titulo, corTitulo = '#00bfff', largura = 420, onFechar, bloqueado = false, children }) {
  return (
    <div className="modal-fundo">
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: largura }}>
        <div className="modal-cabecalho">
          <h3 className="modal-titulo" style={{ color: corTitulo }}>{titulo}</h3>
          {onFechar && (
            <button type="button" className="modal-fechar" onClick={onFechar} disabled={bloqueado} aria-label="Fechar">✕</button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
