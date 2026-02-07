import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const LoginScreen = ({ onLogin }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Busca o usuário no banco de dados pelo LOGIN
      const q = query(collection(db, "usuarios"), where("login", "==", user));
      const qs = await getDocs(q);

      if (!qs.empty) {
        const userData = qs.docs[0].data();

        // 2. Verifica se a senha bate
        if (userData.senha === pass) {
          const u = { ...userData, id: qs.docs[0].id };
          // Salva no navegador para não deslogar ao atualizar (opcional)
          localStorage.setItem("vislumbre_user", JSON.stringify(u));
          onLogin(u);
        } else {
          setError("Senha incorreta.");
        }
      } else {
        setError("Usuário não encontrado.");
      }
    } catch (e) {
      console.error(e);
      setError("Erro de conexão com o servidor.");
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
        fontFamily: "Segoe UI, sans-serif",
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
        {/* Logo */}
        <div
          style={{
            background: "white",
            padding: "10px",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 10px -2px rgba(0, 0, 0, 0.05)",
            display: "inline-block",
            marginBottom: "20px",
          }}
        >
          <img
            src="/logo.jpeg"
            alt="Vislumbre"
            style={{ maxWidth: "120px", borderRadius: "8px", display: "block" }}
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

        <div style={{ marginBottom: "15px", textAlign: "left" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
              fontWeight: "600",
            }}
          >
            USUÁRIO
          </label>
          <input
            className="modern-input"
            placeholder="Digite seu login..."
            value={user}
            onKeyDown={handleKeyDown}
            onChange={(e) => setUser(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: "25px", textAlign: "left" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "5px",
              fontWeight: "600",
            }}
          >
            SENHA
          </label>
          <input
            className="modern-input"
            type="password"
            placeholder="••••••"
            value={pass}
            onKeyDown={handleKeyDown}
            onChange={(e) => setPass(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              outline: "none",
            }}
          />
        </div>

        {error && (
          <div
            style={{
              color: "#b91c1c",
              fontSize: "13px",
              marginBottom: "20px",
              background: "#fef2f2",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            background: "#0f172a",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: loading ? "wait" : "pointer",
            fontWeight: "600",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Verificando..." : "Entrar no Sistema"}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
