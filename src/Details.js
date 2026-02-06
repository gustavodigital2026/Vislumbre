import React from "react";

const formatarMoeda = (v) => {
  if (!v) return "";
  const n = String(v).replace(/\D/g, "");
  return (Number(n) / 100).toFixed(2).replace(".", ",");
};

// Estilos
const styles = {
    grupoInput: { marginBottom: "20px" },
    label: { display: "block", marginBottom: "8px", fontWeight: "bold", color: "#34495e" },
    input: { width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #bdc3c7", fontSize: "14px", boxSizing: "border-box" },
    btnVerde: { background: "#27ae60", color: "white", border: "none", padding: "15px 25px", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", width: "100%", boxShadow: "0 4px 0 #219150" },
    btnBlue: { background: "#2980b9", color: "white", border: "none", padding: "15px 25px", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", width: "100%" },
    btnZap: { background: "#25D366", color: "white", border: "none", padding: "15px 25px", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", width: "100%" },
    areaDrop: { border: "2px dashed #bdc3c7", padding: "20px", textAlign: "center", borderRadius: "8px", marginBottom: "20px", cursor: "pointer", background: "#f9f9f9" }
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
    servicos = [] 
}) {
  if (!ativo) return null;

  const ListaAudios = ({ audios }) => (
    audios && audios.length > 0 ? (
      <div style={{ marginBottom: "10px" }}>
        {audios.map((url, i) => (
          <div key={i} style={{ marginBottom: "5px", display: "flex", alignItems: "center", gap: "10px" }}>
            <audio controls src={url} style={{ flex: 1, height: "30px" }} />
            <span style={{ fontSize: "12px", color: "#7f8c8d" }}>#{i + 1}</span>
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      
      {/* ABA: LEADS */}
      {ativo.status === "leads" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div style={styles.grupoInput}>
              <label style={styles.label}>Nome:</label>
              <input value={ativo.cliente} onChange={e => atualizarPedido(ativo.id, "cliente", e.target.value)} style={styles.input} placeholder="Nome..." />
            </div>
            <div style={styles.grupoInput}>
              <label style={styles.label}>WhatsApp:</label>
              <input value={ativo.telefone} onChange={e => atualizarPedido(ativo.id, "telefone", e.target.value)} style={styles.input} />
            </div>
          </div>
          <div style={styles.grupoInput}>
            <label style={styles.label}>📝 Histórico / Obs:</label>
            <textarea value={ativo.obs} onChange={e => atualizarPedido(ativo.id, "obs", e.target.value)} rows={4} style={{ ...styles.input, background: "#fff3cd", border: "1px solid #f1c40f" }} />
          </div>
          
          <div style={{ margin: "40px 0", borderTop: "2px dashed #ddd", position: "relative" }}>
             <span style={{ position: "absolute", top: "-12px", left: "0", background: "white", paddingRight: "10px", color: "#95a5a6", fontSize: "12px", fontWeight: "bold" }}>ÁREA DE FECHAMENTO</span>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={styles.grupoInput}>
              <label style={styles.label}>Serviço:</label>
              <select value={ativo.servico} onChange={e => atualizarPedido(ativo.id, "servico", e.target.value)} style={styles.input}>
                <option value="">Selecione...</option>
                {servicos.map(s => (<option key={s.id} value={s.nome}>{s.nome}</option>))}
                {servicos.length === 0 && <option>Jingle</option>}
              </select>
            </div>
            <div style={styles.grupoInput}>
              <label style={styles.label}>Valor (R$):</label>
              <input value={formatarMoeda(ativo.valorRaw)} onChange={e => atualizarPedido(ativo.id, "valorRaw", e.target.value.replace(/\D/g, ""))} style={{ ...styles.input, fontWeight: "bold", color: "#27ae60" }} placeholder="0,00" />
            </div>
          </div>

          <div style={styles.grupoInput}>
            <label style={styles.label}>🎤 Áudios do Cliente:</label>
            <ListaAudios audios={ativo.audios} />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "#f9f9f9", borderRadius: "6px", border: "1px solid #ddd" }}>
              <input type="file" accept="audio/*" onChange={(e) => handleAudioUpload(e, ativo.id)} style={{ fontSize: "12px" }} />
              <span style={{ fontSize: "11px", color: "#95a5a6" }}>← Adicionar áudio</span>
            </div>
          </div>

          <div onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, ativo.id)} style={styles.areaDrop}>
            {ativo.comprovanteUrl ? (<div><img src={ativo.comprovanteUrl} style={{ maxHeight: "150px" }} alt="ok" /><p style={{ color: "green", margin: 0 }}>Comprovante OK!</p></div>) : <p style={{ margin: 0, color: "#bdc3c7" }}>📂 Arraste Comprovante</p>}
          </div>
          <button onClick={() => moverPara(ativo.id, "pendentes")} style={styles.btnVerde}>💰 Venda Fechada!</button>
        </>
      )}

      {/* ABA: PENDENTES (CRIAÇÃO DA LETRA) */}
      {ativo.status === "pendentes" && (
        <>
          <div style={{ background: "#ecf0f1", padding: "15px", borderRadius: "6px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><strong>Serviço:</strong> {ativo.servico}</div>
              <div style={{ color: "#27ae60", fontWeight: "bold" }}>{formatarMoeda(ativo.valorRaw)}</div>
            </div>
            <br /><strong>Obs:</strong> {ativo.obs || "Nenhuma"}
          </div>

          <div style={styles.grupoInput}>
            <label style={styles.label}>🎤 Áudios de Referência (Upload Aqui):</label>
            <ListaAudios audios={ativo.audios} />
            <input type="file" accept="audio/*" onChange={(e) => handleAudioUpload(e, ativo.id)} style={{ marginTop: "5px", fontSize: "12px" }} />
          </div>

          <div style={styles.grupoInput}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ fontWeight: "bold", color: "#34495e" }}>Desenvolvimento Criativo:</label>
              <button onClick={() => gerarRoteiroIA(ativo)} disabled={loadingIA} style={{ background: loadingIA ? "#ccc" : "linear-gradient(45deg, #16a085, #2ecc71)", color: "white", border: "none", padding: "5px 15px", borderRadius: "20px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>{loadingIA ? "..." : "✨ Criar com IA"}</button>
            </div>
            <textarea value={ativo.roteiro} onChange={e => atualizarPedido(ativo.id, "roteiro", e.target.value)} rows={12} placeholder="Escreva o roteiro ou letra..." style={{ ...styles.input, fontFamily: "monospace", fontSize: "14px" }} />
          </div>
          {/* CORREÇÃO DO ERRO AQUI: &gt;&gt; em vez de >> */}
          <button onClick={() => moverPara(ativo.id, "producao")} style={styles.btnBlue}>Aprovar e Enviar para Produção &gt;&gt;</button>
        </>
      )}

      {/* ABA: PRODUÇÃO (CRIAÇÃO FINAL) & FINALIZADOS */}
      {(ativo.status === "producao" || ativo.status === "finalizados") && (
        <>
          <div style={{ background: "#e8f5e9", padding: "25px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #c8e6c9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #c8e6c9", paddingBottom: "10px" }}>
              <strong>{ativo.servico}</strong><strong>{formatarMoeda(ativo.valorRaw)}</strong>
            </div>
            <h3 style={{ marginTop: 0, color: "#2e7d32" }}>Roteiro Final:</h3>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "#1b5e20" }}>{ativo.roteiro}</pre>
            
            {ativo.status === "producao" && (
                <div style={{marginTop: "20px", borderTop: "1px dashed #aaa", paddingTop: "10px"}}>
                   <strong style={{color: "#2e7d32", fontSize: "12px", display: "block", marginBottom: "5px"}}>Áudios do Projeto (Somente Leitura):</strong>
                   <ListaAudios audios={ativo.audios} />
                </div>
            )}
          </div>

          {ativo.status === "producao" && <button onClick={() => finalizarComWhats(ativo)} style={styles.btnZap}>✅ Finalizar e Enviar WhatsApp</button>}
        </>
      )}
    </div>
  );
}