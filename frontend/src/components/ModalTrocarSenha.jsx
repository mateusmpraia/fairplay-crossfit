import { useState } from 'react';
import api, { mensagemDeErro } from '../api';
import Modal from './Modal';
import Alerta from './Alerta';
import { TAMANHO_MINIMO_SENHA } from '../utils/formatacao';

/** Troca de senha do usuário logado. O backend devolve um novo token, que substitui o atual. */
export default function ModalTrocarSenha({ onFechar }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
      setMensagem({ tipo: 'erro', texto: `A nova senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.` });
      return;
    }
    if (novaSenha !== confirmacao) {
      setMensagem({ tipo: 'erro', texto: 'A confirmação não confere com a nova senha.' });
      return;
    }

    setSalvando(true);
    setMensagem({ tipo: '', texto: '' });
    try {
      const { data } = await api.put('/conta/senha', { senhaAtual, novaSenha });
      localStorage.setItem('token', data.token);
      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada com sucesso!' });
      setTimeout(onFechar, 1000);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: mensagemDeErro(err, 'Não foi possível alterar a senha.') });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo="Trocar senha" corTitulo="#00ff88" onFechar={onFechar} bloqueado={salvando}>
      <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <label className="campo">
          <span className="campo-rotulo">Senha atual</span>
          <input type="password" className="campo-entrada" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Nova senha</span>
          <input type="password" className="campo-entrada" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
        </label>
        <label className="campo">
          <span className="campo-rotulo">Confirmar nova senha</span>
          <input type="password" className="campo-entrada" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
        </label>
        <div className="modal-acoes">
          <button type="button" className="botao botao-secundario" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button type="submit" className="botao botao-verde" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
