import Modal from './Modal';

/** Pergunta de confirmação para ações destrutivas (excluir evento, categoria, inscrição, usuário...). */
export default function ModalConfirmacao({ titulo, children, textoConfirmar, textoProcessando, processando = false, onConfirmar, onCancelar }) {
  return (
    <Modal titulo={titulo} corTitulo="#ff4444" onFechar={onCancelar} bloqueado={processando}>
      <p style={{ color: '#cbd5e0', fontSize: '0.9rem', lineHeight: '1.5' }}>{children}</p>
      <div className="modal-acoes">
        <button type="button" className="botao botao-secundario" onClick={onCancelar} disabled={processando}>
          Cancelar
        </button>
        <button type="button" className="botao botao-perigo" onClick={onConfirmar} disabled={processando}>
          {processando ? textoProcessando : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
