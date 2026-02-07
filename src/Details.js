import React, { useRef } from "react";
import { maskCurrency } from "./utils";

// Componente auxiliar para áreas de upload (Drag & Drop + Lista)
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

  // Converte arquivo único (legado) ou array em lista segura
  const lista = Array.isArray(arquivos) ? arquivos : arquivos ? [arquivos] : [];

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
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

        {/* Botão de inserir (visível apenas em leads para segurança ou para todos?)
                    O usuário pediu: "inserido por arrasto ou inserção pelos arquivos"
                    E: "diversos arquivos podem ser incluidos"
                    Regra 1 anterior dizia: "apenas primeira etapa".
                    Vou manter a inserção APENAS NO LEADS conforme Regra 1, 
                    mas a exclusão para todos conforme o novo pedido.
                */}
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
          multiple // Permite vários
          style={{ display: "none" }}
          onChange={(e) => onUpload(e.target.files)}
          accept={accept}
        />
      </div>

      {/* Área de Drag & Drop */}
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
        {lista.map((url, i) => (
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
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "200px",
                }}
              >
                Arquivo {i + 1}
              </a>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {/* Player simples se for áudio */}
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

              {/* BOTÃO DE EXCLUIR: Disponível para TODOS (conforme pedido) */}
              <span
                onClick={() => onDelete(url)}
                style={{
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginLeft: "5px",
                }}
                title="Excluir arquivo"
              >
                ×
              </span>
            </div>
          </div>
        ))}

        {lista.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "12px",
              padding: "10px",
            }}
          >
            {isLeads
              ? emptyMsg || "Arraste arquivos aqui..."
              : "Nenhum arquivo."}
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

      {/* VALOR */}
      <div style={{ marginBottom: "20px" }}>
        <label className="input-label">💰 Valor (Apenas Leads)</label>
        <input
          className="modern-input"
          value={ativo.valorRaw || ""}
          onChange={(e) =>
            atualizarPedido(ativo.id, "valorRaw", maskCurrency(e.target.value))
          }
          placeholder="R$ 0,00"
          disabled={!isLeads}
          style={{
            background: isLeads ? "white" : "#f1f5f9",
            cursor: isLeads ? "text" : "not-allowed",
            maxWidth: "200px",
          }}
        />
      </div>

      {/* COMPROVANTES (Múltiplos) */}
      <FileArea
        titulo="📄 Comprovantes / Documentos"
        arquivos={
          ativo.comprovantes || ativo.comprovanteUrl /* Fallback legado */
        }
        onUpload={(files) => handleUpload(files, "comprovantes", ativo.id)}
        onDelete={(url) => handleDeleteFile(url, "comprovantes", ativo.id)}
        accept="image/*,.pdf"
        isLeads={isLeads}
        btnText="+ Add Comprovante"
        emptyMsg="Arraste comprovantes ou documentos..."
      />

      {/* ROTEIRO */}
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

      {/* ÁUDIOS / PROJETOS (Múltiplos) */}
      <FileArea
        titulo="🎙️ Arquivos do Projeto (Áudio/Vídeo)"
        arquivos={ativo.audios}
        onUpload={(files) => handleUpload(files, "audios", ativo.id)}
        onDelete={(url) => handleDeleteFile(url, "audios", ativo.id)}
        accept="audio/*,video/*"
        isLeads={isLeads}
        btnText="+ Add Áudio"
        emptyMsg="Arraste arquivos de produção aqui..."
      />

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
              disabled={loadingDelivery}
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
