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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import "./styles.css";

// IMPORTANDO OS COMPONENTES NOVOS
import { normalizar, mapearStatus, parseDataSegura } from "./utils";
import LoginScreen from "./components/LoginScreen";
import StatsPanel from "./components/StatsPanel";
import {
  AdminTeamPanel,
  AdminServicesPanel,
  AdminGeneralPanel,
} from "./components/AdminPanels";
import Sidebar from "./Sidebar";
import Details from "./Details";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const s = localStorage.getItem("vislumbre_user");
    return s ? JSON.parse(s) : null;
  });
  const [aba, setAba] = useState("leads");
  const [pedidos, setPedidos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [idSelecionado, setIdSelecionado] = useState(null);

  // Filtros Sidebar
  const [novoTel, setNovoTel] = useState("");
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  // Configs Globais
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

  // LISTENERS FIREBASE
  useEffect(() => {
    const u = onSnapshot(
      query(collection(db, "pedidos"), orderBy("tsEntrada", "desc")),
      (s) =>
        setPedidos(
          s.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            historicoAcoes: d.data().historicoAcoes || [],
          }))
        )
    );
    return () => u();
  }, []);
  useEffect(() => {
    const u = onSnapshot(collection(db, "servicos"), (s) =>
      setServicos(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => u();
  }, []);
  useEffect(() => {
    localStorage.setItem("vislumbre_google_key", apiKey);
    localStorage.setItem("vislumbre_model", modeloIA);
    localStorage.setItem("vislumbre_reactivation_hours", horasReativacao);
  }, [apiKey, modeloIA, horasReativacao]);

  const handleLogout = () => {
    localStorage.removeItem("vislumbre_user");
    setCurrentUser(null);
  };

  // LÓGICA DE FILTRO
  const listaFiltrada = pedidos.filter((p) => {
    const statusP = normalizar(p.status);
    const abaNorm = normalizar(aba);
    const statusMatch =
      abaNorm === "leads"
        ? statusP === "leads" || statusP === "pendentes"
        : statusP === abaNorm;
    const matchTexto =
      !termoBusca ||
      (p.cliente && normalizar(p.cliente).includes(normalizar(termoBusca))) ||
      (p.telefone && p.telefone.includes(termoBusca));
    const pData = p.tsEntrada || 0;
    const fStart = filtroDataInicio
      ? new Date(filtroDataInicio + "T00:00:00").getTime()
      : 0;
    const fEnd = filtroDataFim
      ? new Date(filtroDataFim + "T23:59:59.999").getTime()
      : Infinity;
    return statusMatch && matchTexto && pData >= fStart && pData <= fEnd;
  });

  const pedidoAtivo = pedidos.find((p) => p.id === idSelecionado);

  // AÇÕES
  const getNovoHistorico = (p, d) => [
    {
      user: currentUser?.nome || "Sistema",
      desc: d,
      data: new Date().toLocaleString(),
      timestamp: Date.now(),
    },
    ...(p.historicoAcoes || []),
  ];

  const adicionarLead = async () => {
    if (!novoTel) return;
    await addDoc(collection(db, "pedidos"), {
      telefone: novoTel,
      status: "leads",
      tsEntrada: Date.now(),
      dataEntrada: new Date().toLocaleString(),
      historicoAcoes: [
        {
          user: currentUser.nome,
          desc: "Criou Lead",
          data: new Date().toLocaleString(),
        },
      ],
    });
    setNovoTel("");
  };
  const atualizarPedido = async (id, f, v) =>
    await updateDoc(doc(db, "pedidos", id), { [f]: v });

  const moverPara = async (id, s) => {
    const p = pedidos.find((x) => x.id === id);
    if (s === "producao" && !p.roteiro) return alert("Roteiro obrigatório!");
    const now = Date.now();
    await updateDoc(doc(db, "pedidos", id), {
      status: s,
      tsProducao: s === "producao" ? now : p.tsProducao || null,
      tsSaida: s === "finalizados" ? now : p.tsSaida || null,
      historicoAcoes: [
        {
          user: currentUser.nome,
          desc: `Moveu para ${mapearStatus(s).toUpperCase()}`,
          timestamp: now,
          data: new Date().toLocaleString(),
        },
        ...p.historicoAcoes,
      ],
    });
    setIdSelecionado(null);
  };

  const handleProofDrop = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      try {
        const storageRef = ref(
          storage,
          `comprovantes/${Date.now()}_${file.name}`
        );
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "pedidos", id), { comprovanteUrl: url });
      } catch (err) {
        alert("Erro: " + err.message);
      }
    }
  };
  const handleAudioUpload = async (e, id) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const storageRef = ref(storage, `audios/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        const p = pedidos.find((x) => x.id === id);
        await updateDoc(doc(db, "pedidos", id), {
          audios: [...(p.audios || []), url],
          historicoAcoes: getNovoHistorico(p, "Anexou Áudio"),
        });
      } catch (err) {
        alert("Erro: " + err.message);
      }
    }
    e.target.value = null;
  };
  const finalizarComWhats = (p) => {
    window.open(
      `https://web.whatsapp.com/send?phone=55${p.telefone.replace(
        /\D/g,
        ""
      )}&text=Pronto!`,
      "_blank"
    );
    moverPara(p.id, "finalizados");
  };
  const reativarLead = (e, p) => {
    e.stopPropagation();
    window.open(
      `https://web.whatsapp.com/send?phone=55${p.telefone.replace(
        /\D/g,
        ""
      )}&text=Olá!`,
      "_blank"
    );
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
          historicoAcoes: getNovoHistorico(p, "Gerou Roteiro IA"),
        });
    } catch (e) {
      alert("Erro IA");
    } finally {
      setLoadingIA(false);
    }
  };
  const handleResetSystem = async () => {
    if (window.confirm("RESETAR TUDO?")) {
      const snap = await getDocs(collection(db, "pedidos"));
      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "pedidos", d.id)))
      );
      alert("Resetado.");
      window.location.reload();
    }
  };

  // NAVEGAÇÃO
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

  // RENDERIZAÇÃO
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "#1e293b",
          color: "white",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src="/logo.jpeg"
              style={{
                height: "35px",
                borderRadius: "4px",
                marginRight: "10px",
              }}
              alt="Logo"
            />
            <span style={{ fontWeight: "bold", fontSize: "18px" }}>
              Vislumbre
            </span>
          </div>
          <span
            style={{
              fontSize: "11px",
              background: "#3b82f6",
              color: "white",
              padding: "3px 10px",
              borderRadius: "20px",
              fontWeight: "600",
              textTransform: "uppercase",
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
                  fontSize: "14px",
                  marginLeft: "10px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  color: "white",
                }}
              >
                ⚙️
              </button>
              {showConfig && (
                <div
                  style={{
                    position: "absolute",
                    top: "40px",
                    left: "0",
                    background: "white",
                    color: "#333",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    zIndex: 100,
                    width: "180px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    onClick={() => setAba("admin_team")}
                    style={{
                      padding: "10px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "13px",
                    }}
                  >
                    👥 Equipe
                  </div>
                  <div
                    onClick={() => setAba("admin_services")}
                    style={{
                      padding: "10px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "13px",
                    }}
                  >
                    🛠️ Serviços
                  </div>
                  <div
                    onClick={() => setAba("stats")}
                    style={{
                      padding: "10px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "13px",
                    }}
                  >
                    📊 Estatísticas
                  </div>
                  <div
                    onClick={() => setAba("admin_general")}
                    style={{
                      padding: "10px 15px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#3b82f6",
                    }}
                  >
                    ⚙️ Definições Gerais
                  </div>
                  <div
                    onClick={handleResetSystem}
                    style={{
                      padding: "10px 15px",
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
                padding: "5px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                marginLeft: "10px",
              }}
            >
              📊
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { id: "leads", l: "Leads" },
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
                background: aba === m.id ? "#f59e0b" : "rgba(255,255,255,0.1)",
                color: aba === m.id ? "#1e293b" : "#94a3b8",
                border: "none",
                padding: "8px 15px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
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
              padding: "8px 15px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
            }}
          >
            Sair
          </button>
        </div>
      </header>
      <div
        style={{ flex: 1, display: "flex", overflow: "hidden" }}
        onClick={() => setShowConfig(false)}
      >
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
            background: "#f8fafc",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          {pedidoAtivo ? (
            <Details
              ativo={pedidoAtivo}
              atualizarPedido={atualizarPedido}
              moverPara={moverPara}
              finalizarComWhats={finalizarComWhats}
              gerarRoteiroIA={gerarRoteiroIA}
              loadingIA={loadingIA}
              handleAudioUpload={handleAudioUpload}
              handleDrop={handleProofDrop}
              servicos={servicos}
              currentUser={currentUser}
            />
          ) : (
            <div
              style={{
                textAlign: "center",
                marginTop: "100px",
                color: "#94a3b8",
              }}
            >
              <h2>👈 Selecione um item</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
