import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
} from "firebase/firestore";
import { db } from "../firebase"; // Atenção: "../firebase" volta uma pasta para achar o arquivo

// --- PAINEL EQUIPE ---
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

// --- PAINEL SERVIÇOS ---
export const AdminServicesPanel = ({ servicos, voltar }) => {
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
        <div className="grid-cards">
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

// --- PAINEL GERAL ---
export const AdminGeneralPanel = ({
  apiKey,
  setApiKey,
  horas,
  setHoras,
  promptIA,
  setPromptIA,
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
          <div className="input-group" style={{ marginTop: "20px" }}>
            <label className="input-label">
              Prompt Padrão (Instruções para a IA)
            </label>
            <textarea
              className="modern-input"
              rows={6}
              value={promptIA}
              onChange={(e) => setPromptIA(e.target.value)}
              placeholder="Ex: Crie uma letra de música..."
              style={{ fontFamily: "monospace", fontSize: "13px" }}
            />
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginTop: "8px",
                lineHeight: "1.5",
              }}
            >
              Variáveis:{" "}
              <strong style={{ color: "#3b82f6" }}>{`{cliente}`}</strong>,{" "}
              <strong style={{ color: "#3b82f6" }}>{`{servico}`}</strong>,{" "}
              <strong style={{ color: "#3b82f6" }}>{`{obs}`}</strong>
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
