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

// Formatação Visual (Texto)
export const formatarMoeda = (v) => {
  if (v === 0 || v === "0") return "R$ 0,00";
  if (!v) return "R$ 0,00";
  if (typeof v === "string" && v.includes("R$")) return v;

  const n = parseFloat(v);
  if (isNaN(n)) return "R$ 0,00";

  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Máscara de Input (Digitação)
export const maskCurrency = (value) => {
  let v = value.replace(/\D/g, "");
  v = (Number(v) / 100).toFixed(2) + "";
  v = v.replace(".", ",");
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return "R$ " + v;
};

// NOVO: Converte "R$ 1.200,50" para o número 1200.50 (Essencial para estatísticas)
export const converterValor = (valorString) => {
  if (!valorString) return 0;
  if (typeof valorString === "number") return valorString;

  // Remove R$, espaços e pontos de milhar, troca vírgula por ponto
  const limpo = valorString
    .toString()
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const numero = parseFloat(limpo);

  return isNaN(numero) ? 0 : numero;
};

export const parseDataSegura = (valor) => {
  if (!valor) return 0;
  if (typeof valor === "number") return valor;
  try {
    // Tenta converter string de data pt-BR para timestamp
    // Formato esperado: "DD/MM/AAAA HH:mm:ss" ou similar
    if (valor.includes("/")) {
      const [dataPart, horaPart] = valor.split(" ");
      const [dia, mes, ano] = dataPart.split("/");

      let h = 0,
        m = 0,
        s = 0;
      if (horaPart) {
        const times = horaPart.split(":");
        h = times[0] || 0;
        m = times[1] || 0;
        s = times[2] || 0;
      }
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
