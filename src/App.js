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
      return "Leads";
    case "pendentes":
      return "Criação da Letra";
    case "producao":
      return "Criação Final";
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

// --- LOGIN (ATUALIZADO V41 - COM PERSISTÊNCIA) ---
const LoginScreen = ({ onLogin }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // Login Admin Hardcoded
    if (user === "admin" && pass === "1234") {
      const adminUser = {
        nome: "Administrador",
        login: "admin",
        role: "admin",
        acessoStats: true,
      };
      // Salva na memória do navegador
      localStorage.setItem("vislumbre_user", JSON.stringify(adminUser));
      onLogin(adminUser);
      return;
    }

    // Login Banco de Dados
    try {
      const q = query(
        collection(db, "usuarios"),
        where("login", "==", user),
        where("senha", "==", pass)
      );
      const qs = await getDocs(q);
      if (!qs.empty) {
        const dadosUsuario = { ...qs.docs[0].data(), id: qs.docs[0].id };
        // Salva na memória do navegador
        localStorage.setItem("vislumbre_user", JSON.stringify(dadosUsuario));
        onLogin(dadosUsuario);
      } else {
        setError("Dados incorretos.");
      }
    } catch (e) {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "#2c3e50",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "10px",
          width: "300px",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "#2c3e50" }}>Vislumbre CRM 🔒</h2>
        <input
          placeholder="Login"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            boxSizing: "border-box",
          }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />
        {error && <p style={{ color: "red", fontSize: "12px" }}>{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            background: "#27ae60",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "..." : "ENTRAR"}
        </button>
      </div>
    </div>
  );
};

// ... (LineChart mantido igual, omitido para economizar espaço, mas deve estar aqui)
const LineChart = ({ dados }) => {
  if (!dados || dados.length === 0)
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
        Sem dados para o período
      </div>
    );
  const width = 800;
  const height = 200;
  const padding = 20;
  const maxVal = Math.max(...dados.map((d) => d.valor), 1) * 1.1;
  const points = dados.map((d, i) => {
    const xStep =
      dados.length > 1 ? (width - 2 * padding) / (dados.length - 1) : 0;
    const x = dados.length > 1 ? padding + i * xStep : width / 2;
    const y = height - padding - (d.valor / maxVal) * (height - 2 * padding);
    return { x, y, ...d };
  });
  const pathD =
    points.length > 1
      ? points
          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
          .join(" ")
      : "";
  return (
    <div style={{ width: "100%", overflowX: "auto", marginTop: "20px" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#eee"
          strokeWidth="2"
        />
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#27ae60"
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
              r="6"
              fill="#27ae60"
              stroke="white"
              strokeWidth="2"
            >
              <title>{`${p.label || p.data}: ${formatarMoeda(p.valor)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ... (StatsPanel mantido igual)
const StatsPanel = ({ pedidos, servicos, voltar }) => {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0]
  );
  const [dataFim, setDataFim] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState("dia");

  const calcularMetricas = () => {
    const stats = {};
    const financeiro = {};
    const vendasRaw = {};
    let faturamentoTotal = 0;
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
      let tsVenda = null;
      let tsProducao = null;
      histOrdenado.forEach((acao) => {
        let acaoTs = parseDataSegura(acao.timestamp || acao.data);
        if (acaoTs < inicioTs || acaoTs > fimTs) return;
        const usuario = acao.user || "Sistema";
        if (!stats[usuario])
          stats[usuario] = {
            leads: 0,
            vendas: 0,
            tempoVendaTotal: 0,
            roteiros: 0,
            tempoRoteiroTotal: 0,
            entregas: 0,
            tempoProducaoTotal: 0,
          };
        const desc = acao.desc.toUpperCase();
        if (desc.includes("CRIOU") || desc.includes("LEAD")) {
          stats[usuario].leads++;
          if (!tsCriacao) tsCriacao = acaoTs;
        }
        if (desc.includes("PENDENTE") || desc.includes("ROTEIRO")) {
          stats[usuario].vendas++;
          if (tsCriacao > 0 && acaoTs > tsCriacao)
            stats[usuario].tempoVendaTotal += acaoTs - tsCriacao;
          tsVenda = acaoTs;
          const valor = Number(pedido.valorRaw || 0);
          const servico = pedido.servico || "Outros";
          if (financeiro[servico] !== undefined) financeiro[servico] += valor;
          else financeiro["Outros"] += valor;
          faturamentoTotal += valor;
          const diaNormalizado = new Date(acaoTs).setHours(0, 0, 0, 0);
          vendasRaw[diaNormalizado] = (vendasRaw[diaNormalizado] || 0) + valor;
        }
        if (desc.includes("PRODUÇÃO") || desc.includes("PRODUCAO")) {
          stats[usuario].roteiros++;
          const base = tsVenda || tsCriacao;
          if (base > 0 && acaoTs > base)
            stats[usuario].tempoRoteiroTotal += acaoTs - base;
          tsProducao = acaoTs;
        }
        if (desc.includes("FINALIZADO") || desc.includes("ENTREGUE")) {
          stats[usuario].entregas++;
          const base = tsProducao || tsVenda;
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
        mediaRoteiro: stats[nome].roteiros
          ? stats[nome].tempoRoteiroTotal / stats[nome].roteiros
          : 0,
        mediaProducao: stats[nome].entregas
          ? stats[nome].tempoProducaoTotal / stats[nome].entregas
          : 0,
      })),
      financeiro,
      faturamentoTotal,
      dadosGrafico: Object.values(aggregated).sort(
        (a, b) => a.sortKey - b.sortKey
      ),
    };
  };

  const { operadores, financeiro, faturamentoTotal, dadosGrafico } =
    calcularMetricas();
  const gerarGraficoPizza = () => {
    if (faturamentoTotal === 0) return "conic-gradient(#ccc 0% 100%)";
    let acumulado = 0;
    const segmentos = Object.keys(financeiro)
      .map((key) => {
        const valor = financeiro[key];
        if (valor === 0) return null;
        const servicoObj = servicos.find((s) => s.nome === key);
        const cor = servicoObj ? servicoObj.cor : "#95a5a6";
        const porcentagem = (valor / faturamentoTotal) * 100;
        const inicio = acumulado;
        acumulado += porcentagem;
        return `${cor} ${inicio}% ${acumulado}%`;
      })
      .filter(Boolean);
    return `conic-gradient(${segmentos.join(", ")})`;
  };

  return (
    <div
      style={{
        padding: "30px",
        background: "#f4f6f8",
        height: "100vh",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            background: "white",
            padding: "15px",
            borderRadius: "8px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#2c3e50" }}>📊 Estatísticas</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold" }}>De:</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              style={{
                padding: "5px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <label style={{ fontSize: "12px", fontWeight: "bold" }}>Até:</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              style={{
                padding: "5px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <button
              onClick={voltar}
              style={{
                padding: "8px 15px",
                background: "#95a5a6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginLeft: "10px",
              }}
            >
              Sair
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#27ae60",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
              }}
            >
              💰 Faturamento
            </h3>
            {Object.keys(financeiro).map((k) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span>{k}</span>
                <strong>{formatarMoeda(financeiro[k])}</strong>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "15px",
                paddingTop: "10px",
                borderTop: "2px dashed #ddd",
                fontSize: "18px",
              }}
            >
              <strong>TOTAL</strong>
              <strong style={{ color: "#27ae60" }}>
                {formatarMoeda(faturamentoTotal)}
              </strong>
            </div>
          </div>
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
            }}
          >
            <div
              style={{
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                background: gerarGraficoPizza(),
                border: "4px solid white",
                boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              }}
            ></div>
            <div style={{ fontSize: "13px" }}>
              {servicos.map((s) => (
                <div key={s.id} style={{ marginBottom: "5px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      background: s.cor,
                      marginRight: "5px",
                    }}
                  ></span>
                  {s.nome}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "30px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#2c3e50" }}>📈 Evolução</h3>
            <div style={{ display: "flex", gap: "5px" }}>
              {["dia", "semana", "mes", "ano"].map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  style={{
                    padding: "5px 10px",
                    border: "1px solid #2980b9",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: viewMode === m ? "#2980b9" : "white",
                    color: viewMode === m ? "white" : "#2980b9",
                    textTransform: "capitalize",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {m === "mes" ? "Mês" : m}
                </button>
              ))}
            </div>
          </div>
          <LineChart dados={dadosGrafico} />
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead style={{ background: "#2c3e50", color: "white" }}>
              <tr>
                <th
                  style={{ padding: "15px", textAlign: "left", width: "20%" }}
                >
                  Operador
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "center",
                    background: "#3498db",
                  }}
                >
                  Leads Criados
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "center",
                    background: "#27ae60",
                  }}
                >
                  Entrada Lead/Venda
                  <br />
                  <small>(Tempo Médio)</small>
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "center",
                    background: "#e67e22",
                  }}
                >
                  Criação da Letra
                  <br />
                  <small>(Tempo Médio)</small>
                </th>
                <th
                  style={{
                    padding: "15px",
                    textAlign: "center",
                    background: "#8e44ad",
                  }}
                >
                  Criação Final
                  <br />
                  <small>(Tempo Médio)</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {operadores.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{ padding: "20px", textAlign: "center" }}
                  >
                    Nenhum dado neste período.
                  </td>
                </tr>
              )}
              {operadores.map((d, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #eee",
                    background: i % 2 === 0 ? "white" : "#f9f9f9",
                  }}
                >
                  <td
                    style={{
                      padding: "15px",
                      fontWeight: "bold",
                      color: "#2c3e50",
                    }}
                  >
                    {d.nome}
                  </td>
                  <td
                    style={{
                      padding: "15px",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {d.leads}
                  </td>
                  <td style={{ padding: "15px", textAlign: "center" }}>
                    <strong style={{ color: "#27ae60" }}>{d.vendas}</strong>{" "}
                    <small style={{ display: "block", color: "#7f8c8d" }}>
                      {formatarDuracaoHoras(d.mediaVenda)}
                    </small>
                  </td>
                  <td style={{ padding: "15px", textAlign: "center" }}>
                    <strong style={{ color: "#e67e22" }}>{d.roteiros}</strong>{" "}
                    <small style={{ display: "block", color: "#7f8c8d" }}>
                      {formatarDuracaoHoras(d.mediaRoteiro)}
                    </small>
                  </td>
                  <td style={{ padding: "15px", textAlign: "center" }}>
                    <strong style={{ color: "#8e44ad" }}>{d.entregas}</strong>{" "}
                    <small style={{ display: "block", color: "#7f8c8d" }}>
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
  );
};

// ... (Paineis AdminTeamPanel e AdminServicesPanel mantidos, estão perfeitos)
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
    alert("Usuário criado!");
  };
  const removerUsuario = async (id) => {
    if (window.confirm("Remover?")) await deleteDoc(doc(db, "usuarios", id));
  };
  const toggleStats = async (id, statusAtual) => {
    await updateDoc(doc(db, "usuarios", id), { acessoStats: !statusAtual });
  };
  return (
    <div
      style={{
        padding: "40px",
        background: "#ecf0f1",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2>Gestão de Equipe</h2>
          <button onClick={voltar}>Voltar</button>
        </div>
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h4>Novo Usuário</h4>
          <input
            placeholder="Nome"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
            }}
          />
          <input
            placeholder="Login"
            value={novoLogin}
            onChange={(e) => setNovoLogin(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
            }}
          />
          <input
            placeholder="Senha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
            }}
          />
          <button
            onClick={adicionarUsuario}
            style={{
              width: "100%",
              padding: "10px",
              background: "#2980b9",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Cadastrar
          </button>
        </div>
        {usuarios.map((u) => (
          <div
            key={u.id}
            style={{
              background: "white",
              padding: "10px",
              marginBottom: "5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{u.nome}</strong> ({u.login})
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <label
                style={{
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={u.acessoStats || false}
                  onChange={() => toggleStats(u.id, u.acessoStats)}
                />{" "}
                Ver Stats
              </label>
              <button
                onClick={() => removerUsuario(u.id)}
                style={{
                  color: "red",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                X
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminServicesPanel = ({ servicos, voltar }) => {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3498db");
  const adicionar = async () => {
    if (!nome) return alert("Digite o nome");
    await addDoc(collection(db, "servicos"), { nome, cor });
    setNome("");
  };
  const remover = async (id) => {
    if (window.confirm("Remover?")) await deleteDoc(doc(db, "servicos", id));
  };
  return (
    <div
      style={{
        padding: "40px",
        background: "#ecf0f1",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2>🛠️ Gerenciar Serviços</h2>
          <button onClick={voltar}>Voltar</button>
        </div>
        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h4>Adicionar Novo Serviço</h4>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              placeholder="Nome (ex: Social Media)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ flex: 1, padding: "10px" }}
            />
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              style={{ height: "40px", width: "50px" }}
            />
            <button
              onClick={adicionar}
              style={{
                background: "#27ae60",
                color: "white",
                border: "none",
                padding: "0 15px",
                borderRadius: "4px",
              }}
            >
              Salvar
            </button>
          </div>
        </div>
        {servicos.map((s) => (
          <div
            key={s.id}
            style={{
              background: "white",
              padding: "10px",
              marginBottom: "5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderLeft: `5px solid ${s.cor}`,
            }}
          >
            <strong>{s.nome}</strong>
            <button
              onClick={() => remover(s.id)}
              style={{
                color: "red",
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- APP PRINCIPAL (ATUALIZADO V41) ---
export default function App() {
  // LÓGICA V41: Inicializar 'currentUser' do localStorage para não deslogar no F5
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
        addDoc(collection(db, "servicos"), { nome: "Jingle", cor: "#e67e22" });
        addDoc(collection(db, "servicos"), { nome: "Vídeo", cor: "#3498db" });
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

  // Função Sair (Limpa localStorage)
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
    if (novoStatus === "pendentes") {
      updates.tsVenda = now;
      updates.dataVenda = d;
    }
    if (novoStatus === "producao") {
      updates.tsProducao = now;
      updates.dataProducao = d;
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
    window.open(
      `https://wa.me/55${p.telefone}?text=${encodeURIComponent(
        `Olá! Seu projeto está pronto.`
      )}`,
      "_blank"
    );
    moverPara(p.id, "finalizados");
  };
  const gerarRoteiroIA = async (p) => {
    if (!apiKey) return alert("Configure a API Key!");
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
                    text: `Crie um roteiro para ${p.servico}. Cliente: ${p.cliente}. Obs: ${p.obs}`,
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
    const confirm1 = window.confirm(
      "🚨 PERIGO: Isso vai apagar TODOS os pedidos do sistema!\n\nTem certeza que deseja continuar?"
    );
    if (!confirm1) return;
    const confirm2 = window.confirm(
      "Última chance: Essa ação é irreversível.\n\nClique em OK para apagar tudo."
    );
    if (confirm2) {
      const snap = await getDocs(collection(db, "pedidos"));
      const promises = snap.docs.map((d) =>
        deleteDoc(doc(db, "pedidos", d.id))
      );
      await Promise.all(promises);
      alert("Sistema resetado com sucesso.");
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
    if (p.status !== aba) return false;
    const matchTexto =
      (p.cliente &&
        p.cliente.toLowerCase().includes(termoBusca.toLowerCase())) ||
      (p.telefone && p.telefone.includes(termoBusca));
    const pData = p.tsEntrada || 0;
    const matchData = pData >= filterStart && pData <= filterEnd;
    return matchTexto && matchData;
  });

  const pedidoAtivo = pedidos.find((p) => p.id === idSelecionado);

  const HistoricoView = ({ historico }) => (
    <div
      style={{
        marginTop: "30px",
        borderTop: "2px solid #ecf0f1",
        paddingTop: "20px",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", color: "#7f8c8d" }}>
        📜 Histórico de Atividades
      </h4>
      <div
        style={{
          background: "#f9f9f9",
          padding: "10px",
          borderRadius: "6px",
          maxHeight: "150px",
          overflowY: "auto",
          border: "1px solid #eee",
        }}
      >
        {(!historico || historico.length === 0) && (
          <span style={{ fontSize: "12px", color: "#ccc" }}>
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
                borderBottom: "1px dashed #ddd",
                paddingBottom: "4px",
              }}
            >
              <span style={{ fontWeight: "bold", color: "#2c3e50" }}>
                {h.user}
              </span>{" "}
              <span style={{ color: "#7f8c8d" }}> - {h.data}</span>
              <div style={{ color: "#34495e", marginTop: "2px" }}>{h.desc}</div>
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
          padding: "15px",
          background: "#2c3e50",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Vislumbre ☁️</h2>
          <span
            style={{
              fontSize: "12px",
              background: "#f1c40f",
              color: "black",
              padding: "2px 8px",
              borderRadius: "10px",
              fontWeight: "bold",
            }}
          >
            {currentUser.nome} ({currentUser.role === "admin" ? "Admin" : "Op"})
          </span>

          {currentUser.role === "admin" && (
            <div style={{ position: "relative" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfig(!showConfig);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "22px",
                  marginLeft: "15px",
                }}
              >
                ⚙️
              </button>
              {showConfig && (
                <div
                  style={{
                    position: "absolute",
                    top: "35px",
                    left: "0",
                    background: "white",
                    color: "#333",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                    borderRadius: "6px",
                    overflow: "hidden",
                    zIndex: 100,
                    width: "150px",
                  }}
                >
                  <div
                    onClick={() => setAba("admin_team")}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      fontSize: "14px",
                    }}
                  >
                    👥 Equipe
                  </div>
                  <div
                    onClick={() => setAba("admin_services")}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      fontSize: "14px",
                    }}
                  >
                    🛠️ Serviços
                  </div>
                  <div
                    onClick={() => setAba("stats")}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      fontSize: "14px",
                    }}
                  >
                    📊 Stats
                  </div>
                  <div
                    style={{ padding: "10px", borderBottom: "1px solid #eee" }}
                  >
                    <input
                      value={apiKey}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="API Key..."
                      type="password"
                      style={{
                        width: "100%",
                        border: "1px solid #ddd",
                        padding: "4px",
                        fontSize: "12px",
                      }}
                    />
                  </div>
                  <div
                    onClick={handleResetSystem}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      color: "red",
                      fontWeight: "bold",
                      fontSize: "14px",
                      background: "#fff5f5",
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
                background: "#8e44ad",
                border: "none",
                color: "white",
                cursor: "pointer",
                marginLeft: "10px",
                borderRadius: "4px",
                padding: "5px 10px",
              }}
            >
              📊 Stats
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { id: "leads", l: "Leads" },
            { id: "pendentes", l: "Criação da Letra" },
            { id: "producao", l: "Criação Final" },
            { id: "finalizados", l: "Entregues" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setAba(m.id);
                setIdSelecionado(null);
              }}
              style={{
                background: aba === m.id ? "#f1c40f" : "#34495e",
                color: aba === m.id ? "#000" : "#bdc3c7",
                border: "none",
                padding: "8px 15px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {m.l}
            </button>
          ))}
          <button
            onClick={handleLogout}
            style={{
              background: "#e74c3c",
              border: "none",
              color: "white",
              borderRadius: "4px",
              cursor: "pointer",
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
          reativarLead={() => {}}
          termoBusca={termoBusca}
          setTermoBusca={setTermoBusca}
          filtroDataInicio={filtroDataInicio}
          setFiltroDataInicio={setFiltroDataInicio}
          filtroDataFim={filtroDataFim}
          setFiltroDataFim={setFiltroDataFim}
        />
        <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
          {pedidoAtivo ? (
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              <div style={{ marginBottom: "20px", textAlign: "right" }}>
                <span
                  style={{
                    background: "#2c3e50",
                    color: "white",
                    padding: "5px 10px",
                    borderRadius: "15px",
                    fontSize: "12px",
                  }}
                >
                  {mapearStatus(pedidoAtivo.status).toUpperCase()}
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
              />
              {pedidoAtivo.status === "finalizados" && (
                <div
                  style={{
                    marginTop: "30px",
                    padding: "15px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "#fdfdfd",
                  }}
                >
                  <h3 style={{ margin: "0 0 15px 0", color: "#2c3e50" }}>
                    ⏱️ Performance deste Pedido
                  </h3>
                  <div style={{ marginBottom: "10px", fontSize: "14px" }}>
                    ⬇️{" "}
                    <strong>
                      {getResponsavel(pedidoAtivo.historicoAcoes, "ROTEIRO") ||
                        getResponsavel(pedidoAtivo.historicoAcoes, "PENDENTE")}
                    </strong>{" "}
                    -{" "}
                    <span style={{ fontWeight: "bold" }}>
                      Entrada Lead/Venda
                    </span>
                    :{" "}
                    <span style={{ color: "#2980b9" }}>
                      {" "}
                      {calcularDuracao(
                        pedidoAtivo.tsEntrada,
                        pedidoAtivo.tsVenda
                      )}{" "}
                    </span>
                  </div>
                  <div style={{ marginBottom: "10px", fontSize: "14px" }}>
                    ⬇️{" "}
                    <strong>
                      {getResponsavel(pedidoAtivo.historicoAcoes, "PRODUÇÃO") ||
                        getResponsavel(pedidoAtivo.historicoAcoes, "PRODUCAO")}
                    </strong>{" "}
                    -{" "}
                    <span style={{ fontWeight: "bold" }}>Criação da Letra</span>
                    :{" "}
                    <span style={{ color: "#e67e22" }}>
                      {" "}
                      {calcularDuracao(
                        pedidoAtivo.tsVenda,
                        pedidoAtivo.tsProducao
                      )}{" "}
                    </span>
                  </div>
                  <div style={{ marginBottom: "10px", fontSize: "14px" }}>
                    ⬇️{" "}
                    <strong>
                      {getResponsavel(
                        pedidoAtivo.historicoAcoes,
                        "ENTREGUES"
                      ) ||
                        getResponsavel(
                          pedidoAtivo.historicoAcoes,
                          "FINALIZADO"
                        )}
                    </strong>{" "}
                    - <span style={{ fontWeight: "bold" }}>Criação Final</span>:{" "}
                    <span style={{ color: "#8e44ad" }}>
                      {" "}
                      {calcularDuracao(
                        pedidoAtivo.tsProducao,
                        pedidoAtivo.tsSaida
                      )}{" "}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: "15px",
                      paddingTop: "10px",
                      borderTop: "1px dashed #ccc",
                      fontWeight: "bold",
                    }}
                  >
                    Tempo Total de Ciclo:{" "}
                    {calcularDuracao(
                      pedidoAtivo.tsEntrada,
                      pedidoAtivo.tsSaida
                    )}
                  </div>
                </div>
              )}
              <HistoricoView historico={pedidoAtivo.historicoAcoes} />
            </div>
          ) : (
            <div
              style={{ textAlign: "center", color: "#ccc", marginTop: "50px" }}
            >
              Selecione um pedido
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
