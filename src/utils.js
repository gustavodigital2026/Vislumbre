export const mapearStatus = (s) => {
  switch (s) {
    case "leads":
      return "Leads / Criação";
    case "pendentes":
      return "Leads (Antigo)";
    case "producao":
      return "Produção";
    case "finalizados":
      return "Entregues";
    default:
      return s;
  }
};

export const formatarDuracaoHoras = (ms) => {
  if (!ms || ms <= 0) return "-";
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}m`;
};

export const formatarMoeda = (v) => {
  if (!v) return "R$ 0,00";
  const n = String(v).replace(/\D/g, "");
  return "R$ " + (Number(n) / 100).toFixed(2).replace(".", ",");
};

export const parseDataSegura = (valor) => {
  if (!valor) return 0;
  if (typeof valor === "number") return valor;
  try {
    const [data, hora] = valor.split(", ");
    if (data && hora) {
      const [dia, mes, ano] = data.split("/");
      const [h, m, s] = hora.split(":");
      return new Date(ano, mes - 1, dia, h, m, s).getTime();
    }
  } catch (e) {}
  return 0;
};

export const normalizar = (str) =>
  str
    ? str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    : "";
