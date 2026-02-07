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
import LoginScreen from "./components/LoginScreen";
import StatsPanel from "./components/StatsPanel";
import {
  AdminTeamPanel,
  AdminServicesPanel,
  AdminGeneralPanel,
} from "./components/AdminPanels";
import { mapearStatus, formatarDuracaoHoras } from "./utils";
import "./styles.css";

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("vislumbre_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [aba, setAba] = useState("leads");
  const [pedidos, setPedidos] = useState([]);
  const [servicos, setServicos] = useState([]);

  // Configs
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("vislumbre_google_key") || ""
  );
  const [modeloIA, setModeloIA] = useState(
    () => localStorage.getItem("vislumbre_model") || "gemini-1.5-flash"
  );
  const [horasReativacao, setHorasReativacao] = useState(
    () => Number(localStorage.getItem("vislumbre_reactivation_hours")) || 24
  );
  const [promptIA, setPromptIA] = useState(
    () => localStorage.getItem("vislumbre_prompt_ia") || ""
  );
  const [promptDelivery, setPromptDelivery] = useState(
    () => localStorage.getItem("vislumbre_prompt_delivery") || ""
  );

  // UI
  const [showConfig, setShowConfig] = useState(false);
  const [idSelecionado, setIdSelecionado] = useState(null);
  const [novoTel, setNovoTel] = useState("");
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);

  // Carregar Dados
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
    const unsub = onSnapshot(
      query(collection(db, "servicos"), orderBy("ordem", "asc")),
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (lista.length === 0) {
          addDoc(collection(db, "servicos"), {
            nome: "Jingle",
            cor: "#3b82f6",
            ordem: 0,
          });
        } else {
          setServicos(lista);
        }
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem("vislumbre_google_key", apiKey);
    localStorage.setItem("vislumbre_model", modeloIA);
    localStorage.setItem("vislumbre_reactivation_hours", horasReativacao);
    localStorage.setItem("vislumbre_prompt_ia", promptIA);
    localStorage.setItem("vislumbre_prompt_delivery", promptDelivery);
  }, [apiKey, modeloIA, horasReativacao, promptIA, promptDelivery]);

  // Faxina 7 Dias
  useEffect(() => {
    const executarFaxina = async () => {
      if (!currentUser || currentUser.role !== "admin") return;
      const q = query(
        collection(db, "pedidos"),
        where("status", "==", "finalizados")
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (d) => {
        const data = d.data();
        if (
          data.tsSaida &&
          Date.now() - data.tsSaida > 604800000 &&
          data.audios?.length > 0
        ) {
          const p = data.audios.map((item) => {
            const url = typeof item === "string" ? item : item.url;
            return deleteObject(ref(storage, url)).catch(() => null);
          });
          await Promise.all(p);
          await updateDoc(doc(db, "pedidos", d.id), {
            audios: [],
            historicoAcoes: [
              {
                user: "Sistema",
                desc: "Faxina 7 dias",
                data: new Date().toLocaleString(),
              },
              ...(data.historicoAcoes || []),
            ],
          });
        }
      });
    };
    executarFaxina();
  }, [currentUser]);

  // --- FUNÇÕES AUXILIARES DE HISTÓRICO E TEMPO ---
  const getNovoHistorico = (p, d) => [
    {
      user: currentUser?.nome || "Sistema",
      desc: d,
      data: new Date().toLocaleString(),
    },
    ...(p.historicoAcoes || []),
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

  // --- COMPONENTE DE HISTÓRICO (Visual) ---
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

  // --- AÇÕES DO SISTEMA ---
  const handleUpload = async (fileList, campo, pedidoId) => {
    if (!fileList || fileList.length === 0) return;
    const pedido = pedidos.find((p) => p.id === pedidoId);
    try {
      const novosLinks = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const storageRef = ref(storage, `${campo}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        novosLinks.push({ name: file.name, url: url });
      }
      const listaAtual = Array.isArray(pedido[campo])
        ? pedido[campo]
        : pedido.comprovanteUrl
        ? [pedido.comprovanteUrl]
        : [];
      await updateDoc(doc(db, "pedidos", pedidoId), {
        [campo]: [...listaAtual, ...novosLinks],
        historicoAcoes: getNovoHistorico(pedido, `Add ${campo}`),
      });
    } catch (e) {
      alert("Erro upload: " + e.message);
    }
  };

  const handleDeleteFile = async (itemParaRemover, campo, pid) => {
    if (window.confirm("Excluir arquivo?")) {
      const urlRef =
        typeof itemParaRemover === "string"
          ? itemParaRemover
          : itemParaRemover.url;
      try {
        await deleteObject(ref(storage, urlRef)).catch(() => {});
      } catch (e) {}
      const pedido = pedidos.find((p) => p.id === pid);
      const listaAtual = pedido[campo] || [];
      const novaLista = listaAtual.filter((item) => {
        const urlItem = typeof item === "string" ? item : item.url;
        return urlItem !== urlRef;
      });
      await updateDoc(doc(db, "pedidos", pid), { [campo]: novaLista });
    }
  };

  const finalizarComWhats = async (p) => {
    const phone = p.telefone.replace(/\D/g, "");
    let msg = "Seu projeto está pronto.";
    if (apiKey) {
      setLoadingDelivery(true);
      try {
        const prompt = `${promptDelivery
          .replace(/{cliente}/g, p.cliente)
          .replace(/{servico}/g, p.servico)} Contexto: ${p.roteiro}`;
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modeloIA}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        const d = await res.json();
        if (d.candidates?.[0]?.content?.parts?.[0]?.text)
          msg = d.candidates[0].content.parts[0].text;
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDelivery(false);
      }
    }
    window.open(
      `https://web.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(
        msg
      )}`,
      "_blank"
    );
    moverPara(p.id, "finalizados");
  };

  const moverPara = async (id, status) => {
    const p = pedidos.find((x) => x.id === id);
    if (status === "producao" && p.status === "leads" && !p.roteiro)
      return alert("Roteiro obrigatório!");
    let up = {
      status,
      historicoAcoes: getNovoHistorico(p, `Moveu para ${status}`),
    };
    if (status === "producao") {
      up.tsProducao = Date.now();
      up.dataProducao = new Date().toLocaleString();
    }
    if (status === "finalizados") {
      up.tsSaida = Date.now();
      up.dataSaida = new Date().toLocaleString();
    }
    await updateDoc(doc(db, "pedidos", id), up);
    setIdSelecionado(null);
  };

  const adicionarLead = async () => {
    await addDoc(collection(db, "pedidos"), {
      cliente: "",
      telefone: novoTel,
      status: "leads",
      obs: "",
      servico: servicos[0]?.nome,
      valorRaw: "",
      comprovantes: [],
      audios: [],
      roteiro: "",
      tsEntrada: Date.now(),
      dataEntrada: new Date().toLocaleString(),
      historicoAcoes: [
        {
          user: currentUser.nome,
          desc: "Criou",
          data: new Date().toLocaleString(),
        },
      ],
    });
    setNovoTel("");
  };
  const atualizar = async (id, c, v) =>
    await updateDoc(doc(db, "pedidos", id), { [c]: v });

  const reativarLead = (e, p) => {
    e.stopPropagation();
    const phone = p.telefone.replace(/\D/g, "");
    window.open(
      `https://web.whatsapp.com/send?phone=55${phone}&text=Olá! Podemos retomar?`,
      "_blank"
    );
  };

  const gerarRoteiroIA = async (p) => {
    setLoadingIA(true);
    try {
      const prompt = promptIA
        .replace(/{cliente}/g, p.cliente)
        .replace(/{servico}/g, p.servico)
        .replace(/{obs}/g, p.obs);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modeloIA}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const d = await res.json();
      const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (txt) await updateDoc(doc(db, "pedidos", p.id), { roteiro: txt });
    } catch (e) {
      alert("Erro IA");
    } finally {
      setLoadingIA(false);
    }
  };

  const handleResetSystem = async () => {
    if (window.confirm("🚨 PERIGO: Apagar tudo?")) {
      const snap = await getDocs(collection(db, "pedidos"));
      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "pedidos", d.id)))
      );
      alert("Resetado.");
      window.location.reload();
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("vislumbre_user");
    setCurrentUser(null);
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;
  if (aba === "stats")
    return (
      <StatsPanel
        pedidos={pedidos}
        servicos={servicos}
        voltar={() => setAba("leads")}
      />
    );
  if (aba.startsWith("admin")) {
    if (aba === "admin_team")
      return <AdminTeamPanel voltar={() => setAba("leads")} />;
    if (aba === "admin_services")
      return (
        <AdminServicesPanel
          servicos={servicos}
          voltar={() => setAba("leads")}
        />
      );
    return (
      <AdminGeneralPanel
        apiKey={apiKey}
        setApiKey={setApiKey}
        horas={horasReativacao}
        setHoras={setHorasReativacao}
        promptIA={promptIA}
        setPromptIA={setPromptIA}
        promptDelivery={promptDelivery}
        setPromptDelivery={setPromptDelivery}
        voltar={() => setAba("leads")}
      />
    );
  }

  const listaFiltrada = pedidos.filter((p) => {
    if (aba === "leads") {
      if (p.status !== "leads" && p.status !== "pendentes") return false;
    } else {
      if (p.status !== aba) return false;
    }
    const txt = (p.cliente + p.telefone).toLowerCase();
    const dt = p.tsEntrada || 0;
    const ini = filtroDataInicio
      ? new Date(filtroDataInicio + "T00:00").getTime()
      : 0;
    const fim = filtroDataFim
      ? new Date(filtroDataFim + "T23:59").getTime()
      : Infinity;
    return txt.includes(termoBusca.toLowerCase()) && dt >= ini && dt <= fim;
  });

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Segoe UI, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* HEADER FIXO */}
      <header
        style={{
          padding: "15px 25px",
          background: "#1e293b",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
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
            <h2 style={{ margin: 0, fontSize: "20px" }}>Vislumbre</h2>
          </div>
          <span
            style={{
              fontSize: "11px",
              background: "#3b82f6",
              padding: "4px 10px",
              borderRadius: "20px",
              fontWeight: "600",
            }}
          >
            {currentUser.nome}
          </span>

          {/* CONFIG BUTTON + DROPDOWN FIXADO */}
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
                  color: "white",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "8px",
                  marginLeft: "10px",
                }}
              >
                ⚙️ Ajustes
              </button>
              {showConfig && (
                <div
                  style={{
                    position: "absolute",
                    top: "110%",
                    left: "0",
                    background: "white",
                    color: "#333",
                    width: "200px",
                    borderRadius: "8px",
                    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
                    zIndex: 100,
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() => setAba("admin_team")}
                    style={{
                      padding: "12px 15px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    👥 Equipe
                  </div>
                  <div
                    onClick={() => setAba("admin_services")}
                    style={{
                      padding: "12px 15px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    🛠️ Serviços
                  </div>
                  <div
                    onClick={() => setAba("admin_general")}
                    style={{
                      padding: "12px 15px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ⚙️ Definições
                  </div>
                  <div
                    onClick={() => setAba("stats")}
                    style={{
                      padding: "12px 15px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    📊 Estatísticas
                  </div>
                  <div
                    onClick={handleResetSystem}
                    style={{
                      padding: "12px 15px",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "13px",
                      background: "#fef2f2",
                      fontWeight: "bold",
                    }}
                  >
                    🗑️ Resetar Tudo
                  </div>
                </div>
              )}
            </div>
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
                background: aba === m.id ? "#fbbf24" : "rgba(255,255,255,0.1)",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                color: aba === m.id ? "#1e293b" : "#94a3b8",
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
              padding: "8px 16px",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* SIDEBAR */}
        <div
          style={{
            width: "350px",
            minWidth: "350px",
            borderRight: "1px solid #e2e8f0",
            background: "white",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
          }}
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
        </div>

        {/* DETAILS */}
        <div
          style={{
            flex: 1,
            background: "#f8fafc",
            overflowY: "auto",
            padding: "20px",
            position: "relative",
          }}
        >
          {idSelecionado && pedidos.find((p) => p.id === idSelecionado) ? (
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
                  {mapearStatus(
                    pedidos.find((p) => p.id === idSelecionado).status
                  )}
                </span>
              </div>

              <Details
                ativo={pedidos.find((p) => p.id === idSelecionado)}
                atualizarPedido={atualizar}
                moverPara={moverPara}
                finalizarComWhats={finalizarComWhats}
                gerarRoteiroIA={gerarRoteiroIA}
                loadingIA={loadingIA}
                loadingDelivery={loadingDelivery}
                handleUpload={handleUpload}
                handleDeleteFile={handleDeleteFile}
                servicos={servicos}
                currentUser={currentUser}
              />

              {/* --- ÁREA DE PERFORMANCE (RESTAURADA) --- */}
              {pedidos.find((p) => p.id === idSelecionado).status ===
                "finalizados" && (
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
                          pedidos.find((p) => p.id === idSelecionado).tsEntrada,
                          pedidos.find((p) => p.id === idSelecionado).tsProducao
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9a3412" }}>
                        Resp:{" "}
                        {getResponsavel(
                          pedidos.find((p) => p.id === idSelecionado)
                            .historicoAcoes,
                          "PRODUÇÃO"
                        )}
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
                          pedidos.find((p) => p.id === idSelecionado)
                            .tsProducao,
                          pedidos.find((p) => p.id === idSelecionado).tsSaida
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "#5b21b6" }}>
                        Resp:{" "}
                        {getResponsavel(
                          pedidos.find((p) => p.id === idSelecionado)
                            .historicoAcoes,
                          "FINALIZADO"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- HISTÓRICO (RESTAURADO) --- */}
              <HistoricoView
                historico={
                  pedidos.find((p) => p.id === idSelecionado).historicoAcoes
                }
              />
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                marginTop: "100px",
                color: "#94a3b8",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>👈</div>
              Selecione um pedido ao lado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
