import React from "react";
import { formatarDuracaoHoras, normalizar } from "./utils";

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
  horasReativacao,
  usuariosOnline,
  currentUser,
}) {
  // Função para checar quem está vendo o card
  const getVisualizadores = (itemId) => {
    if (!usuariosOnline) return [];
    return usuariosOnline.filter(
      (u) => u.focandoEm === itemId && u.login !== currentUser?.login
    );
  };

  return (
    <div
      style={{
        width: "350px",
        background: "white",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* HEADER DA BUSCA */}
      <div style={{ padding: "15px", borderBottom: "1px solid #f1f5f9" }}>
        <input
          className="modern-input"
          placeholder="🔍 Buscar cliente ou telefone..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          style={{ marginBottom: "10px" }}
        />

        {/* Filtro de Datas */}
        <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
          <input
            type="date"
            className="modern-input"
            style={{ padding: "5px", fontSize: "11px" }}
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
          />
          <input
            type="date"
            className="modern-input"
            style={{ padding: "5px", fontSize: "11px" }}
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
          />
        </div>

        {/* Botão de Novo Lead */}
        {aba === "leads" && (
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              className="modern-input"
              placeholder="Novo Telefone (Whatsapp)"
              value={novoTel}
              onChange={(e) => setNovoTel(e.target.value)}
            />
            <button
              onClick={adicionarLead}
              className="btn-primary"
              style={{ padding: "0 15px", fontSize: "20px" }}
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* LISTA DE CARDS */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
        {lista.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#94a3b8",
              marginTop: "20px",
              fontSize: "13px",
            }}
          >
            Nenhum pedido encontrado.
          </div>
        )}

        {lista.map((item) => {
          // Verifica reativação
          const tempoParado = Date.now() - (item.tsEntrada || 0);
          const precisaReativar =
            aba === "leads" && tempoParado > horasReativacao * 60 * 60 * 1000;

          // Verifica visualizadores (PRESENÇA)
          const viewers = getVisualizadores(item.id);
          const isBeingViewed = viewers.length > 0;

          return (
            <div
              key={item.id}
              onClick={() => setIdSelecionado(item.id)}
              className="item-card"
              style={{
                borderLeft: `4px solid ${
                  idSelecionado === item.id ? "#3b82f6" : "transparent"
                }`,
                background: idSelecionado === item.id ? "#eff6ff" : "white",
                position: "relative", // Necessário para a bolinha
              }}
            >
              {/* BOLINHA DE PRESENÇA */}
              {isBeingViewed && (
                <>
                  <div
                    className="user-presence-dot"
                    title={`Sendo visto por: ${viewers
                      .map((v) => v.nome)
                      .join(", ")}`}
                  ></div>
                  <div className="presence-tooltip">
                    👁️ {viewers[0].nome}{" "}
                    {viewers.length > 1 ? `+${viewers.length - 1}` : ""}
                  </div>
                </>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <strong style={{ color: "#1e293b", fontSize: "14px" }}>
                  {item.cliente || "Sem Nome"}
                </strong>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {item.dataEntrada?.split(" ")[0]}
                </span>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginBottom: "5px",
                }}
              >
                {item.servico} - {item.telefone}
              </div>

              {/* Botão de Reativar (Só leads antigos) */}
              {precisaReativar && (
                <div
                  onClick={(e) => reativarLead(e, item)}
                  style={{
                    marginTop: "8px",
                    background: "#fee2e2",
                    color: "#ef4444",
                    fontSize: "11px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    display: "inline-block",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: "1px solid #fecaca",
                  }}
                >
                  ⏰ Reativar Contato
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
