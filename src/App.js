import React, { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc, getDocs, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"; 
import { db, storage } from "./firebase";
import Sidebar from "./Sidebar";
import Details from "./Details";
import LoginScreen from "./components/LoginScreen";
import StatsPanel from "./components/StatsPanel";
import { AdminTeamPanel, AdminServicesPanel, AdminGeneralPanel } from "./components/AdminPanels";
import { normalizar, mapearStatus, formatarDuracaoHoras } from "./utils";
import "./styles.css";

// --- APP PRINCIPAL ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => { const saved = localStorage.getItem("vislumbre_user"); return saved ? JSON.parse(saved) : null; });
  const [aba, setAba] = useState("leads");
  const [pedidos, setPedidos] = useState([]);
  const [servicos, setServicos] = useState([]);
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("vislumbre_google_key") || "");
  const [modeloIA, setModeloIA] = useState(() => localStorage.getItem("vislumbre_model") || "gemini-1.5-flash");
  const [horasReativacao, setHorasReativacao] = useState(() => Number(localStorage.getItem("vislumbre_reactivation_hours")) || 24);
  const [promptIA, setPromptIA] = useState(() => localStorage.getItem("vislumbre_prompt_ia") || "Crie um roteiro criativo para um serviço de {servico}. O nome do cliente é {cliente}. Detalhes importantes: {obs}.");

  const [showConfig, setShowConfig] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [idSelecionado, setIdSelecionado] = useState(null);
  const [novoTel, setNovoTel] = useState("");
  const [termoBusca, setTermoBusca] = useState(""); 
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  // PEDIDOS: Ordenados por data
  useEffect(() => { const unsub = onSnapshot(query(collection(db, "pedidos"), orderBy("tsEntrada", "desc")), (snap) => setPedidos(snap.docs.map(d => ({ id: d.id, ...d.data(), historicoAcoes: d.data().historicoAcoes || [] })))); return () => unsub(); }, []);
  
  // SERVIÇOS: Ordenados pela ordem definida no Admin
  useEffect(() => { 
      const unsub = onSnapshot(query(collection(db, "servicos"), orderBy("ordem", "asc")), (snap) => { 
          const lista = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
          // Se não existir, cria padrões
          if(lista.length === 0){ 
              addDoc(collection(db, "servicos"), { nome: "Jingle", cor: "#f59e0b", ordem: 0 }); 
              addDoc(collection(db, "servicos"), { nome: "Vídeo", cor: "#3b82f6", ordem: 1 }); 
          } else {
              setServicos(lista); 
          }
      }); 
      return () => unsub(); 
  }, []);
  
  useEffect(() => { 
      localStorage.setItem("vislumbre_google_key", apiKey); 
      localStorage.setItem("vislumbre_model", modeloIA); 
      localStorage.setItem("vislumbre_reactivation_hours", horasReativacao);
      localStorage.setItem("vislumbre_prompt_ia", promptIA);
  }, [apiKey, modeloIA, horasReativacao, promptIA]);

  const handleLogout = () => { localStorage.removeItem("vislumbre_user"); setCurrentUser(null); };
  
  const getNovoHistorico = (pedido, desc) => [{ user: currentUser?.nome || "Sistema", desc, data: new Date().toLocaleString(), timestamp: Date.now() }, ...(pedido.historicoAcoes || [])];
  const getResponsavel = (historico, palavraChave) => { const acao = historico?.find(h => h.desc.toUpperCase().includes(palavraChave.toUpperCase())); return acao ? acao.user : "Sistema"; };
  const calcularDuracao = (inicio, fim) => { if (!inicio || !fim) return "-"; return formatarDuracaoHoras(fim - inicio); };

  const adicionarLead = async () => {
    try { 
        const docRef = await addDoc(collection(db, "pedidos"), { 
            cliente: "", 
            telefone: novoTel || "", 
            status: "leads", 
            obs: "", 
            // Pega o PRIMEIRO serviço da lista ordenada (que é o padrão)
            servico: servicos.length > 0 ? servicos[0].nome : "Outros", 
            valorRaw: "", 
            comprovanteUrl: null, 
            audios: [], 
            roteiro: "", 
            tsEntrada: Date.now(), 
            dataEntrada: new Date().toLocaleString(), 
            historicoAcoes: [{ user: currentUser.nome, desc: "Criou o Lead", data: new Date().toLocaleString(), timestamp: Date.now() }] 
        }); 
        setNovoTel(""); 
        setIdSelecionado(docRef.id); 
    } catch (e) { alert("Erro: " + e.message); }
  };
  
  const atualizarPedido = async (id, campo, valor) => await updateDoc(doc(db, "pedidos", id), { [campo]: valor });
  
  const moverPara = async (id, novoStatus) => {
    const pedido = pedidos.find(p => p.id === id);
    if (novoStatus === "producao" && pedido.status === "leads" && !pedido.roteiro) return alert("Roteiro obrigatório!");
    const now = Date.now(); 
    const acaoDesc = ((pedido.status === "finalizados" && novoStatus === "producao") || (pedido.status === "producao" && novoStatus === "leads")) ? `Retornou para ${mapearStatus(novoStatus).toUpperCase()}` : `Moveu para ${mapearStatus(novoStatus).toUpperCase()}`;
    let updates = { 
        status: novoStatus, 
        tsProducao: (novoStatus === "producao" ? now : (pedido.tsProducao || null)), 
        tsSaida: (novoStatus === "finalizados" ? now : (pedido.tsSaida || null)),
        historicoAcoes: getNovoHistorico(pedido, acaoDesc) 
    };
    if (novoStatus === "producao") { updates.dataProducao = new Date().toLocaleString(); updates.tsVenda = now; }
    if (novoStatus === "finalizados") { updates.dataSaida = new Date().toLocaleString(); }
    await updateDoc(doc(db, "pedidos", id), updates); setIdSelecionado(null);
  };
  
  const handleProofDrop = async (e, id) => { e.preventDefault(); e.stopPropagation(); const file = e.dataTransfer.files[0]; if (file) { try { const storageRef = ref(storage, `comprovantes/${Date.now()}_${file.name}`); await uploadBytes(storageRef, file); const url = await getDownloadURL(storageRef); const pedido = pedidos.find(p => p.id === id); await updateDoc(doc(db, "pedidos", id), { comprovanteUrl: url, historicoAcoes: getNovoHistorico(pedido, "Enviou Comprovante") }); } catch(err) { alert("Erro: " + err.message); } } };
  const handleAudioUpload = async (e, id) => { const file = e.target.files[0]; if (file) { const btn = e.target.nextSibling; if(btn) btn.innerText = "⏳ Enviando..."; try { const storageRef = ref(storage, `audios/${Date.now()}_${file.name}`); await uploadBytes(storageRef, file); const url = await getDownloadURL(storageRef); const pedido = pedidos.find(p => p.id === id); await updateDoc(doc(db, "pedidos", id), { audios: [...(pedido.audios || []), url], historicoAcoes: getNovoHistorico(pedido, "Anexou Áudio (Nuvem)") }); } catch (err) { alert("Erro no upload: " + err.message); } finally { if(btn) btn.innerText = "← Adicionar áudio"; } } e.target.value = null; };
  const finalizarComWhats = (p) => { const phone = p.telefone.replace(/\D/g, ""); window.open(`https://web.whatsapp.com/send?phone=55${phone}&text=Seu projeto está pronto.`, "_blank"); moverPara(p.id, "finalizados"); };
  const reativarLead = (e, p) => { e.stopPropagation(); const phone = p.telefone.replace(/\D/g, ""); window.open(`https://web.whatsapp.com/send?phone=55${phone}&text=Olá! Podemos retomar?`, "_blank"); };
  
  const gerarRoteiroIA = async (p) => { 
      if (!apiKey) return alert("Configure a API Key em Definições Gerais!"); 
      setLoadingIA(true); 
      const promptFinal = promptIA.replace(/{cliente}/g, p.cliente || "Cliente").replace(/{servico}/g, p.servico || "Serviço").replace(/{obs}/g, p.obs || "Sem observações");
      try { 
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modeloIA}:generateContent?key=${apiKey.trim()}`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ contents: [{ parts: [{ text: promptFinal }] }] }) }); 
          const d = await res.json(); 
          const txt = d.candidates?.[0]?.content?.parts?.[0]?.text; 
          if(txt) await updateDoc(doc(db, "pedidos", p.id), { roteiro: txt, historicoAcoes: getNovoHistorico(p, "Gerou Roteiro com IA") }); 
      } catch(e) { alert("Erro IA"); } finally { setLoadingIA(false); } 
  };
  
  const handleResetSystem = async () => { if (window.confirm("🚨 PERIGO: Isso vai apagar TODOS os pedidos do sistema!\n\nTem certeza?") && window.confirm("Última chance: Essa ação é irreversível.")) { const snap = await getDocs(collection(db, "pedidos")); await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "pedidos", d.id)))); alert("Sistema resetado."); window.location.reload(); } };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;
  if (aba === "admin_team") return <AdminTeamPanel voltar={() => setAba("leads")} />;
  if (aba === "admin_services") return <AdminServicesPanel servicos={servicos} voltar={() => setAba("leads")} />;
  if (aba === "admin_general") return ( <AdminGeneralPanel apiKey={apiKey} setApiKey={setApiKey} horas={horasReativacao} setHoras={setHorasReativacao} promptIA={promptIA} setPromptIA={setPromptIA} voltar={() => setAba("leads")} /> );
  if (aba === "stats") return <StatsPanel pedidos={pedidos} servicos={servicos} voltar={() => setAba("leads")} />;

  const filterStart = filtroDataInicio ? new Date(filtroDataInicio + "T00:00:00").getTime() : 0;
  const filterEnd = filtroDataFim ? new Date(filtroDataFim + "T23:59:59.999").getTime() : Infinity;

  const listaFiltrada = pedidos.filter(p => {
      if (aba === "leads") { if (p.status !== "leads" && p.status !== "pendentes") return false; } else { if (p.status !== aba) return false; }
      const matchTexto = (p.cliente && p.cliente.toLowerCase().includes(termoBusca.toLowerCase())) || (p.telefone && p.telefone.includes(termoBusca));
      const pData = p.tsEntrada || 0; 
      return matchTexto && (pData >= filterStart && pData <= filterEnd);
  });

  const pedidoAtivo = pedidos.find(p => p.id === idSelecionado);
  const HistoricoView = ({ historico }) => ( <div style={{marginTop: "30px", borderTop: "2px solid #e2e8f0", paddingTop: "20px"}}><h4 style={{margin: "0 0 10px 0", color: "#64748b"}}>📜 Histórico de Atividades</h4><div style={{background: "#f9f9f9", padding: "10px", borderRadius: "6px", maxHeight: "150px", overflowY: "auto", border: "1px solid #e2e8f0"}}>{(!historico || historico.length === 0) && <span style={{fontSize:"12px", color:"#94a3b8"}}>Nenhuma atividade registrada.</span>}{historico && historico.map((h, i) => (<div key={i} style={{fontSize: "12px", marginBottom: "8px", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px"}}><span style={{fontWeight: "bold", color: "#1e293b"}}>{h.user}</span> <span style={{color: "#64748b"}}> - {h.data}</span><div style={{color: "#334155", marginTop: "2px"}}>{h.desc}</div></div>))}</div></div> );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "Segoe UI, sans-serif" }} onClick={() => setShowConfig(false)}>
      <header style={{ padding: "15px 25px", background: "#1e293b", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <div style={{display:"flex", gap:"15px", alignItems:"center"}}>
            <div style={{display:"flex", alignItems:"center"}}>
                <img src="/logo.jpeg" alt="Logo" style={{height:"40px", borderRadius:"4px", marginRight:"10px"}} />
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>Vislumbre</h2>
            </div>
            <span style={{fontSize: "11px", background: "#3b82f6", color: "white", padding: "4px 10px", borderRadius: "20px", fontWeight:"600", textTransform: "uppercase", letterSpacing: "0.5px"}}>{currentUser.nome}</span>
            {currentUser.role === "admin" && (<div style={{position: "relative"}}><button onClick={(e) => { e.stopPropagation(); setShowConfig(!showConfig); }} style={{background:"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", fontSize:"16px", marginLeft:"10px", padding: "8px", borderRadius: "8px", transition: "0.2s"}}>⚙️ Ajustes</button>{showConfig && (<div style={{ position: "absolute", top: "45px", left: "0", background: "white", color: "#333", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", borderRadius: "10px", overflow: "hidden", zIndex: 100, width: "200px", border: "1px solid #e2e8f0" }}><div onClick={() => setAba("admin_team")} style={{padding: "12px 15px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px"}}>👥 Equipe</div><div onClick={() => setAba("admin_services")} style={{padding: "12px 15px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px"}}>🛠️ Serviços</div><div onClick={() => setAba("stats")} style={{padding: "12px 15px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "14px", display: "flex", alignItems: "center", gap: "10px"}}>📊 Estatísticas</div><div onClick={() => setAba("admin_general")} style={{padding: "12px 15px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "14px", fontWeight: "600", color: "#3b82f6", display: "flex", alignItems: "center", gap: "10px"}}>⚙️ Definições Gerais</div><div onClick={handleResetSystem} style={{padding: "12px 15px", cursor: "pointer", color: "#ef4444", fontSize: "13px", background: "#fef2f2", fontWeight: "600"}}>🗑️ Resetar Tudo</div></div>)}</div>)}
            {currentUser.role !== "admin" && currentUser.acessoStats && (<button onClick={()=>setAba("stats")} style={{background:"#8b5cf6", border:"none", color:"white", cursor:"pointer", marginLeft:"10px", borderRadius:"6px", padding:"6px 12px", fontSize:"13px", fontWeight:"600"}}>📊 Stats</button>)}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
           {[{id:"leads", l:"Leads & Criação"}, {id:"producao", l:"Produção"}, {id:"finalizados", l:"Entregues"}].map(m => (<button key={m.id} onClick={() => { setAba(m.id); setIdSelecionado(null); }} style={{ background: aba === m.id ? "#fbbf24" : "rgba(255,255,255,0.1)", color: aba === m.id ? "#1e293b" : "#94a3b8", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px", transition: "0.2s" }}>{m.l}</button>))}
           <button onClick={handleLogout} style={{background: "#ef4444", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", padding: "8px 16px", fontWeight: "600", fontSize: "13px"}}>Sair</button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar aba={aba} lista={listaFiltrada} idSelecionado={idSelecionado} setIdSelecionado={setIdSelecionado} novoTel={novoTel} setNovoTel={setNovoTel} adicionarLead={adicionarLead} reativarLead={reativarLead} termoBusca={termoBusca} setTermoBusca={setTermoBusca} filtroDataInicio={filtroDataInicio} setFiltroDataInicio={setFiltroDataInicio} filtroDataFim={filtroDataFim} setFiltroDataFim={setFiltroDataFim} horasReativacao={horasReativacao} />
        <div style={{flex: 1, padding: "20px", overflowY: "auto", background: "#f8fafc"}}>
            {pedidoAtivo ? (
                <div style={{maxWidth: "900px", margin: "0 auto"}}>
                    <div style={{marginBottom: "20px", textAlign: "right"}}><span style={{background:"#cbd5e1", color:"#334155", padding:"6px 12px", borderRadius:"20px", fontSize:"12px", fontWeight:"600", textTransform: "uppercase"}}>{mapearStatus(pedidoAtivo.status)}</span></div>
                    <Details ativo={pedidoAtivo} atualizarPedido={atualizarPedido} moverPara={moverPara} finalizarComWhats={finalizarComWhats} gerarRoteiroIA={gerarRoteiroIA} loadingIA={loadingIA} handleAudioUpload={handleAudioUpload} handleDrop={handleProofDrop} servicos={servicos} currentUser={currentUser} />
                    {pedidoAtivo.status === "finalizados" && (
                        <div style={{marginTop: "30px", padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"}}>
                            <h3 style={{margin: "0 0 15px 0", color: "#1e293b", fontSize: "16px"}}>⏱️ Performance deste Pedido</h3>
                            <div style={{display:"grid", gridTemplateColumns: "1fr 1fr", gap: "20px"}}>
                                <div style={{padding:"15px", background:"#fff7ed", borderRadius:"8px", border:"1px solid #ffedd5"}}><div style={{fontSize:"11px", color:"#9a3412", fontWeight:"bold", textTransform:"uppercase"}}>Fase de Negociação</div><div style={{fontSize:"18px", color:"#c2410c", fontWeight:"800"}}>{calcularDuracao(pedidoAtivo.tsEntrada, pedidoAtivo.tsProducao)}</div><div style={{fontSize:"12px", color:"#9a3412"}}>Resp: {getResponsavel(pedidoAtivo.historicoAcoes, "PRODUÇÃO")}</div></div>
                                <div style={{padding:"15px", background:"#f5f3ff", borderRadius:"8px", border:"1px solid #ede9fe"}}><div style={{fontSize:"11px", color:"#5b21b6", fontWeight:"bold", textTransform:"uppercase"}}>Fase de Produção</div><div style={{fontSize:"18px", color:"#6d28d9", fontWeight:"800"}}>{calcularDuracao(pedidoAtivo.tsProducao, pedidoAtivo.tsSaida)}</div><div style={{fontSize:"12px", color:"#5b21b6"}}>Resp: {getResponsavel(pedidoAtivo.historicoAcoes, "FINALIZADO")}</div></div>
                            </div>
                        </div>
                    )}
                    <HistoricoView historico={pedidoAtivo.historicoAcoes} />
                </div>
            ) : <div style={{textAlign:"center", color:"#94a3b8", marginTop:"100px", display:"flex", flexDirection:"column", alignItems:"center"}}><div style={{fontSize:"40px", marginBottom:"10px"}}>👈</div>Selecione um pedido ao lado para começar</div>}
        </div>
      </div>
    </div>
  );
}