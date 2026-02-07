import React, { useRef } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { maskCurrency } from "./utils";

// Recebendo loadingDelivery
export default function Details({
  ativo,
  atualizarPedido,
  moverPara,
  finalizarComWhats,
  gerarRoteiroIA,
  loadingIA,
  loadingDelivery,
  handleAudioUpload,
  handleDrop,
  servicos,
}) {
  const fileInputRef = useRef(null);

  const isLeads = ativo.status === "leads";

  const deletarAudio = async (urlParaRemover) => {
    if (!isLeads) return alert("Exclusão permitida apenas na etapa de Leads.");
    if (window.confirm("Excluir este áudio?")) {
      const novaLista = ativo.audios.filter((url) => url !== urlParaRemover);
      await updateDoc(doc(db, "pedidos", ativo.id), { audios: novaLista });
    }
  };

  const removerComprovante = async () => {
    if (!isLeads) return alert("Exclusão permitida apenas na etapa de Leads.");
    if (window.confirm("Remover comprovante?")) {
      await updateDoc(doc(db, "pedidos", ativo.id), { comprovanteUrl: null });
    }
  };

  return (
    <div
      style={{
        background: "white",
        padding: "25px",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* CABEÇALHO */}
      <div style={{ marginBottom: "20px" }}>
        <label className="input-label">Nome do Cliente</label>
        <input
          className="modern-input"
          value={ativo.cliente}
          onChange={(e) => atualizarPedido(ativo.id, "cliente", e.target.value)}
          placeholder="Nome do Cliente"
          style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b" }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            marginTop: "15px",
          }}
        >
          <div>
            <label className="input-label">WhatsApp</label>
            <input
              className="modern-input"
              value={ativo.telefone}
              onChange={(e) =>
                atualizarPedido(ativo.id, "telefone", e.target.value)
              }
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="input-label">Serviço</label>
            <select
              className="modern-input"
              value={ativo.servico}
              onChange={(e) =>
                atualizarPedido(ativo.id, "servico", e.target.value)
              }
            >
              {servicos.map((s) => (
                <option key={s.id} value={s.nome}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <hr
        style={{
          border: "0",
          borderTop: "1px solid #f1f5f9",
          margin: "20px 0",
        }}
      />

      {/* VALOR E COMPROVANTE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div>
          <label className="input-label">💰 Valor (Apenas Leads)</label>
          <input
            className="modern-input"
            value={ativo.valorRaw || ""}
            onChange={(e) =>
              atualizarPedido(
                ativo.id,
                "valorRaw",
                maskCurrency(e.target.value)
              )
            }
            placeholder="R$ 0,00"
            disabled={!isLeads}
            style={{
              background: isLeads ? "white" : "#f1f5f9",
              cursor: isLeads ? "text" : "not-allowed",
            }}
          />
        </div>

        <div>
          <label className="input-label">Comprovante (PDF/Img)</label>
          <div
            onDragOver={(e) => isLeads && e.preventDefault()}
            onDrop={(e) => isLeads && handleDrop(e, ativo.id)}
            onClick={() =>
              isLeads && document.getElementById("proof-upload").click()
            }
            style={{
              border: isLeads ? "2px dashed #cbd5e1" : "1px solid #e2e8f0",
              borderRadius: "8px",
              height: "45px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isLeads ? "pointer" : "default",
              background: ativo.comprovanteUrl
                ? "#f0fdf4"
                : isLeads
                ? "white"
                : "#f8fafc",
              fontSize: "13px",
              color: "#64748b",
              position: "relative",
            }}
          >
            <input
              type="file"
              id="proof-upload"
              style={{ display: "none" }}
              accept="image/*,.pdf"
              onChange={(e) => {
                const dt = new DataTransfer();
                dt.items.add(e.target.files[0]);
                handleDrop(
                  {
                    preventDefault: () => {},
                    stopPropagation: () => {},
                    dataTransfer: dt,
                  },
                  ativo.id
                );
              }}
              disabled={!isLeads}
            />

            {ativo.comprovanteUrl ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <a
                  href={ativo.comprovanteUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#166534",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  ✅ Ver Arquivo
                </a>
                {isLeads && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removerComprovante();
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <span>
                {isLeads ? "📄 Arraste PDF ou Imagem" : "🚫 Nenhum comprovante"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ROTEIRO (MUDANÇA DE NOME) */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          {/* Alterado conforme pedido */}
          <label className="input-label" style={{ margin: 0 }}>
            🎵 Roteiro / Letra
          </label>
          {isLeads && (
            <button
              onClick={() => gerarRoteiroIA(ativo)}
              disabled={loadingIA}
              style={{
                background: "none",
                color: "#2563eb",
                border: "none",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {loadingIA ? "Gerando..." : "Usar IA"}
            </button>
          )}
        </div>
        <textarea
          className="modern-input"
          rows={5}
          value={ativo.roteiro || ""}
          onChange={(e) => atualizarPedido(ativo.id, "roteiro", e.target.value)}
          placeholder="Cole o roteiro ou letra aqui..."
          disabled={!isLeads}
          style={{ background: isLeads ? "white" : "#f1f5f9" }}
        />
        <input
          className="modern-input"
          style={{
            marginTop: "10px",
            background: isLeads ? "white" : "#f1f5f9",
          }}
          value={ativo.obs || ""}
          onChange={(e) => atualizarPedido(ativo.id, "obs", e.target.value)}
          placeholder="Observações internas"
          disabled={!isLeads}
        />
      </div>

      {/* ÁUDIOS */}
      <div style={{ marginBottom: "25px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <label className="input-label" style={{ margin: 0 }}>
            🎙️ Arquivos do Projeto
          </label>

          {isLeads && (
            <button
              onClick={() => fileInputRef.current.click()}
              style={{
                background: "#eff6ff",
                color: "#3b82f6",
                border: "1px solid #bfdbfe",
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              + Anexar Áudio
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => handleAudioUpload(e, ativo.id)}
            accept="audio/*,video/*"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ativo.audios &&
            ativo.audios.map((url, i) => (
              <div
                key={i}
                style={{
                  background: "#f8fafc",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#334155",
                      fontWeight: "bold",
                    }}
                  >
                    Arquivo {i + 1}
                  </span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <a
                      href={url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#3b82f6",
                        textDecoration: "none",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      ⬇ Baixar
                    </a>
                    {isLeads && (
                      <span
                        onClick={() => deletarAudio(url)}
                        style={{
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        Excluir
                      </span>
                    )}
                  </div>
                </div>
                <audio
                  controls
                  src={url}
                  style={{ width: "100%", height: "30px" }}
                />
              </div>
            ))}
          {(!ativo.audios || ativo.audios.length === 0) && (
            <div
              style={{
                fontSize: "12px",
                color: "#cbd5e1",
                fontStyle: "italic",
                padding: "10px",
                textAlign: "center",
                border: "1px dashed #e2e8f0",
                borderRadius: "6px",
              }}
            >
              Nenhum áudio disponível.
            </div>
          )}
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          borderTop: "1px solid #f1f5f9",
          paddingTop: "20px",
        }}
      >
        {ativo.status === "leads" && (
          <button
            onClick={() => moverPara(ativo.id, "producao")}
            className="btn-primary"
            style={{ background: "#0ea5e9" }}
          >
            Mover para Produção →
          </button>
        )}

        {ativo.status === "producao" && (
          <>
            <button
              onClick={() => moverPara(ativo.id, "leads")}
              style={{
                background: "white",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              ← Voltar
            </button>
            <button
              onClick={() => finalizarComWhats(ativo)}
              disabled={loadingDelivery} // Desabilita se estiver gerando texto
              className="btn-primary"
              style={{
                background: "#22c55e",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {loadingDelivery ? "✨ Gerando texto..." : "Finalizar com Whats"}
            </button>
          </>
        )}

        {ativo.status === "finalizados" && (
          <button
            onClick={() => moverPara(ativo.id, "producao")}
            style={{
              background: "#f59e0b",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Devolver para Produção
          </button>
        )}
      </div>
    </div>
  );
}
