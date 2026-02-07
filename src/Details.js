import React, { useRef } from "react";
import { maskCurrency } from "./utils";

const FileArea = ({
  titulo,
  arquivos,
  onUpload,
  onDelete,
  accept,
  isLeads,
  emptyMsg,
  btnText,
}) => {
  const inputRef = useRef(null);
  const lista = Array.isArray(arquivos) ? arquivos : arquivos ? [arquivos] : [];

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0)
      onUpload(e.dataTransfer.files);
  };

  return (
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
          {titulo}
        </label>
        {isLeads && (
          <button
            onClick={() => inputRef.current.click()}
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
            {btnText || "+ Anexar"}
          </button>
        )}
        <input
          type="file"
          ref={inputRef}
          multiple
          style={{ display: "none" }}
          onChange={(e) => onUpload(e.target.files)}
          accept={accept}
        />
      </div>
      <div
        onDragOver={(e) => isLeads && e.preventDefault()}
        onDrop={(e) => isLeads && handleDrop(e)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          border: isLeads ? "2px dashed #e2e8f0" : "1px solid #e2e8f0",
          padding: "10px",
          borderRadius: "8px",
          background: isLeads ? "#f8fafc" : "#fff",
          minHeight: "60px",
        }}
      >
        {lista.map((item, i) => {
          // VERIFICAÇÃO INTELIGENTE (Compatibilidade)
          const isLegacy = typeof item === "string";
          const url = isLegacy ? item : item.url;
          const nomeExibido = isLegacy ? `Arquivo ${i + 1}` : item.name;

          return (
            <div
              key={i}
              style={{
                background: "white",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  overflow: "hidden",
                }}
              >
                <span style={{ fontSize: "14px" }}>📎</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#334155",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                  title={nomeExibido}
                >
                  {nomeExibido}
                </a>
              </div>
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {(url.includes(".mp3") ||
                  url.includes(".wav") ||
                  url.includes(".m4a")) && (
                  <audio
                    controls
                    src={url}
                    style={{ height: "25px", maxWidth: "150px" }}
                  />
                )}
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
                  ⬇
                </a>
                <span
                  onClick={() => onDelete(item)}
                  style={{
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginLeft: "5px",
                  }}
                  title="Excluir"
                >
                  ×
                </span>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "12px",
              padding: "10px",
            }}
          >
            {isLeads ? emptyMsg || "Arraste arquivos..." : "Nenhum arquivo."}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Details({
  ativo,
  atualizarPedido,
  moverPara,
  finalizarComWhats,
  gerarRoteiroIA,
  loadingIA,
  loadingDelivery,
  handleUpload,
  handleDeleteFile,
  servicos,
}) {
  const isLeads = ativo.status === "leads";

  return (
    <div
      style={{
        background: "white",
        padding: "25px",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <label className="input-label">Nome Cliente</label>
        <input
          className="modern-input"
          value={ativo.cliente}
          onChange={(e) => atualizarPedido(ativo.id, "cliente", e.target.value)}
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
          margin: "20px 0",
        }}
      />
      <div style={{ marginBottom: "20px" }}>
        <label className="input-label">💰 Valor (Apenas Leads)</label>
        <input
          className="modern-input"
          value={ativo.valorRaw || ""}
          onChange={(e) =>
            atualizarPedido(ativo.id, "valorRaw", maskCurrency(e.target.value))
          }
          disabled={!isLeads}
          style={{
            background: isLeads ? "white" : "#f1f5f9",
            maxWidth: "200px",
          }}
        />
      </div>

      <FileArea
        titulo="📄 Comprovantes"
        arquivos={ativo.comprovantes || ativo.comprovanteUrl}
        onUpload={(f) => handleUpload(f, "comprovantes", ativo.id)}
        onDelete={(u) => handleDeleteFile(u, "comprovantes", ativo.id)}
        accept="image/*,.pdf"
        isLeads={isLeads}
        btnText="+ Add Doc"
      />

      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
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
          placeholder="Obs. Internas"
          disabled={!isLeads}
        />
      </div>

      <FileArea
        titulo="🎙️ Arquivos do Projeto"
        arquivos={ativo.audios}
        onUpload={(f) => handleUpload(f, "audios", ativo.id)}
        onDelete={(u) => handleDeleteFile(u, "audios", ativo.id)}
        accept="audio/*,video/*"
        isLeads={isLeads}
        btnText="+ Add Áudio"
      />

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
            Produção →
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
              disabled={loadingDelivery}
              className="btn-primary"
              style={{ background: "#22c55e" }}
            >
              {loadingDelivery ? "✨ Criando..." : "Finalizar (Whats)"}
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
            Devolver
          </button>
        )}
      </div>
    </div>
  );
}
