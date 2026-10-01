// Máscaras de digitação e conversões de formato usadas nos formulários.

const apenasDigitos = (valor) => valor.replace(/\D/g, '');

/** Mesmo mínimo exigido pelo backend (ValidacaoCadastro.TAMANHO_MINIMO_SENHA). */
export const TAMANHO_MINIMO_SENHA = 6;

/** CPF com 11 dígitos, que não seja sequência repetida e com os dígitos verificadores corretos. */
export function cpfValido(cpf) {
  const d = apenasDigitos(cpf || '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const verificador = (quantidade) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) soma += Number(d[i]) * (quantidade + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return verificador(9) === Number(d[9]) && verificador(10) === Number(d[10]);
}

/** 12345678901 → 123.456.789-01 (formata enquanto o usuário digita). */
export function mascaraCpf(valor) {
  return apenasDigitos(valor)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
}

/** 21999999999 → (21) 99999-9999 (formata enquanto o usuário digita). */
export function mascaraCelular(valor) {
  return apenasDigitos(valor)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

/** 01012000 → 01/01/2000 (formata enquanto o usuário digita). */
export function mascaraData(valor) {
  const digitos = apenasDigitos(valor).slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** Exibe um CPF salvo no formato 000.000.000-00; devolve o valor original se não tiver 11 dígitos. */
export function formatarCpf(cpf) {
  if (!cpf) return '';
  const digitos = apenasDigitos(cpf);
  return digitos.length === 11 ? mascaraCpf(digitos) : cpf;
}

/** DD/MM/AAAA → AAAA-MM-DD. Retorna null se a data estiver incompleta ou for inválida. */
export function dataBrParaIso(dataBr) {
  if (!dataBr || dataBr.length !== 10) return null;
  const [dia, mes, ano] = dataBr.split('/').map((parte) => parseInt(parte, 10));

  if ([dia, mes, ano].some(Number.isNaN)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || ano < 1900 || ano > 2100) return null;

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** AAAA-MM-DD → DD/MM/AAAA. */
export function dataIsoParaBr(dataIso) {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
