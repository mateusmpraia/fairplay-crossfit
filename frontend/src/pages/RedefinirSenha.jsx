import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { mensagemDeErro } from '../api';
import Alerta from '../components/Alerta';
import { TAMANHO_MINIMO_SENHA } from '../utils/formatacao';

/** Página aberta pelo link de recuperação de senha (/redefinir-senha?token=...). */
export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState(token ? '' : 'Link incompleto. Abra novamente o link recebido por e-mail.');
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
      setErro(`A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      const { data } = await api.post('/conta/redefinir-senha', { token, novaSenha });
      navigate('/login', { state: { mensagem: data } });
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível redefinir a senha.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="tela-acesso">
      <div className="modal" style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00ff88', marginBottom: '6px' }}>Criar nova senha</h1>
        <p style={{ color: '#a0aec0', fontSize: '0.86rem', marginBottom: '18px' }}>
          Escolha uma senha com pelo menos {TAMANHO_MINIMO_SENHA} caracteres.
        </p>

        <Alerta tipo="erro">{erro}</Alerta>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label className="campo">
            <span className="campo-rotulo">Nova senha</span>
            <input type="password" className="campo-entrada" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Confirmar nova senha</span>
            <input type="password" className="campo-entrada" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required />
          </label>
          <button type="submit" className="botao botao-verde" disabled={salvando || !token} style={{ padding: '12px' }}>
            {salvando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <Link to="/login" style={{ color: '#8b949e', fontSize: '0.84rem', textAlign: 'center' }}>Voltar ao login</Link>
        </form>
      </div>
    </div>
  );
}
