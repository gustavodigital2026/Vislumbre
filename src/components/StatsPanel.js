import React, { useState } from "react";
import {
  formatarMoeda,
  formatarDuracaoHoras,
  parseDataSegura,
  normalizar,
} from "../utils";

// --- GRÁFICO ---
const LineChart = ({ dados }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!dados || dados.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        Sem dados suficientes.
      </div>
    );
  }

  const width = 800;
  const height = 250;
  const paddingLeft = 70;
  const paddingBottom = 40;
  const paddingRight = 40;
  const paddingTop = 40;

  const maxDataVal = Math.max(...dados.map((d) => d.valor), 0);
  const maxVal = Math.max(maxDataVal, 1) * 1.2;

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
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#e2e8f0"
          strokeWidth="2"
        />

        {maxDataVal > 0 && (
          <>
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

        <text
          x={paddingLeft - 10}
          y={height - paddingBottom + 4}
          textAnchor="end"
          fontSize="11"
          fill="#94a3b8"
        >
          R$ 0,00
        </text>

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

// --- PAINEL PRINCIPAL ---
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

        if (desc.includes("criou") || desc.includes("lead")) {
          stats[usuario].leads++;
          if (!tsCriacao) tsCriacao = acaoTs;
        }

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

        if (desc.includes("finalizado") || desc.includes("entregue")) {
          stats[usuario].entregas++;
          const base = parseDataSegura(pedido.tsProducao) || tsCriacao;
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
            <div className="kpi-title" style={{ color: "#ef4444" }}>
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
                <span>📈 Evolução do Faturamento</span>
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

export default StatsPanel;
