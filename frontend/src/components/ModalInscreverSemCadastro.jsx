import { useState } from 'react';
import api, { mensagemDeErro } from '../api';
import { mascaraCpf } from '../utils/formatacao';
import Modal from './Modal';
import Alerta from './Alerta';

/**
 * Inscrição de um atleta que não tem cadastro nem histórico no FairPlay. O organizador informa o nome e,
 * se souber, o CPF: com ele, a pessoa assume a inscrição quando criar a conta. Em categorias mistas,
 * o gênero é obrigatório (nas demais, vem da categoria).
 *
 * @param termoInicial o que o organizador digitou na busca (vira o nome ou o CPF)
 * @param onInscrito   recebe a inscrição criada
 */
export default function ModalInscreverSemCadastro({ categoria, termoInicial, onInscrito, onFechar }) {
  const termo = (termoInicial || '').trim();
  const pareceCpf = /^[\d.\-\s]+$/.test(termo);

  const [nome, setNome] = useState(pareceCpf ? '' : termo);
  const [cpf, setCpf] = useState(pareceCpf ? mascaraCpf(termo) : '');
  const [genero, setGenero] = useState('');
  const [nomeBox, setNomeBox] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const categoriaMista = (categoria.genero || '').toUpperCase().includes('MIST');

  const inscrever = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const { data } = await api.post('/eventos/inscricoes/sem-cadastro', {
        categoriaEventoId: categoria.id,
        nomeCompleto: nome,
        cpf: cpf || null,
        genero: genero || null,
        nomeBox: nomeBox || null,
      });
      onInscrito(data);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível inscrever o atleta.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal titulo="Inscrever atleta sem cadastro" corTitulo="#00bfff" largura={460} onFechar={onFechar} bloqueado={salvando}>
      <p style={styles.texto}>
        Use para quem ainda <strong>não tem cadastro nem histórico</strong> no FairPlay. Sem histórico, a auditoria
        não tem o que comparar e a inscrição fica regular. Se você informar o CPF, a pessoa assume esta inscrição
        quando criar a conta.
      </p>

      <Alerta tipo="erro">{erro}</Alerta>

      <form onSubmit={inscrever} style={styles.form}>
        <label className="campo">
          <span className="campo-rotulo">Nome completo</span>
          <input className="campo-entrada" name="semCadastroNome" value={nome} onChange={(e) => setNome(e.target.value)}
                 autoComplete="off" required autoFocus={!nome} />
        </label>

        <label className="campo">
          <span className="campo-rotulo">CPF (opcional)</span>
          <input className="campo-entrada" name="semCadastroCpf" placeholder="000.000.000-00" maxLength={14}
                 value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} autoComplete="off" />
        </label>

        {categoriaMista && (
          <label className="campo">
            <span className="campo-rotulo">Gênero (a categoria é mista)</span>
            <select className="campo-entrada" name="semCadastroGenero" value={genero} onChange={(e) => setGenero(e.target.value)} required>
              <option value="" disabled>Selecione...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro / Prefiro não dizer</option>
            </select>
          </label>
        )}

        <label className="campo">
          <span className="campo-rotulo">Box / CT (opcional)</span>
          <input className="campo-entrada" name="semCadastroBox" maxLength={100} value={nomeBox}
                 onChange={(e) => setNomeBox(e.target.value)} autoComplete="off" />
        </label>

        <div className="modal-acoes">
          <button type="button" className="botao botao-secundario" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button type="submit" className="botao botao-azul" disabled={salvando}>
            {salvando ? 'Inscrevendo...' : 'Inscrever'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const styles = {
  texto: {
    color: '#a0aec0',
    fontSize: '0.84rem',
    lineHeight: '1.5',
    marginTop: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};
