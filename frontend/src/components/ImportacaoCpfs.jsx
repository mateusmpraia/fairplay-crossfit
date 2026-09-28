import { useRef, useState } from 'react';
import api, { mensagemDeErro } from '../api';
import { formatarCpf } from '../utils/formatacao';
import { lerCpfsDaPlanilha, EXTENSOES_ACEITAS } from '../utils/planilhaCpf';
import { baixarModeloImportacao } from '../utils/exportacao';
import Modal from './Modal';
import Alerta from './Alerta';

/** Quantos itens das listas de problemas são exibidos antes de resumir em "e mais N". */
const MAX_ITENS_LISTADOS = 8;

const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`;

/**
 * Modal de inscrição em lote: o organizador escolhe uma planilha com a coluna CPF, confere a prévia
 * do que foi lido e confirma. Os atletas encontrados são inscritos; os demais aparecem com o motivo.
 *
 * Etapas: 'escolher' → 'previa' → 'resultado'.
 */
export default function ImportacaoCpfs({ categoria, onInscritos, onFechar }) {
  const inputArquivo = useRef(null);
  const [etapa, setEtapa] = useState('escolher');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [leitura, setLeitura] = useState(null);
  const [resultado, setResultado] = useState(null);

  const escolherArquivo = () => inputArquivo.current?.click();

  const handleArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;

    setErro('');
    setProcessando(true);
    try {
      setLeitura(await lerCpfsDaPlanilha(arquivo));
      setNomeArquivo(arquivo.name);
      setEtapa('previa');
    } catch (err) {
      setErro(err.message);
      setEtapa('escolher');
    } finally {
      setProcessando(false);
    }
  };

  const confirmarInscricao = async () => {
    setErro('');
    setProcessando(true);
    try {
      const { data } = await api.post(`/eventos/categorias/${categoria.id}/inscricoes/lote`, { cpfs: leitura.cpfs });
      setResultado(data);
      setEtapa('resultado');
      onInscritos(data.inscritos);
    } catch (err) {
      setErro(mensagemDeErro(err, 'Erro ao inscrever os atletas da planilha.'));
    } finally {
      setProcessando(false);
    }
  };

  const regulares = resultado?.inscritos.filter((i) => i.statusElegibilidade === 'REGULAR').length ?? 0;

  return (
    <Modal titulo="Importar atletas por planilha" largura={520} onFechar={onFechar} bloqueado={processando}>
        <p style={styles.subtitulo}>
          Categoria: <strong style={{ color: '#00bfff' }}>{categoria.formato} {categoria.genero} ({categoria.nivel})</strong>
        </p>

        <input ref={inputArquivo} type="file" accept={EXTENSOES_ACEITAS} onChange={handleArquivo} hidden />

        <Alerta tipo="erro">{erro}</Alerta>

        {etapa === 'escolher' && (
          <>
            <div style={styles.caixaInstrucoes}>
              <p style={{ margin: 0 }}>Envie um arquivo <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong> com uma coluna chamada <strong>CPF</strong>.</p>
              <ul style={styles.lista}>
                <li>O CPF pode estar com ou sem pontuação.</li>
                <li>As outras colunas são ignoradas; é lida a primeira aba do arquivo.</li>
                <li>Só atletas já cadastrados no FairPlay podem ser inscritos.</li>
              </ul>
            </div>
            <div style={styles.acoes}>
              <button type="button" onClick={baixarModeloImportacao} style={{ ...styles.btnSecundario, marginRight: 'auto' }}>
                ⬇ Baixar modelo
              </button>
              <button type="button" onClick={onFechar} style={styles.btnSecundario}>Cancelar</button>
              <button type="button" onClick={escolherArquivo} disabled={processando} style={styles.btnPrimario}>
                {processando ? 'Lendo arquivo...' : 'Escolher arquivo'}
              </button>
            </div>
          </>
        )}

        {etapa === 'previa' && leitura && (
          <>
            <div style={styles.caixaInstrucoes}>
              <p style={{ margin: '0 0 8px 0' }}>📄 <strong>{nomeArquivo}</strong></p>
              <p style={styles.destaque}>{plural(leitura.cpfs.length, 'CPF pronto', 'CPFs prontos')} para inscrição</p>
              {leitura.duplicados > 0 && (
                <p style={styles.observacao}>{plural(leitura.duplicados, 'CPF repetido foi ignorado', 'CPFs repetidos foram ignorados')}.</p>
              )}
              {leitura.invalidos.length > 0 && (
                <>
                  <p style={{ ...styles.observacao, color: '#ffa500' }}>
                    {plural(leitura.invalidos.length, 'linha será ignorada', 'linhas serão ignoradas')} por não conter um CPF válido:
                  </p>
                  <ul style={styles.lista}>
                    {leitura.invalidos.slice(0, MAX_ITENS_LISTADOS).map((inv) => (
                      <li key={inv.linha}>Linha {inv.linha}: “{inv.valor}”</li>
                    ))}
                    {leitura.invalidos.length > MAX_ITENS_LISTADOS && (
                      <li>e mais {leitura.invalidos.length - MAX_ITENS_LISTADOS}...</li>
                    )}
                  </ul>
                </>
              )}
            </div>
            <div style={styles.acoes}>
              <button type="button" onClick={escolherArquivo} disabled={processando} style={styles.btnSecundario}>
                Escolher outro arquivo
              </button>
              <button
                type="button"
                onClick={confirmarInscricao}
                disabled={processando || leitura.cpfs.length === 0}
                style={{ ...styles.btnPrimario, opacity: processando || leitura.cpfs.length === 0 ? 0.6 : 1 }}
              >
                {processando ? 'Inscrevendo...' : `Inscrever ${plural(leitura.cpfs.length, 'atleta', 'atletas')}`}
              </button>
            </div>
          </>
        )}

        {etapa === 'resultado' && resultado && (
          <>
            <div style={styles.caixaInstrucoes}>
              <p style={{ ...styles.destaque, color: '#00ff88' }}>
                ✓ {plural(resultado.inscritos.length, 'atleta inscrito', 'atletas inscritos')}
              </p>
              {resultado.inscritos.length > 0 && (
                <p style={styles.observacao}>
                  {plural(regulares, 'regular', 'regulares')} e {plural(resultado.inscritos.length - regulares, 'irregular', 'irregulares')} na auditoria.
                </p>
              )}
              {resultado.falhas.length > 0 && (
                <>
                  <p style={{ ...styles.observacao, color: '#ff4444', marginTop: '10px' }}>
                    {plural(resultado.falhas.length, 'CPF não foi inscrito', 'CPFs não foram inscritos')}:
                  </p>
                  <ul style={styles.listaFalhas}>
                    {resultado.falhas.map((f) => (
                      <li key={f.cpf}><strong>{formatarCpf(f.cpf)}</strong> — {f.motivo}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div style={styles.acoes}>
              <button type="button" onClick={onFechar} style={styles.btnPrimario}>Concluir</button>
            </div>
          </>
        )}
    </Modal>
  );
}

const styles = {
  subtitulo: { color: '#a0aec0', fontSize: '0.84rem', margin: '-6px 0 16px 0' },
  caixaInstrucoes: { backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '14px 16px', color: '#cbd5e0', fontSize: '0.86rem', lineHeight: '1.5' },
  lista: { margin: '8px 0 0 0', paddingLeft: '20px', color: '#a0aec0', fontSize: '0.82rem' },
  listaFalhas: { margin: '6px 0 0 0', paddingLeft: '20px', color: '#cbd5e0', fontSize: '0.8rem', maxHeight: '180px', overflowY: 'auto' },
  destaque: { margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#ffffff' },
  observacao: { margin: '4px 0 0 0', fontSize: '0.82rem', color: '#a0aec0' },
  acoes: { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '10px', marginTop: '18px' },
  btnSecundario: { backgroundColor: 'transparent', border: '1px solid #30363d', color: '#cbd5e0', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' },
  btnPrimario: { backgroundColor: '#00bfff', color: '#000000', border: 'none', padding: '9px 18px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' },
};
