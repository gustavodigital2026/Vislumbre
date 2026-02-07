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
import { db } from "../firebase";

// --- PAINEL EQUIPE ---
export const AdminTeamPanel = ({ voltar }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoLogin, setNovoLogin] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    const u = onSnapshot(query(collection(db, "usuarios")), (s) =>
      setUsuarios(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => u();
  }, []);

  const adicionar = async () => {
    if (!novoNome || !novoLogin || !novaSenha) return alert("Preencha tudo");
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
  const remover = async (id) => {
    if (window.confirm("Remover?")) await deleteDoc(doc(db, "usuarios", id));
  };
  const alterarSenha = async (u) => {
    const n = prompt(`Nova senha para ${u.nome}:`, u.senha);
    if (n && n !== u.senha)
      await updateDoc(doc(db, "usuarios", u.id), { senha: n });
  };
  const toggleStats = async (id, s) => {
    await updateDoc(doc(db, "usuarios", id), { acessoStats: !s });
  };

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header">
          <h2 className="admin-title">👥 Equipe</h2>
          <button onClick={voltar} className="btn-back">
            Voltar
          </button>
        </div>
        <div className="grid-cards">
          {usuarios.map((u) => (
            <div key={u.id} className="item-card">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="user-avatar">
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div className="item-info">
                  <h4 className="item-title">{u.nome}</h4>
                  <p className="item-subtitle">Login: {u.login}</p>
                  <p
                    className="item-subtitle"
                    style={{
                      color: "#3b82f6",
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
                    Acesso Stats
                  </label>
                </div>
              </div>
              <button onClick={() => remover(u.id)} className="btn-icon-delete">
                ×
              </button>
            </div>
          ))}
        </div>
        <div
          className="card-panel"
          style={{ maxWidth: "500px", margin: "20px auto" }}
        >
          <div className="card-header">Novo Membro</div>
          <div className="input-group">
            <label className="input-label">Nome</label>
            <input
              className="modern-input"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Login</label>
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
          <button onClick={adicionar} className="btn-primary">
            Cadastrar
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
    if (!nome) return alert("Nome?");
    await addDoc(collection(db, "servicos"), { nome, cor });
    setNome("");
  };
  const remover = async (id) => {
    if (window.confirm("Remover?")) await deleteDoc(doc(db, "servicos", id));
  };

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header">
          <h2 className="admin-title">🛠️ Serviços</h2>
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
              </div>
              <button onClick={() => remover(s.id)} className="btn-icon-delete">
                ×
              </button>
            </div>
          ))}
        </div>
        <div
          className="card-panel"
          style={{ maxWidth: "500px", margin: "20px auto" }}
        >
          <div className="card-header">Novo Serviço</div>
          <div className="input-group">
            <label className="input-label">Nome</label>
            <input
              className="modern-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Cor</label>
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
          <button onClick={adicionar} className="btn-primary">
            Salvar
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
  voltar,
}) => (
  <div className="admin-container">
    <div className="admin-wrapper">
      <div className="admin-header">
        <h2 className="admin-title">⚙️ Definições</h2>
        <button onClick={voltar} className="btn-back">
          Voltar
        </button>
      </div>
      <div className="card-panel">
        <div className="card-header">🤖 IA (Gemini)</div>
        <div className="input-group">
          <label className="input-label">API Key</label>
          <input
            className="modern-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </div>
      <div className="card-panel">
        <div className="card-header">⏰ Automação</div>
        <div className="input-group">
          <label className="input-label">Horas Reativar</label>
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
