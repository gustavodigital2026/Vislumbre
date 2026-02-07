import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Importante: volta uma pasta (../)

const LoginScreen = ({ onLogin }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // Admin de emergência
    if (user === "admin" && pass === "1234") {
      const u = {
        nome: "Admin Provisorio",
        login: "admin",
        role: "admin",
        acessoStats: true,
      };
      localStorage.setItem("vislumbre_user", JSON.stringify(u));
      onLogin(u);
      return;
    }

    try {
      const q = query(
        collection(db, "usuarios"),
        where("login", "==", user),
        where("senha", "==", pass)
      );
      const qs = await getDocs(q);

      if (!qs.empty) {
        const u = { ...qs.docs[0].data(), id: qs.docs[0].id };
        localStorage.setItem("vislumbre_user", JSON.stringify(u));
        onLogin(u);
      } else {
        setError("Dados incorretos.");
      }
    } catch (e) {
      setError("Erro de conexão.");
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

export default LoginScreen;
