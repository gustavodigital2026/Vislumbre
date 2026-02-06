import React from "react";
import "./styles.css"; // Garante que o CSS vai ser carregado

const formatarDataLista = (dataString) => {
  if (!dataString) return "";
  try {
    const partes = dataString.split(" ");
    return `${partes[0].substring(0, 5)} ${partes[1].substring(0, 5)}`;
  } catch (e) {
    return dataString;
  }
};

export default function Sidebar({
  aba,
  lista,
  idSelecionado,
  setIdSelecionado,
  novoTel,
  setNovoTel,
  adicionarLead,
  reativarLead,
  termoBusca,
  setTermoBusca,
  filtroDataInicio,
  setFiltroDataInicio,
  filtroDataFim,
  setFiltroDataFim,
  horasReativacao = 24,
}) {
  const verificarAtraso = (ts) => {
    if (!ts) return false;
    const horasSeguras = Number(horasReativacao) || 24;
    const limiteMs = horasSeguras * 60 * 60 * 1000;
    return Date.now() - ts > limiteMs;
  };

  return (
    <div className="sidebar-container">
      {/* CABEÇALHO COM FILTROS */}
      <div className="sidebar-header">
        <div className="input-group" style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="🔍 Buscar cliente..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="modern-input"
            style={{ padding: "8px" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "5px",
            alignItems: "center",
            fontSize: "11px",
          }}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "2px",
                color: "#64748b",
              }}
            >
              De:
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="modern-input"
              style={{ padding: "5px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "2px",
                color: "#64748b",
              }}
            >
              Até:
            </label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="modern-input"
              style={{ padding: "5px" }}
            />
          </div>
        </div>
      </div>

      {/* ÁREA DE NOVO LEAD */}
      {aba === "leads" && !termoBusca && (
        <div
          style={{
            padding: "15px",
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <label
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            Novo WhatsApp:
          </label>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              placeholder="(11) 99999-9999"
              type="tel"
              value={novoTel}
              onChange={(e) => setNovoTel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionarLead();
              }}
              className="modern-input"
              style={{ flex: 1 }}
            />
            <button
              onClick={adicionarLead}
              className="btn-primary"
              style={{
                width: "auto",
                padding: "0 15px",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
              }}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE PEDIDOS */}
      <div className="sidebar-list-area">
        {(!lista || lista.length === 0) && (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            Nenhum pedido encontrado.
          </div>
        )}

        {lista &&
          lista.map((p) => {
            const dataMostrada =
              aba === "finalizados" && p.dataSaida
                ? p.dataSaida
                : p.dataEntrada;
            const isLate = verificarAtraso(p.tsEntrada);

            return (
              <div
                key={p.id}
                onClick={() => setIdSelecionado(p.id)}
                className={`sidebar-card ${
                  idSelecionado === p.id ? "active" : ""
                }`}
              >
                <div className="sidebar-card-title">
                  {p.cliente ? p.cliente : p.telefone}
                </div>
                {p.cliente && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "8px",
                    }}
                  >
                    {p.telefone}
                  </div>
                )}

                <div className="sidebar-card-subtitle">
                  {aba !== "leads" ? (
                    <span className="status-badge">{p.servico}</span>
                  ) : isLate ? (
                    <button
                      onClick={(e) => reativarLead(e, p)}
                      style={{
                        background: "#fee2e2",
                        color: "#ef4444",
                        border: "none",
                        borderRadius: "20px",
                        padding: "4px 10px",
                        fontSize: "10px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      📢 Reativar
                    </button>
                  ) : (
                    <span
                      style={{
                        color: "#22c55e",
                        fontWeight: "bold",
                        fontSize: "11px",
                      }}
                    >
                      ✨ Novo
                    </span>
                  )}
                  <span style={{ fontSize: "11px" }}>
                    {formatarDataLista(dataMostrada)}
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
