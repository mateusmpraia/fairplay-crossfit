import { estiloFeedback } from '../tema';

/** Caixa de mensagem ('sucesso', 'aviso' ou 'erro'). Não renderiza nada se não houver texto. */
export default function Alerta({ tipo = 'erro', children, style }) {
  if (!children) return null;
  return (
    <div className="alerta" role={tipo === 'erro' ? 'alert' : 'status'} style={{ ...estiloFeedback(tipo), ...style }}>
      {children}
    </div>
  );
}
