export const formatarMoedaInput = (v) => {
  if (!v) return "";
  const n = String(v).replace(/\D/g, "");
  return (Number(n) / 100).toFixed(2).replace(".", ",");
};

export const calcularDuracao = (inicio, fim) => {
  if (!inicio || !fim) return "-";
  const diff = fim - inicio;
  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor(diff / 3600000);
  const min = Math.floor(diff / 60000);
  if (dias > 0) return `${dias}d`;
  if (horas > 0) return `${horas}h`;
  return `${min}m`;
};

export const formatarDataLista = (dataString) => {
  if (!dataString) return "";
  try {
    const partes = dataString.split(" ");
    return `${partes[0].substring(0, 5)} às ${partes[1].substring(0, 5)}`;
  } catch (e) {
    return dataString;
  }
};

export const verificarAtraso = (timestampCriacao) => {
  const agora = Date.now();
  const diferenca = agora - timestampCriacao;
  return diferenca > 24 * 60 * 60 * 1000;
};
