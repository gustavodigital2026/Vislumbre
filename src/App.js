import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  getDocs,
  where,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "./firebase";
import Sidebar from "./Sidebar";
import Details from "./Details";
import "./styles.css";

// --- UTILITÁRIOS ---
const mapearStatus = (s) => {
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

const formatarDuracaoHoras = (ms) => {
  if (!ms || ms <= 0) return "-";
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}m`;
};

const formatarMoeda = (v) => {
  if (!v) return "R$ 0,00";
  const n = String(v).replace(/\D/g, "");
  return "R$ " + (Number(n) / 100).toFixed(2).replace(".", ",");
};

const parseDataSegura = (valor) => {
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

const normalizar = (str) =>
  str
    ? str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    : "";

// --- LOGIN (SEM SENHA FIXA NO CÓDIGO) ---
const LoginScreen = ({ onLogin }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // REMOVIDO: O if do admin fixo (1234) saiu daqui. Agora ele busca no banco.

    try {
      // Busca usuário no banco que tenha esse login E essa senha
      const q = query(
        collection(db, "usuarios"),
        where("login", "==", user),
        where("senha", "==", pass)
      );
      const qs = await getDocs(q);

      if (!qs.empty) {
        // Achou o usuário!
        const dadosUsuario = { ...qs.docs[0].data(), id: qs.docs[0].id };

        // Salva no navegador e avisa o App que logou
        localStorage.setItem("vislumbre_user", JSON.stringify(dadosUsuario));
        onLogin(dadosUsuario);
      } else {
        setError("Usuário ou senha incorretos.");
      }
    } catch (e) {
      console.error(e);
      setError("Erro de conexão com o banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "24px",
          width: "340px",
          textAlign: "center",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "15px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 10px -2px rgba(0, 0, 0, 0.05)",
            display: "inline-block",
            marginBottom: "15px",
          }}
        >
          <img
            src="/logo.jpeg"
            alt="Vislumbre Logo"
            style={{
              maxWidth: "210px",
              maxHeight: "210px",
              borderRadius: "8px",
              display: "block",
            }}
          />
        </div>
        <h2
          style={{
            color: "#1e293b",
            margin: "0 0 25px 0",
            fontSize: "22px",
            fontWeight: "700",
          }}
        >
          Vislumbre CRM
        </h2>
        <div className="input-group">
          <input
            className="modern-input"
            placeholder="Usuário"
            value={user}
            onKeyDown={handleKeyDown}
            onChange={(e) => setUser(e.target.value)}
            style={{ padding: "14px" }}
          />
        </div>
        <div className="input-group" style={{ marginBottom: "25px" }}>
          <input
            className="modern-input"
            type="password"
            placeholder="Senha"
            value={pass}
            onKeyDown={handleKeyDown}
            onChange={(e) => setPass(e.target.value)}
            style={{ padding: "14px" }}
          />
        </div>
        {error && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "13px",
              marginBottom: "15px",
              background: "#fef2f2",
              padding: "8px",
              borderRadius: "6px",
            }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="btn-primary"
          style={{ padding: "14px", fontSize: "16px" }}
        >
          {loading ? "Verificando..." : "Entrar no Sistema"}
        </button>
      </div>
    </div>
  );
};

// --- GRÁFICO (COM LINHAS DE REFERÊNCIA) ---
const LineChart = ({ dados }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!dados || dados.length === 0)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        Sem dados suficientes.
      </div>
    );

  const width = 800;
  const height = 250;
  const paddingLeft = 70; // Espaço extra para os valores em R$
  const paddingBottom = 40;
  const paddingRight = 40;
  const paddingTop = 40;

  const maxDataVal = Math.max(...dados.map((d) => d.valor), 0);
  const maxVal = Math.max(maxDataVal, 1) * 1.2; // Escala um pouco maior que o dado

  // Cálculos de posição Y para as linhas de referência
  const yMax =
    height -
    paddingBottom -
    (maxDataVal / maxVal) * (height - paddingBottom - paddingTop);
  const yHalf =
    height -
    paddingBottom -
    (maxDataVal / 2 / maxVal) * (height - paddingBottom - paddingTop);

  const points = dados.map((d, i) => {
    const xStep =
      dados.length > 1
        ? (width - paddingLeft - paddingRight) / (dados.length - 1)
        : 0;
    const x = dados.length > 1 ? paddingLeft + i * xStep : width / 2;
    const y =
      height -
      paddingBottom -
      (d.valor / maxVal) * (height - paddingBottom - paddingTop);
    return { x, y, ...d };
  });

  const pathD =
    points.length > 1
      ? points
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(" ")
      : "";

  return (
    <div style={{ width: "100%", overflowX: "auto", marginTop: "10px" }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: "visible" }}
      >
        {/* Eixo X base */}
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#e2e8f0"
          strokeWidth="2"
        />

        {/* LINHAS DE REFERÊNCIA (Grid) */}
        {maxDataVal > 0 && (
          <>
            {/* Linha do Máximo */}
            <line
              x1={paddingLeft}
              y1={yMax}
              x2={width - paddingRight}
              y2={yMax}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <text
              x={paddingLeft - 10}
              y={yMax + 4}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
              fontWeight="bold"
            >
              {formatarMoeda(maxDataVal)}
            </text>

            {/* Linha da Metade */}
            <line
              x1={paddingLeft}
              y1={yHalf}
              x2={width - paddingRight}
              y2={yHalf}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <text
              x={paddingLeft - 10}
              y={yHalf + 4}
              textAnchor="end"
              fontSize="11"
              fill="#94a3b8"
            >
              {formatarMoeda(maxDataVal / 2)}
            </text>
          </>
        )}

        {/* Base (0,00) */}
        <text
          x={paddingLeft - 10}
          y={height - paddingBottom + 4}
          textAnchor="end"
          fontSize="11"
          fill="#94a3b8"
        >
          R$ 0,00
        </text>

        {/* Linha do Gráfico */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Pontos Interativos */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="15"
              fill="transparent"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: "pointer" }}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill={hoveredPoint === p ? "#2563eb" : "#3b82f6"}
              stroke="white"
              strokeWidth="3"
              style={{ pointerEvents: "none" }}
            />

            {/* Data no eixo X (apenas primeiro e último se tiver muitos, ou todos se tiver espaço) */}
            <text
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
              style={{
                display:
                  i === 0 || i === points.length - 1 || points.length < 10
                    ? "block"
                    : "none",
              }}
            >
              {p.label}
            </text>
          </g>
        ))}

        {/* TOOLTIP FLUTUANTE */}
        {hoveredPoint && (
          <g
            transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y - 65})`}
            style={{ pointerEvents: "none" }}
          >
            <rect
              x="-60"
              y="0"
              width="120"
              height="55"
              rx="8"
              fill="#1e293b"
              filter="drop-shadow(0px 4px 4px rgba(0,0,0,0.2))"
            />
            <text
              x="0"
              y="20"
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="bold"
            >
              {hoveredPoint.label}
            </text>
            <text
              x="0"
              y="40"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="15"
              fontWeight="800"
            >
              {formatarMoeda(hoveredPoint.valor)}
            </text>
            <path d="M -6 55 L 6 55 L 0 61 Z" fill="#1e293b" />
          </g>
        )}
      </svg>
    </div>
  );
};

// --- ESTATÍSTICAS ---
const StatsPanel = ({ pedidos, servicos, voltar }) => {
  // DATA PADRÃO: 10 DIAS ATRÁS
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return d.toISOString().split("T")[0];
  });

  const [dataFim, setDataFim] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState("dia");

  const calcularMetricas = () => {
    const stats = {};
    const financeiro = {};
    const vendasRaw = {};
    let faturamentoTotal = 0;
    let totalDevolucoes = 0;

    servicos.forEach((s) => (financeiro[s.nome] = 0));
    financeiro["Outros"] = 0;

    if (viewMode === "dia") {
      let curr = new Date(dataInicio + "T00:00:00");
      const end = new Date(dataFim + "T23:59:59");
      if (curr < end && end - curr < 31536000000) {
        while (curr <= end) {
          vendasRaw[curr.getTime()] = 0;
          curr.setDate(curr.getDate() + 1);
        }
      }
    }
    const inicioTs = new Date(dataInicio + "T00:00:00").getTime();
    const fimTs = new Date(dataFim + "T23:59:59.999").getTime();

    pedidos.forEach((pedido) => {
      const historico = pedido.historicoAcoes || [];
      const histOrdenado = [...historico].sort(
        (a, b) =>
          parseDataSegura(a.timestamp || a.data) -
          parseDataSegura(b.timestamp || b.data)
      );
      let tsCriacao = pedido.tsEntrada;

      histOrdenado.forEach((acao) => {
        let acaoTs = parseDataSegura(acao.timestamp || acao.data);
        if (acaoTs < inicioTs || acaoTs > fimTs) return;
        const usuario = acao.user || "Sistema";

        if (!stats[usuario])
          stats[usuario] = {
            leads: 0,
            vendas: 0,
            tempoVendaTotal: 0,
            entregas: 0,
            tempoProducaoTotal: 0,
          };
        const desc = normalizar(acao.desc);

        // 1. LEADS
        if (desc.includes("criou") || desc.includes("lead")) {
          stats[usuario].leads++;
          if (!tsCriacao) tsCriacao = acaoTs;
        }

        // 2. VENDA (Entrada em Produção)
        if (desc.includes("producao") || desc.includes("produção")) {
          stats[usuario].vendas++;
          if (tsCriacao > 0 && acaoTs > tsCriacao)
            stats[usuario].tempoVendaTotal += acaoTs - tsCriacao;

          const valor = Number(pedido.valorRaw || 0);
          if (pedido.devolvido) {
            totalDevolucoes += valor;
          } else {
            const servico = pedido.servico || "Outros";
            if (financeiro[servico] !== undefined) financeiro[servico] += valor;
            else financeiro["Outros"] += valor;
            faturamentoTotal += valor;
            const diaNormalizado = new Date(acaoTs).setHours(0, 0, 0, 0);
            vendasRaw[diaNormalizado] =
              (vendasRaw[diaNormalizado] || 0) + valor;
          }
        }

        // 3. PRODUÇÃO (Entregas Finalizadas)
        if (desc.includes("finalizado") || desc.includes("entregue")) {
          stats[usuario].entregas++;
          const acaoProducao = histOrdenado.find((h) =>
            normalizar(h.desc).includes("producao")
          );
          const base = acaoProducao
            ? parseDataSegura(acaoProducao.timestamp || acaoProducao.data)
            : tsCriacao;
          if (base > 0 && acaoTs > base)
            stats[usuario].tempoProducaoTotal += acaoTs - base;
        }
      });
    });

    const aggregated = {};
    const getWeekNumber = (d) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };
    Object.keys(vendasRaw).forEach((ts) => {
      const date = new Date(Number(ts));
      const valor = vendasRaw[ts];
      let key = "",
        label = "",
        sortVal = Number(ts);
      if (viewMode === "dia") {
        key = ts;
        label = `${date.getDate().toString().padStart(2, "0")}/${(
          date.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}`;
      } else if (viewMode === "semana") {
        const week = getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
        label = `Sem ${week}`;
        sortVal = week;
      } else if (viewMode === "mes") {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        const meses = [
          "Jan",
          "Fev",
          "Mar",
          "Abr",
          "Mai",
          "Jun",
          "Jul",
          "Ago",
          "Set",
          "Out",
          "Nov",
          "Dez",
        ];
        label = `${meses[date.getMonth()]}/${date
          .getFullYear()
          .toString()
          .substr(2)}`;
        sortVal = date.getFullYear() * 100 + date.getMonth();
      } else if (viewMode === "ano") {
        key = `${date.getFullYear()}`;
        label = key;
        sortVal = date.getFullYear();
      }
      if (!aggregated[key])
        aggregated[key] = { label, valor: 0, sortKey: sortVal };
      aggregated[key].valor += valor;
    });

    return {
      operadores: Object.keys(stats).map((nome) => ({
        nome,
        ...stats[nome],
        mediaVenda: stats[nome].vendas
          ? stats[nome].tempoVendaTotal / stats[nome].vendas
          : 0,
        mediaProducao: stats[nome].entregas
          ? stats[nome].tempoProducaoTotal / stats[nome].entregas
          : 0,
      })),
      financeiro,
      faturamentoTotal,
      totalDevolucoes,
      dadosGrafico: Object.values(aggregated).sort(
        (a, b) => a.sortKey - b.sortKey
      ),
    };
  };

  const {
    operadores,
    financeiro,
    faturamentoTotal,
    totalDevolucoes,
    dadosGrafico,
  } = calcularMetricas();
  const gerarGraficoPizza = () => {
    if (faturamentoTotal === 0) return "conic-gradient(#e2e8f0 0% 100%)";
    let acumulado = 0;
    const segmentos = Object.keys(financeiro)
      .map((key) => {
        const valor = financeiro[key];
        if (valor === 0) return null;
        const servicoObj = servicos.find((s) => s.nome === key);
        const cor = servicoObj ? servicoObj.cor : "#94a3b8";
        const porcentagem = (valor / faturamentoTotal) * 100;
        const inicio = acumulado;
        acumulado += porcentagem;
        return `${cor} ${inicio}% ${acumulado}%`;
      })
      .filter(Boolean);
    return `conic-gradient(${segmentos.join(", ")})`;
  };

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header">
          <h2 className="admin-title">📊 Estatísticas & Performance</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="modern-input"
              style={{ width: "140px" }}
            />
            <span style={{ color: "#94a3b8" }}>até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="modern-input"
              style={{ width: "140px" }}
            />
            <button onClick={voltar} className="btn-back">
              Voltar
            </button>
          </div>
        </div>
        <div className="stats-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-title">Faturamento Líquido</div>
            <div className="kpi-value" style={{ color: "#22c55e" }}>
              {formatarMoeda(faturamentoTotal)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Vendas Fechadas</div>
            <div className="kpi-value" style={{ color: "#3b82f6" }}>
              {operadores.reduce((acc, op) => acc + op.vendas, 0)}
            </div>
          </div>
          <div
            className="kpi-card"
            style={{
              border:
                totalDevolucoes > 0 ? "1px solid #fca5a5" : "1px solid #e2e8f0",
            }}
          >
            <div
              className="kpi-title"
              style={{ color: totalDevolucoes > 0 ? "#ef4444" : "#64748b" }}
            >
              Devoluções
            </div>
            <div className="kpi-value" style={{ color: "#ef4444" }}>
              {formatarMoeda(totalDevolucoes)}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "24px",
            marginBottom: "30px",
          }}
        >
          <div className="card-panel">
            <div className="card-header">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>📈 Evolução</span>
                <div style={{ display: "flex", gap: "5px" }}>
                  {["dia", "semana", "mes"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      style={{
                        padding: "4px 8px",
                        border: viewMode === m ? "none" : "1px solid #e2e8f0",
                        background: viewMode === m ? "#3b82f6" : "white",
                        color: viewMode === m ? "white" : "#64748b",
                        borderRadius: "6px",
                        fontSize: "11px",
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <LineChart dados={dadosGrafico} />
          </div>
          <div
            className="card-panel"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <h3
              className="card-header"
              style={{
                width: "100%",
                textAlign: "center",
                borderBottom: "none",
              }}
            >
              Distribuição
            </h3>
            <div
              style={{
                width: "160px",
                height: "160px",
                borderRadius: "50%",
                background: gerarGraficoPizza(),
                marginBottom: "20px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            ></div>
            <div style={{ width: "100%" }}>
              {servicos.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    marginBottom: "8px",
                    color: "#475569",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: s.cor,
                        marginRight: "8px",
                      }}
                    ></span>
                    {s.nome}
                  </span>
                  <span style={{ fontWeight: "bold" }}>
                    {formatarMoeda(financeiro[s.nome])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card-panel">
          <div className="card-header">🏆 Performance da Equipe</div>
          <div style={{ overflowX: "auto" }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Operador</th>
                  <th style={{ textAlign: "center", width: "15%" }}>Leads</th>
                  <th
                    style={{
                      textAlign: "center",
                      width: "30%",
                      color: "#3b82f6",
                    }}
                  >
                    Vendas
                    <br />
                    <small style={{ fontSize: "10px", fontWeight: "normal" }}>
                      Tempo Negociação
                    </small>
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      width: "30%",
                      color: "#8b5cf6",
                    }}
                  >
                    Produção
                    <br />
                    <small style={{ fontSize: "10px", fontWeight: "normal" }}>
                      Tempo Entrega
                    </small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {operadores.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: "600", color: "#1e293b" }}>
                      {d.nome}
                    </td>
                    <td style={{ textAlign: "center" }}>{d.leads}</td>
                    <td style={{ textAlign: "center" }}>
                      <strong
                        style={{
                          color: "#22c55e",
                          display: "block",
                          fontSize: "16px",
                        }}
                      >
                        {d.vendas}
                      </strong>
                      <small style={{ color: "#64748b" }}>
                        {formatarDuracaoHoras(d.mediaVenda)}
                      </small>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <strong
                        style={{
                          color: "#8b5cf6",
                          display: "block",
                          fontSize: "16px",
                        }}
                      >
                        {d.entregas}
                      </strong>
                      <small style={{ color: "#64748b" }}>
                        {formatarDuracaoHoras(d.mediaProducao)}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- GESTÃO DE EQUIPE ---
const AdminTeamPanel = ({ voltar }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoLogin, setNovoLogin] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "usuarios")), (snap) => {
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);
  const adicionarUsuario = async () => {
    if (!novoNome || !novoLogin || !novaSenha) return alert("Preencha tudo!");
    await addDoc(collection(db, "usuarios"), {
      nome: novoNome,
      login: novoLogin,
      senha: novaSenha,
      role: "operador",
      acessoStats: false,
    });
    setNovoNome("");
    setNovoLogin("");
    setNovaSenha("");
  };
  const removerUsuario = async (id) => {
    if (window.confirm("Remover usuário?"))
      await deleteDoc(doc(db, "usuarios", id));
  };
  const alterarSenha = async (u) => {
    const nova = prompt(`Nova senha para ${u.nome}:`, u.senha);
    if (nova && nova !== u.senha)
      await updateDoc(doc(db, "usuarios", u.id), { senha: nova });
  };
  const toggleStats = async (id, statusAtual) => {
    await updateDoc(doc(db, "usuarios", id), { acessoStats: !statusAtual });
  };
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header">
          <h2 className="admin-title">👥 Gestão de Equipe</h2>
          <button onClick={voltar} className="btn-back">
            Voltar
          </button>
        </div>
        <div className="grid-cards" style={{ marginBottom: "40px" }}>
          {usuarios.map((u) => (
            <div key={u.id} className="item-card">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  className="user-avatar"
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "#3b82f6",
                    color: "white",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: "15px",
                  }}
                >
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div className="item-info">
                  <h4 className="item-title">{u.nome}</h4>
                  <p className="item-subtitle">Login: {u.login}</p>
                  <p
                    className="item-subtitle"
                    style={{
                      color: "#2563eb",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                    onClick={() => alterarSenha(u)}
                  >
                    🔑 {u.senha} ✎
                  </p>
                  <label
                    style={{
                      fontSize: "11px",
                      marginTop: "5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      cursor: "pointer",
                      color: u.acessoStats ? "#3b82f6" : "#94a3b8",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={u.acessoStats || false}
                      onChange={() => toggleStats(u.id, u.acessoStats)}
                    />{" "}
                    Acesso a Stats
                  </label>
                </div>
              </div>
              <button
                onClick={() => removerUsuario(u.id)}
                className="btn-icon-delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div
          className="card-panel"
          style={{ maxWidth: "500px", margin: "0 auto" }}
        >
          <div className="card-header">✨ Adicionar Novo Membro</div>
          <div className="input-group">
            <label className="input-label">Nome Completo</label>
            <input
              className="modern-input"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Login de Acesso</label>
            <input
              className="modern-input"
              value={novoLogin}
              onChange={(e) => setNovoLogin(e.target.value)}
              placeholder="Ex: joao"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Senha</label>
            <input
              className="modern-input"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="******"
            />
          </div>
          <button onClick={adicionarUsuario} className="btn-primary">
            Cadastrar Usuário
          </button>
        </div>
      </div>
    </div>
  );
};

// --- GESTÃO DE SERVIÇOS ---
const AdminServicesPanel = ({ servicos, voltar }) => {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const adicionar = async () => {
    if (!nome) return alert("Digite o nome");
    await addDoc(collection(db, "servicos"), { nome, cor });
    setNome("");
  };
  const remover = async (id) => {
    if (window.confirm("Remover serviço?"))
      await deleteDoc(doc(db, "servicos", id));
  };
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header">
          <h2 className="admin-title">🛠️ Catálogo de Serviços</h2>
          <button onClick={voltar} className="btn-back">
            Voltar
          </button>
        </div>
        <div className="grid-cards" style={{ marginBottom: "40px" }}>
          {servicos.map((s) => (
            <div
              key={s.id}
              className="item-card"
              style={{ borderLeft: `5px solid ${s.cor}` }}
            >
              <div className="item-info">
                <h4 className="item-title">{s.nome}</h4>
                <p
                  className="item-subtitle"
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: s.cor,
                    }}
                  ></span>
                  {s.cor}
                </p>
              </div>
              <button onClick={() => remover(s.id)} className="btn-icon-delete">
                ×
              </button>
            </div>
          ))}
        </div>
        <div
          className="card-panel"
          style={{ maxWidth: "500px", margin: "0 auto" }}
        >
          <div className="card-header">➕ Novo Serviço</div>
          <div className="input-group">
            <label className="input-label">Nome do Serviço</label>
            <input
              className="modern-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Gestão de Tráfego"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Cor de Identificação</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                style={{
                  height: "40px",
                  width: "60px",
                  border: "none",
                  background: "none",
                }}
              />
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Clique para escolher
              </span>
            </div>
          </div>
          <button onClick={adicionar} className="btn-primary">
            Salvar Serviço
          </button>
        </div>
      </div>
    </div>
  );
};

// --- DEFINIÇÕES GERAIS ---
const AdminGeneralPanel = ({ apiKey, setApiKey, horas, setHoras, voltar }) => {
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header">
          <h2 className="admin-title">⚙️ Definições do Sistema</h2>
          <button onClick={voltar} className="btn-back">
            Voltar
          </button>
        </div>
        <div className="card-panel">
          <div className="card-header">🤖 Inteligência Artificial (Gemini)</div>
          <div className="input-group">
            <label className="input-label">Google API Key</label>
            <input
              className="modern-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua chave (AIzaSy...)"
            />
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
              Necessário para gerar roteiros automáticos na tela de pedidos.
            </p>
          </div>
        </div>
        <div className="card-panel">
          <div className="card-header">⏰ Automação de Leads</div>
          <div className="input-group">
            <label className="input-label">Tempo para Reativação (Horas)</label>
            <input
              className="modern-input"
              type="number"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
            />
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
              Se um lead ficar parado por mais de <strong>{horas} horas</strong>
              , o botão "Reativar" aparecerá.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("vislumbre_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [aba, setAba] = useState("leads");
  const [pedidos, setPedidos] = useState([]);
  const [servicos, setServicos] = useState([]);

  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("vislumbre_google_key") || ""
  );
  const [modeloIA, setModeloIA] = useState(
    () => localStorage.getItem("vislumbre_model") || "gemini-1.5-flash"
  );
  const [horasReativacao, setHorasReativacao] = useState(
    () => Number(localStorage.getItem("vislumbre_reactivation_hours")) || 24
  );

  const [showConfig, setShowConfig] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [idSelecionado, setIdSelecionado] = useState(null);
  const [novoTel, setNovoTel] = useState("");
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "pedidos"), orderBy("tsEntrada", "desc")),
      (snap) =>
        setPedidos(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            historicoAcoes: d.data().historicoAcoes || [],
          }))
        )
    );
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "servicos"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (lista.length === 0) {
        addDoc(collection(db, "servicos"), { nome: "Jingle", cor: "#f59e0b" });
        addDoc(collection(db, "servicos"), { nome: "Vídeo", cor: "#3b82f6" });
      } else setServicos(lista);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem("vislumbre_google_key", apiKey);
  }, [apiKey]);
  useEffect(() => {
    localStorage.setItem("vislumbre_model", modeloIA);
  }, [modeloIA]);
  useEffect(() => {
    localStorage.setItem("vislumbre_reactivation_hours", horasReativacao);
  }, [horasReativacao]);

  const handleLogout = () => {
    localStorage.removeItem("vislumbre_user");
    setCurrentUser(null);
  };
  const getNovoHistorico = (pedido, desc) => [
    {
      user: currentUser?.nome || "Sistema",
      desc,
      data: new Date().toLocaleString(),
      timestamp: Date.now(),
    },
    ...(pedido.historicoAcoes || []),
  ];
  const getResponsavel = (historico, palavraChave) => {
    const acao = historico?.find((h) =>
      h.desc.toUpperCase().includes(palavraChave.toUpperCase())
    );
    return acao ? acao.user : "Sistema";
  };
  const calcularDuracao = (inicio, fim) => {
    if (!inicio || !fim) return "-";
    return formatarDuracaoHoras(fim - inicio);
  };

  const adicionarLead = async () => {
    if (!novoTel) return;
    try {
      await addDoc(collection(db, "pedidos"), {
        cliente: "",
        telefone: novoTel,
        status: "leads",
        obs: "",
        servico: servicos[0]?.nome || "Outros",
        valorRaw: "",
        comprovanteUrl: null,
        audios: [],
        roteiro: "",
        tsEntrada: Date.now(),
        dataEntrada: new Date().toLocaleString(),
        historicoAcoes: [
          {
            user: currentUser.nome,
            desc: "Criou o Lead",
            data: new Date().toLocaleString(),
            timestamp: Date.now(),
          },
        ],
      });
      setNovoTel("");
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };
  const atualizarPedido = async (id, campo, valor) =>
    await updateDoc(doc(db, "pedidos", id), { [campo]: valor });

  const moverPara = async (id, novoStatus) => {
    const pedido = pedidos.find((p) => p.id === id);
    if (novoStatus === "producao" && !pedido.roteiro)
      return alert("Roteiro obrigatório!");
    const now = Date.now();
    const d = new Date().toLocaleString();
    let updates = {
      status: novoStatus,
      historicoAcoes: getNovoHistorico(
        pedido,
        `Moveu para ${mapearStatus(novoStatus).toUpperCase()}`
      ),
    };
    if (novoStatus === "producao") {
      updates.tsProducao = now;
      updates.dataProducao = d;
      updates.tsVenda = now;
    }
    if (novoStatus === "finalizados") {
      updates.tsSaida = now;
      updates.dataSaida = d;
      if (pedido.audios && pedido.audios.length > 0) {
        await Promise.all(
          pedido.audios.map(async (url) => {
            try {
              const fileRef = ref(storage, url);
              await deleteObject(fileRef);
            } catch (e) {
              console.error("Erro deletar:", e);
            }
          })
        );
        updates.audios = [];
      }
    }
    await updateDoc(doc(db, "pedidos", id), updates);
    setIdSelecionado(null);
  };

  const handleAudioUpload = async (e, id) => {
    const file = e.target.files[0];
    if (file) {
      const btn = e.target.nextSibling;
      if (btn) btn.innerText = "⏳ Enviando...";
      try {
        const storageRef = ref(storage, `audios/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        const pedido = pedidos.find((p) => p.id === id);
        await updateDoc(doc(db, "pedidos", id), {
          audios: [...(pedido.audios || []), url],
          historicoAcoes: getNovoHistorico(pedido, "Anexou Áudio (Nuvem)"),
        });
      } catch (err) {
        alert("Erro no upload: " + err.message);
      } finally {
        if (btn) btn.innerText = "← Adicionar áudio";
      }
    }
    e.target.value = null;
  };

  const finalizarComWhats = (p) => {
    const phone = p.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(`Olá! Seu projeto está pronto.`);
    const url = `https://web.whatsapp.com/send?phone=55${phone}&text=${text}`;
    window.open(url, "_blank");
    moverPara(p.id, "finalizados");
  };

  const reativarLead = (e, p) => {
    e.stopPropagation();
    const phone = p.telefone.replace(/\D/g, "");
    const text = encodeURIComponent("Olá! Podemos retomar seu projeto?");
    const url = `https://web.whatsapp.com/send?phone=55${phone}&text=${text}`;
    window.open(url, "_blank");
  };

  const gerarRoteiroIA = async (p) => {
    if (!apiKey) return alert("Configure a API Key em Definições Gerais!");
    setLoadingIA(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modeloIA}:generateContent?key=${apiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Crie um roteiro/letra para ${p.servico}. Cliente: ${p.cliente}. Obs: ${p.obs}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      const d = await res.json();
      const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txt)
        await updateDoc(doc(db, "pedidos", p.id), {
          roteiro: txt,
          historicoAcoes: getNovoHistorico(p, "Gerou Roteiro com IA"),
        });
    } catch (e) {
      alert("Erro IA");
    } finally {
      setLoadingIA(false);
    }
  };

  const handleResetSystem = async () => {
    if (
      window.confirm(
        "🚨 PERIGO: Isso vai apagar TODOS os pedidos do sistema!\n\nTem certeza?"
      ) &&
      window.confirm("Última chance: Essa ação é irreversível.")
    ) {
      const snap = await getDocs(collection(db, "pedidos"));
      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "pedidos", d.id)))
      );
      alert("Sistema resetado.");
      window.location.reload();
    }
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  if (aba === "admin_team")
    return <AdminTeamPanel voltar={() => setAba("leads")} />;
  if (aba === "admin_services")
    return (
      <AdminServicesPanel servicos={servicos} voltar={() => setAba("leads")} />
    );
  if (aba === "admin_general")
    return (
      <AdminGeneralPanel
        apiKey={apiKey}
        setApiKey={setApiKey}
        horas={horasReativacao}
        setHoras={setHorasReativacao}
        voltar={() => setAba("leads")}
      />
    );
  if (aba === "stats")
    return (
      <StatsPanel
        pedidos={pedidos}
        servicos={servicos}
        voltar={() => setAba("leads")}
      />
    );

  const filterStart = filtroDataInicio
    ? new Date(filtroDataInicio + "T00:00:00").getTime()
    : 0;
  const filterEnd = filtroDataFim
    ? new Date(filtroDataFim + "T23:59:59.999").getTime()
    : Infinity;

  const listaFiltrada = pedidos.filter((p) => {
    if (aba === "leads") {
      if (p.status !== "leads" && p.status !== "pendentes") return false;
    } else {
      if (p.status !== aba) return false;
    }
    const matchTexto =
      (p.cliente &&
        p.cliente.toLowerCase().includes(termoBusca.toLowerCase())) ||
      (p.telefone && p.telefone.includes(termoBusca));
    const pData = p.tsEntrada || 0;
    return matchTexto && pData >= filterStart && pData <= filterEnd;
  });

  const pedidoAtivo = pedidos.find((p) => p.id === idSelecionado);
  const HistoricoView = ({ historico }) => (
    <div
      style={{
        marginTop: "30px",
        borderTop: "2px solid #e2e8f0",
        paddingTop: "20px",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", color: "#64748b" }}>
        📜 Histórico de Atividades
      </h4>
      <div
        style={{
          background: "#f9f9f9",
          padding: "10px",
          borderRadius: "6px",
          maxHeight: "150px",
          overflowY: "auto",
          border: "1px solid #e2e8f0",
        }}
      >
        {(!historico || historico.length === 0) && (
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Nenhuma atividade registrada.
          </span>
        )}
        {historico &&
          historico.map((h, i) => (
            <div
              key={i}
              style={{
                fontSize: "12px",
                marginBottom: "8px",
                borderBottom: "1px dashed #e2e8f0",
                paddingBottom: "4px",
              }}
            >
              <span style={{ fontWeight: "bold", color: "#1e293b" }}>
                {h.user}
              </span>{" "}
              <span style={{ color: "#64748b" }}> - {h.data}</span>
              <div style={{ color: "#334155", marginTop: "2px" }}>{h.desc}</div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Segoe UI, sans-serif",
      }}
      onClick={() => setShowConfig(false)}
    >
      <header
        style={{
          padding: "15px 25px",
          background: "#1e293b",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src="/logo.jpeg"
              alt="Logo"
              style={{
                height: "40px",
                borderRadius: "4px",
                marginRight: "10px",
              }}
            />
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
              Vislumbre
            </h2>
          </div>
          <span
            style={{
              fontSize: "11px",
              background: "#3b82f6",
              color: "white",
              padding: "4px 10px",
              borderRadius: "20px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {currentUser.nome}
          </span>
          {currentUser.role === "admin" && (
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfig(!showConfig);
                }}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  marginLeft: "10px",
                  padding: "8px",
                  borderRadius: "8px",
                  transition: "0.2s",
                }}
              >
                ⚙️ Ajustes
              </button>
              {showConfig && (
                <div
                  style={{
                    position: "absolute",
                    top: "45px",
                    left: "0",
                    background: "white",
                    color: "#333",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    zIndex: 100,
                    width: "200px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    onClick={() => setAba("admin_team")}
                    style={{
                      padding: "12px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    👥 Equipe
                  </div>
                  <div
                    onClick={() => setAba("admin_services")}
                    style={{
                      padding: "12px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    🛠️ Serviços
                  </div>
                  <div
                    onClick={() => setAba("stats")}
                    style={{
                      padding: "12px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    📊 Estatísticas
                  </div>
                  <div
                    onClick={() => setAba("admin_general")}
                    style={{
                      padding: "12px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    ⚙️ Definições Gerais
                  </div>
                  <div
                    onClick={handleResetSystem}
                    style={{
                      padding: "12px 15px",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: "13px",
                      background: "#fef2f2",
                      fontWeight: "600",
                    }}
                  >
                    🗑️ Resetar Tudo
                  </div>
                </div>
              )}
            </div>
          )}
          {currentUser.role !== "admin" && currentUser.acessoStats && (
            <button
              onClick={() => setAba("stats")}
              style={{
                background: "#8b5cf6",
                border: "none",
                color: "white",
                cursor: "pointer",
                marginLeft: "10px",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              📊 Stats
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { id: "leads", l: "Leads & Criação" },
            { id: "producao", l: "Produção" },
            { id: "finalizados", l: "Entregues" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setAba(m.id);
                setIdSelecionado(null);
              }}
              style={{
                background: aba === m.id ? "#fbbf24" : "rgba(255,255,255,0.1)",
                color: aba === m.id ? "#1e293b" : "#94a3b8",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                transition: "0.2s",
              }}
            >
              {m.l}
            </button>
          ))}
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              border: "none",
              color: "white",
              borderRadius: "6px",
              cursor: "pointer",
              padding: "8px 16px",
              fontWeight: "600",
              fontSize: "13px",
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          aba={aba}
          lista={listaFiltrada}
          idSelecionado={idSelecionado}
          setIdSelecionado={setIdSelecionado}
          novoTel={novoTel}
          setNovoTel={setNovoTel}
          adicionarLead={adicionarLead}
          reativarLead={reativarLead}
          termoBusca={termoBusca}
          setTermoBusca={setTermoBusca}
          filtroDataInicio={filtroDataInicio}
          setFiltroDataInicio={setFiltroDataInicio}
          filtroDataFim={filtroDataFim}
          setFiltroDataFim={setFiltroDataFim}
          horasReativacao={horasReativacao}
        />
        <div
          style={{
            flex: 1,
            padding: "20px",
            overflowY: "auto",
            background: "#f8fafc",
          }}
        >
          {pedidoAtivo ? (
            <div style={{ maxWidth: "900px", margin: "0 auto" }}>
              <div style={{ marginBottom: "20px", textAlign: "right" }}>
                <span
                  style={{
                    background: "#cbd5e1",
                    color: "#334155",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {mapearStatus(pedidoAtivo.status)}
                </span>
              </div>
              <Details
                ativo={pedidoAtivo}
                atualizarPedido={atualizarPedido}
                moverPara={moverPara}
                finalizarComWhats={finalizarComWhats}
                gerarRoteiroIA={gerarRoteiroIA}
                loadingIA={loadingIA}
                handleAudioUpload={handleAudioUpload}
                handleDrop={() => {}}
                servicos={servicos}
                currentUser={currentUser}
              />
              {pedidoAtivo.status === "finalizados" && (
                <div
                  style={{
                    marginTop: "30px",
                    padding: "20px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    background: "white",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 15px 0",
                      color: "#1e293b",
                      fontSize: "16px",
                    }}
                  >
                    ⏱️ Performance deste Pedido
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "20px",
                    }}
                  >
                    <div
                      style={{
                        padding: "15px",
                        background: "#fff7ed",
                        borderRadius: "8px",
                        border: "1px solid #ffedd5",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9a3412",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}
                      >
                        Fase de Negociação
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          color: "#c2410c",
                          fontWeight: "800",
                        }}
                      >
                        {calcularDuracao(
                          pedidoAtivo.tsEntrada,
                          pedidoAtivo.tsProducao
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9a3412" }}>
                        Resp:{" "}
                        {getResponsavel(pedidoAtivo.historicoAcoes, "PRODUÇÃO")}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "15px",
                        background: "#f5f3ff",
                        borderRadius: "8px",
                        border: "1px solid #ede9fe",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#5b21b6",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                        }}
                      >
                        Fase de Produção
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          color: "#6d28d9",
                          fontWeight: "800",
                        }}
                      >
                        {calcularDuracao(
                          pedidoAtivo.tsProducao,
                          pedidoAtivo.tsSaida
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#5b21b6" }}>
                        Resp:{" "}
                        {getResponsavel(
                          pedidoAtivo.historicoAcoes,
                          "FINALIZADO"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <HistoricoView historico={pedidoAtivo.historicoAcoes} />
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#94a3b8",
                marginTop: "100px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>👈</div>
              Selecione um pedido ao lado para começar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
