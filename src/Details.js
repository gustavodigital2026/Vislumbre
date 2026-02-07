import React, { useRef } from "react";
import { formatarMoeda, normalizar } from "./utils";

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
  currentUser,
}) {
  const fileInputRef = useRef(null);

  return (
    <div
      style={{
        background: "white",
        padding: "25px",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* 1. CABEÇALHO DO CLIENTE */}
      <div style={{ marginBottom: "25px" }}>
        <label className="input-label">Nome do Cliente</label>
        <input
          className="modern-input"
          value={ativo.cliente}
          onChange={(e) => atualizarPedido(ativo.id, "cliente", e.target.value)}
          placeholder="Ex: João Silva"
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
          margin: "25px 0",
        }}
      />

      {/* 2. ÁREA DE NEGOCIAÇÃO (LEADS) */}
      <div style={{ marginBottom: "25px" }}>
        <label className="input-label">💰 Valor Negociado</label>
        <input
          className="modern-input"
          value={ativo.valorRaw || ""}
          onChange={(e) =>
            atualizarPedido(ativo.id, "valorRaw", e.target.value)
          }
          placeholder="R$ 0,00"
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, ativo.id)}
          style={{
            marginTop: "15px",
            border: "2px dashed #cbd5e1",
            borderRadius: "12px",
            padding: "20px",
            textAlign: "center",
            background: ativo.comprovanteUrl ? "#f0fdf4" : "#f8fafc",
            borderColor: ativo.comprovanteUrl ? "#86efac" : "#cbd5e1",
            cursor: "pointer",
            transition: "0.2s",
          }}
          onClick={() => document.getElementById("proof-upload").click()}
        >
          <input
            type="file"
            id="proof-upload"
            style={{ display: "none" }}
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
          />

          {ativo.comprovanteUrl ? (
            <div style={{ color: "#166534", fontWeight: "600" }}>
              ✅ Comprovante Anexado! <br />
              <a
                href={ativo.comprovanteUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "12px",
                  color: "#16a34a",
                  textDecoration: "underline",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                Ver arquivo
              </a>
            </div>
          ) : (
            <div style={{ color: "#64748b" }}>
              📄 <strong>Arraste o Comprovante aqui</strong>
              <br />
              <span style={{ fontSize: "12px" }}>
                ou clique para selecionar
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. ÁREA DE CRIAÇÃO (ROTEIRO) */}
      <div style={{ marginBottom: "25px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label className="input-label" style={{ margin: 0 }}>
            📝 Roteiro / Briefing
          </label>
          <button
            onClick={() => gerarRoteiroIA(ativo)}
            disabled={loadingIA}
            style={{
              background: loadingIA ? "#e2e8f0" : "#eff6ff",
              color: loadingIA ? "#94a3b8" : "#2563eb",
              border: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "600",
              cursor: loadingIA ? "not-allowed" : "pointer",
            }}
          >
            {loadingIA ? "✨ Criando..." : "✨ Criar com IA"}
          </button>
        </div>
        <textarea
          className="modern-input"
          rows={6}
          value={ativo.roteiro || ""}
          onChange={(e) => atualizarPedido(ativo.id, "roteiro", e.target.value)}
          placeholder="Escreva o roteiro aqui..."
          style={{ lineHeight: "1.5" }}
        />
        <div style={{ marginTop: "10px" }}>
          <label className="input-label">Observações Internas</label>
          <input
            className="modern-input"
            value={ativo.obs}
            onChange={(e) => atualizarPedido(ativo.id, "obs", e.target.value)}
            placeholder="Detalhes técnicos, tom de voz..."
          />
        </div>
      </div>

      {/* 4. ÁREA DE PRODUÇÃO (ÁUDIOS) */}
      {(ativo.status === "producao" || ativo.status === "finalizados") && (
        <div
          style={{
            background: "#f1f5f9",
            padding: "20px",
            borderRadius: "12px",
            marginTop: "20px",
          }}
        >
          <h4 style={{ margin: "0 0 15px 0", color: "#334155" }}>
            🎙️ Arquivos da Produção
          </h4>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "15px",
            }}
          >
            {ativo.audios &&
              ativo.audios.map((url, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>🎵</span>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    Áudio {i + 1}
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#3b82f6",
                      textDecoration: "none",
                      fontSize: "12px",
                    }}
                  >
                    Baixar
                  </a>
                </div>
              ))}
            {(!ativo.audios || ativo.audios.length === 0) && (
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                Nenhum áudio anexado.
              </span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => handleAudioUpload(e, ativo.id)}
            accept="audio/*,video/*,.pdf"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "8px 15px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            ← Adicionar arquivo
          </button>
        </div>
      )}

      {/* 5. AÇÕES FINAIS (BOTÕES) */}
      <div
        style={{
          marginTop: "30px",
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
        }}
      >
        {ativo.status === "leads" && (
          <button
            onClick={() => moverPara(ativo.id, "producao")}
            className="btn-primary"
            style={{ background: "#0ea5e9" }}
          >
            Enviar para Produção ➡️
          </button>
        )}

        {ativo.status === "producao" && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => moverPara(ativo.id, "leads")}
              style={{
                background: "#64748b",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              ⬅️ Voltar
            </button>
            <button
              onClick={() => finalizarComWhats(ativo)}
              disabled={loadingDelivery}
              className="btn-primary"
              style={{
                background: "#22c55e",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {loadingDelivery ? (
                <>✨ Gerando texto...</>
              ) : (
                <>✅ Finalizar com Whats</>
              )}
            </button>
          </div>
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
            ⚠️ Cliente pediu alteração (Voltar)
          </button>
        )}
      </div>
    </div>
  );
}
