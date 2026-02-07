import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

// --- PAINEL EQUIPE (Mantido) ---
export const AdminTeamPanel = ({ voltar }) => {
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
        <div className="grid-cards">
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
            />
          </div>
          <div className="input-group">
            <label className="input-label">Login de Acesso</label>
            <input
              className="modern-input"
              value={novoLogin}
              onChange={(e) => setNovoLogin(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Senha</label>
            <input
              className="modern-input"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
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

// --- PAINEL SERVIÇOS (Mantido com Drag & Drop) ---
export const AdminServicesPanel = ({ servicos, voltar }) => {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const [listaLocal, setListaLocal] = useState(servicos);
  const dragItem = useRef();
  const dragOverItem = useRef();
  useEffect(() => {
    setListaLocal(servicos);
  }, [servicos]);
  const adicionar = async () => {
    if (!nome) return alert("Digite o nome");
    await addDoc(collection(db, "servicos"), {
      nome,
      cor,
      ordem: listaLocal.length,
    });
    setNome("");
  };
  const remover = async (id) => {
    if (window.confirm("Remover serviço?"))
      await deleteDoc(doc(db, "servicos", id));
  };
  const handleSort = () => {
    let _lista = [...listaLocal];
    const draggedItemContent = _lista.splice(dragItem.current, 1)[0];
    _lista.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = dragOverItem.current;
    dragOverItem.current = null;
    setListaLocal(_lista);
  };
  const handleEnd = async () => {
    const promises = listaLocal.map((item, index) => {
      return updateDoc(doc(db, "servicos", item.id), { ordem: index });
    });
    await Promise.all(promises);
    dragItem.current = null;
    dragOverItem.current = null;
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
        <div
          className="card-panel"
          style={{
            marginBottom: "20px",
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "#64748b",
              textAlign: "center",
              margin: 0,
            }}
          >
            ↕️ <strong>Arraste os cards</strong> para reorganizar a prioridade.
            <br />O primeiro da lista será o serviço <strong>Padrão</strong>.
          </p>
        </div>
        <div
          className="grid-cards"
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          {listaLocal.map((s, index) => (
            <div
              key={s.id}
              className="item-card"
              style={{
                borderLeft: `5px solid ${s.cor}`,
                cursor: "grab",
                background: index === 0 ? "#eff6ff" : "white",
                border: index === 0 ? "1px solid #3b82f6" : "1px solid #e2e8f0",
              }}
              draggable
              onDragStart={(e) => {
                dragItem.current = index;
              }}
              onDragEnter={(e) => {
                dragOverItem.current = index;
                handleSort();
              }}
              onDragEnd={handleEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <div
                className="item-info"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: "20px", color: "#cbd5e1" }}>☰</span>
                <div>
                  <h4
                    className="item-title"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {s.nome}
                    {index === 0 && (
                      <span
                        style={{
                          background: "#3b82f6",
                          color: "white",
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          textTransform: "uppercase",
                        }}
                      >
                        Padrão
                      </span>
                    )}
                  </h4>
                  <p
                    className="item-subtitle"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
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
              </div>
              <button onClick={() => remover(s.id)} className="btn-icon-delete">
                ×
              </button>
            </div>
          ))}
        </div>
        <div
          className="card-panel"
          style={{ maxWidth: "500px", margin: "20px auto 0" }}
        >
          <div className="card-header">➕ Novo Serviço</div>
          <div className="input-group">
            <label className="input-label">Nome do Serviço</label>
            <input
              className="modern-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
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

// --- PAINEL GERAL (Atualizado com Prompt de Entrega) ---
export const AdminGeneralPanel = ({
  apiKey,
  setApiKey,
  horas,
  setHoras,
  promptIA,
  setPromptIA,
  promptDelivery,
  setPromptDelivery,
  voltar,
}) => {
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
          <div className="card-header">🤖 Configuração da IA (Gemini)</div>
          <div className="input-group">
            <label className="input-label">Google API Key</label>
            <input
              className="modern-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua chave (AIzaSy...)"
            />
          </div>

          {/* Prompt de Roteiro */}
          <div className="input-group" style={{ marginTop: "20px" }}>
            <label className="input-label">
              Prompt para <strong>Roteiros</strong>
            </label>
            <textarea
              className="modern-input"
              rows={4}
              value={promptIA}
              onChange={(e) => setPromptIA(e.target.value)}
              placeholder="Instruções para criar roteiros..."
              style={{ fontFamily: "monospace", fontSize: "13px" }}
            />
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
              Variáveis:{" "}
              <strong style={{ color: "#3b82f6" }}>{`{cliente}`}</strong>,{" "}
              <strong style={{ color: "#3b82f6" }}>{`{servico}`}</strong>,{" "}
              <strong style={{ color: "#3b82f6" }}>{`{obs}`}</strong>
            </p>
          </div>

          {/* Prompt de Entrega (NOVO) */}
          <div
            className="input-group"
            style={{
              marginTop: "20px",
              borderTop: "1px dashed #e2e8f0",
              paddingTop: "20px",
            }}
          >
            <label className="input-label">
              Prompt para <strong>Mensagem de Entrega (WhatsApp)</strong>
            </label>
            <textarea
              className="modern-input"
              rows={4}
              value={promptDelivery}
              onChange={(e) => setPromptDelivery(e.target.value)}
              placeholder="Ex: Escreva uma msg curta avisando {cliente} que..."
              style={{ fontFamily: "monospace", fontSize: "13px" }}
            />
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
              Variáveis:{" "}
              <strong style={{ color: "#3b82f6" }}>{`{cliente}`}</strong>,{" "}
              <strong style={{ color: "#3b82f6" }}>{`{servico}`}</strong>
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
          </div>
        </div>
      </div>
    </div>
  );
};
