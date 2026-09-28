// Cores e imagens compartilhadas entre as páginas.

export const CORES = {
  atleta: '#00ff88',
  organizador: '#00bfff',
  sucesso: '#00ff88',
  aviso: '#ffd700',
  erro: '#ff4444',
};

/** Cor de destaque de cada perfil (verde para atleta, azul para organizador). */
export const corDoPerfil = (perfil) => (perfil === 'ORGANIZADOR' ? CORES.organizador : CORES.atleta);

/** Imagem do banner lateral das telas de login e cadastro. */
export const imagemDoPerfil = (perfil) =>
  perfil === 'ORGANIZADOR'
    ? 'https://images.pexels.com/photos/32546042/pexels-photo-32546042.jpeg?auto=compress&cs=tinysrgb&w=1000'
    : 'https://images.pexels.com/photos/36389486/pexels-photo-36389486.jpeg?auto=compress&cs=tinysrgb&w=1000';

const FUNDOS_FEEDBACK = {
  sucesso: 'rgba(0, 255, 136, 0.1)',
  aviso: 'rgba(255, 215, 0, 0.1)',
  erro: 'rgba(255, 68, 68, 0.1)',
};

/** Cores de uma caixa de mensagem ('sucesso', 'aviso' ou 'erro'). */
export function estiloFeedback(tipo) {
  const chave = FUNDOS_FEEDBACK[tipo] ? tipo : 'erro';
  return {
    backgroundColor: FUNDOS_FEEDBACK[chave],
    borderColor: CORES[chave],
    color: CORES[chave],
  };
}
