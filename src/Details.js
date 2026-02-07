import React, { useRef, useState } from "react";

const formatarMoeda = (v) => {
  if (!v) return "";
  const n = String(v).replace(/\D/g, "");
  return (Number(n) / 100).toFixed(2).replace(".", ",");
};

const styles = {
  grupoInput: { marginBottom: "20px" },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "bold",
    color: "#34495e",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #bdc3c7",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  btnVerde: {
    background: "#27ae60",
    color: "white",
    border: "none",
    padding: "15px 25px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    width: "100%",
    boxShadow: "0 4px 0 #219150",
  },
  btnZap: {
    background: "#25D366",
    color: "white",
    border: "none",
    padding: "15px 25px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    width: "100%",
  },

  // BOTÃO DE RETORNO (NOVO)
  btnVoltar: {
    background: "#f59e0b",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
    marginTop: "15px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  areaDrop: {
    border: "2px dashed #bdc3c7",
    padding: "20px",
    textAlign: "center",
    borderRadius: "8px",
    marginBottom: "20px",
    cursor: "pointer",
    background: "#f9f9f9",
    transition: "background 0.2s",
  },
  btnRemove: {
    background: "#fee2e2",
    color: "#ef4444",
    border: "1px solid #fca5a5",
    padding: "5px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "bold",
    marginTop: "10px",
  },
};

export default function Details({
  ativo,
  atualizarPedido,
  moverPara,
  finalizarComWhats,
  gerarRoteiroIA,
  loadingIA,
  handleAudioUpload,
  handleDrop,
  servicos = [],
  currentUser,
}) {
  const fileInputRef = useRef(null);
  const [editMode, setEditMode] = useState(false);

  if (!ativo) return null;
  const isAdmin = currentUser?.role === "admin";

  const toggleDevolucao = () => {
    const novoStatus = !ativo.devolvido;
    if (
      window.confirm(
        novoStatus ? "Marcar como DEVOLVIDO?" : "Cancelar devolução?"
      )
    ) {
      atualizarPedido(ativo.id, "devolvido", novoStatus);
      setEditMode(false);
    }
  };

  const removerComprovante = (e) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja remover este comprovante?")) {
      atualizarPedido(ativo.id, "comprovanteUrl", null);
    }
  };

  const handleAreaClick = () => {
    fileInputRef.current.click();
  };

  const onFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fakeEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: { files: [file] },
      };
      handleDrop(fakeEvent, ativo.id);
    }
  };

  const isPDF = (url) =>
    url &&
    (url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("pdf?"));

  const ListaAudios = ({ audios }) =>
    audios && audios.length > 0 ? (
      <div style={{ marginBottom: "10px" }}>
        {audios.map((url, i) => (
          <div
            key={i}
            style={{
              marginBottom: "5px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <audio controls src={url} style={{ flex: 1, height: "30px" }} />
            <span style={{ fontSize: "12px", color: "#7f8c8d" }}>#{i + 1}</span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {(ativo.status === "leads" || ativo.status === "pendentes") && (
        <>
          <div
            style={{
              background: "#fdfdfd",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #eee",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                marginBottom: "20px",
              }}
            >
              <div style={styles.grupoInput}>
                <label style={styles.label}>Nome:</label>
                <input
                  value={ativo.cliente}
                  onChange={(e) =>
                    atualizarPedido(ativo.id, "cliente", e.target.value)
                  }
                  style={styles.input}
                  placeholder="Nome..."
                />
              </div>
              <div style={styles.grupoInput}>
                <label style={styles.label}>WhatsApp:</label>
                <input
                  value={ativo.telefone}
                  onChange={(e) =>
                    atualizarPedido(ativo.id, "telefone", e.target.value)
                  }
                  style={styles.input}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              <div style={styles.grupoInput}>
                <label style={styles.label}>Serviço:</label>
                <select
                  value={ativo.servico}
                  onChange={(e) =>
                    atualizarPedido(ativo.id, "servico", e.target.value)
                  }
                  style={styles.input}
                >
                  <option value="">Selecione...</option>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.nome}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.grupoInput}>
                <label style={styles.label}>Valor (R$):</label>
                <input
                  value={formatarMoeda(ativo.valorRaw)}
                  onChange={(e) =>
                    atualizarPedido(
                      ativo.id,
                      "valorRaw",
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  style={{
                    ...styles.input,
                    fontWeight: "bold",
                    color: "#27ae60",
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div style={styles.grupoInput}>
            <label style={styles.label}>📝 Histórico / Obs:</label>
            <textarea
              value={ativo.obs}
              onChange={(e) => atualizarPedido(ativo.id, "obs", e.target.value)}
              rows={3}
              style={{
                ...styles.input,
                background: "#fff3cd",
                border: "1px solid #f1c40f",
              }}
            />
          </div>

          <div
            style={{
              margin: "30px 0",
              borderTop: "2px dashed #3498db",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "-12px",
                left: "0",
                background: "white",
                paddingRight: "10px",
                color: "#3498db",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              ÁREA DE CRIAÇÃO (LETRA/ROTEIRO)
            </span>
          </div>

          <div style={styles.grupoInput}>
            <label style={styles.label}>🎤 Áudios de Referência:</label>
            <ListaAudios audios={ativo.audios} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                background: "#f9f9f9",
                borderRadius: "6px",
                border: "1px solid #ddd",
              }}
            >
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleAudioUpload(e, ativo.id)}
                style={{ fontSize: "12px" }}
              />
            </div>
          </div>

          <div style={styles.grupoInput}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <label style={{ fontWeight: "bold", color: "#34495e" }}>
                Roteiro / Letra:
              </label>
              <button
                onClick={() => gerarRoteiroIA(ativo)}
                disabled={loadingIA}
                style={{
                  background: loadingIA
                    ? "#ccc"
                    : "linear-gradient(45deg, #8e44ad, #9b59b6)",
                  color: "white",
                  border: "none",
                  padding: "5px 15px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                {loadingIA ? "..." : "✨ Criar com IA"}
              </button>
            </div>
            <textarea
              value={ativo.roteiro}
              onChange={(e) =>
                atualizarPedido(ativo.id, "roteiro", e.target.value)
              }
              rows={12}
              placeholder="Escreva o roteiro ou letra aqui..."
              style={{
                ...styles.input,
                fontFamily: "monospace",
                fontSize: "14px",
                border: "2px solid #3498db44",
              }}
            />
          </div>

          <div
            style={{
              margin: "40px 0",
              borderTop: "2px dashed #27ae60",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "-12px",
                left: "0",
                background: "white",
                paddingRight: "10px",
                color: "#27ae60",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              FECHAMENTO & PAGAMENTO
            </span>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, ativo.id)}
            onClick={handleAreaClick}
            style={styles.areaDrop}
            title="Clique ou arraste o comprovante"
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,application/pdf"
              onChange={onFileSelect}
            />

            {ativo.comprovanteUrl ? (
              <div>
                {isPDF(ativo.comprovanteUrl) ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span style={{ fontSize: "40px" }}>📄</span>
                    <a
                      href={ativo.comprovanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#3b82f6",
                        fontWeight: "bold",
                        textDecoration: "none",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver PDF
                    </a>
                    <p style={{ color: "green", margin: 0, fontSize: "12px" }}>
                      Comprovante Recebido!
                    </p>
                  </div>
                ) : (
                  <div>
                    <img
                      src={ativo.comprovanteUrl}
                      style={{
                        maxHeight: "150px",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                      }}
                      alt="ok"
                    />
                    <p style={{ color: "green", margin: 0 }}>Comprovante OK!</p>
                  </div>
                )}
                <button onClick={removerComprovante} style={styles.btnRemove}>
                  🗑️ Remover
                </button>
              </div>
            ) : (
              <div style={{ pointerEvents: "none" }}>
                <span
                  style={{
                    fontSize: "24px",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  📂
                </span>
                <p style={{ margin: 0, color: "#bdc3c7", fontWeight: "bold" }}>
                  Arraste ou Clique para anexar Comprovante
                </p>
                <p style={{ margin: 0, color: "#95a5a6", fontSize: "11px" }}>
                  (Aceita Imagem ou PDF)
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => moverPara(ativo.id, "producao")}
            style={styles.btnVerde}
          >
            Aprovar Letra, Confirmar Pagamento e Iniciar Produção &gt;&gt;
          </button>
        </>
      )}

      {(ativo.status === "producao" || ativo.status === "finalizados") && (
        <>
          {ativo.devolvido && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #fca5a5",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              🚫 ESTE PEDIDO FOI DEVOLVIDO
            </div>
          )}

          <div
            style={{
              background: "#e8f5e9",
              padding: "25px",
              borderRadius: "8px",
              marginBottom: "25px",
              border: "1px solid #c8e6c9",
            }}
          >
            {isAdmin ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "10px",
                  }}
                >
                  <button
                    onClick={() => setEditMode(!editMode)}
                    style={{
                      background: editMode ? "#ef4444" : "#f1f5f9",
                      border: "1px solid #ccc",
                      padding: "5px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    {editMode ? "🔒 Bloquear" : "🔓 Editar"}
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "15px",
                    borderBottom: "1px solid #c8e6c9",
                    paddingBottom: "15px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#2e7d32",
                      }}
                    >
                      SERVIÇO:
                    </label>
                    <select
                      disabled={!editMode}
                      value={ativo.servico}
                      onChange={(e) =>
                        atualizarPedido(ativo.id, "servico", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "5px",
                        borderRadius: "4px",
                        border: "1px solid #a5d6a7",
                      }}
                    >
                      {servicos.map((s) => (
                        <option key={s.id} value={s.nome}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "bold",
                        color: "#2e7d32",
                      }}
                    >
                      VALOR:
                    </label>
                    <input
                      disabled={!editMode}
                      value={formatarMoeda(ativo.valorRaw)}
                      onChange={(e) =>
                        atualizarPedido(
                          ativo.id,
                          "valorRaw",
                          e.target.value.replace(/\D/g, "")
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "5px",
                        borderRadius: "4px",
                        border: "1px solid #a5d6a7",
                        fontWeight: "bold",
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  borderBottom: "1px solid #c8e6c9",
                  paddingBottom: "10px",
                }}
              >
                <strong>{ativo.servico}</strong>
                <strong>{formatarMoeda(ativo.valorRaw)}</strong>
              </div>
            )}

            {ativo.comprovanteUrl && (
              <div
                style={{
                  marginBottom: "20px",
                  background: "white",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #a5d6a7",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#2e7d32",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Comprovante de Pagamento:
                </span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  {isPDF(ativo.comprovanteUrl) ? (
                    <a
                      href={ativo.comprovanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        textDecoration: "none",
                        color: "#3b82f6",
                        fontWeight: "bold",
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>📄</span> Abrir PDF
                    </a>
                  ) : (
                    <a
                      href={ativo.comprovanteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={ativo.comprovanteUrl}
                        style={{
                          height: "60px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                        }}
                        alt="Comprovante"
                      />
                    </a>
                  )}
                  <span style={{ fontSize: "12px", color: "#27ae60" }}>
                    ✅ Confirmado
                  </span>
                </div>
              </div>
            )}

            <h3 style={{ marginTop: 0, color: "#2e7d32" }}>Roteiro Final:</h3>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                color: "#1b5e20",
              }}
            >
              {ativo.roteiro}
            </pre>

            {ativo.status === "producao" && (
              <div
                style={{
                  marginTop: "20px",
                  borderTop: "1px dashed #aaa",
                  paddingTop: "10px",
                }}
              >
                <strong
                  style={{
                    color: "#2e7d32",
                    fontSize: "12px",
                    display: "block",
                    marginBottom: "5px",
                  }}
                >
                  Áudios do Projeto:
                </strong>
                <ListaAudios audios={ativo.audios} />
              </div>
            )}
          </div>

          {/* BOTÕES DE AÇÃO */}
          {ativo.status === "producao" && (
            <>
              <button
                onClick={() => finalizarComWhats(ativo)}
                style={styles.btnZap}
              >
                ✅ Finalizar e Enviar WhatsApp
              </button>
              {/* BOTÃO DE RETORNAR PARA LEADS */}
              <button
                onClick={() => moverPara(ativo.id, "leads")}
                style={styles.btnVoltar}
              >
                ↩ Retornar para Criação (Erro)
              </button>
            </>
          )}

          {ativo.status === "finalizados" && (
            /* BOTÃO DE RETORNAR PARA PRODUÇÃO */
            <button
              onClick={() => moverPara(ativo.id, "producao")}
              style={styles.btnVoltar}
            >
              ↩ Retornar para Produção (Erro)
            </button>
          )}

          {isAdmin && editMode && (
            <div
              style={{
                marginTop: "30px",
                borderTop: "1px solid #eee",
                paddingTop: "20px",
                textAlign: "right",
              }}
            >
              <button
                onClick={toggleDevolucao}
                style={{
                  background: "none",
                  border: "1px solid #ef4444",
                  color: "#ef4444",
                  padding: "8px 15px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {ativo.devolvido
                  ? "↺ Cancelar Devolução"
                  : "💸 Registrar Devolução"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
