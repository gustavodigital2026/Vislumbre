import React from "react";

const btnReativar = { background: "#e74c3c", color: "white", border: "none", borderRadius: "12px", padding: "4px 10px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" };

const formatarDataLista = (dataString) => {
    if (!dataString) return "";
    try { const partes = dataString.split(' '); return `${partes[0].substring(0, 5)} ${partes[1].substring(0, 5)}`; } catch (e) { return dataString; }
};
const verificarAtraso = (ts) => (Date.now() - ts) > (24 * 60 * 60 * 1000);

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
    setFiltroDataFim
}) {
  return (
    <div style={{ 
        width: "320px", 
        background: "#ecf0f1", 
        borderRight: "1px solid #bdc3c7", 
        overflowY: "auto", 
        overflowX: "hidden", 
        scrollbarGutter: "stable", 
        display: "flex", 
        flexDirection: "column" 
    }}>
      
      {/* FILTROS */}
      <div style={{ padding: "10px", background: "#34495e", borderBottom: "1px solid #2c3e50", color: "white" }}>
        <input 
            type="text" 
            placeholder="🔍 Buscar cliente ou telefone..." 
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "8px", borderRadius: "4px", border: "none", outline: "none", fontSize: "13px", marginBottom: "8px" }}
        />
        <div style={{display: "flex", gap: "5px", alignItems: "center", fontSize: "11px"}}>
            <div style={{flex: 1}}>
                <label style={{display:"block", marginBottom:"2px", opacity: 0.8}}>De:</label>
                <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} style={{width: "100%", boxSizing: "border-box", padding: "4px", borderRadius: "4px", border: "none"}} />
            </div>
            <div style={{flex: 1}}>
                <label style={{display:"block", marginBottom:"2px", opacity: 0.8}}>Até:</label>
                <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={{width: "100%", boxSizing: "border-box", padding: "4px", borderRadius: "4px", border: "none"}} />
            </div>
        </div>
      </div>

      {aba === "leads" && !termoBusca && (
        <div style={{ padding: "15px", background: "#fff", borderBottom: "1px solid #ddd" }}>
          <label style={{ fontSize: "12px", color: "#7f8c8d", fontWeight: "bold" }}>NOVO WHATSAPP:</label>
          <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
            <input placeholder="Ex: 11999999999" type="tel" value={novoTel} onChange={(e) => setNovoTel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") adicionarLead(); }} autoFocus style={{ flex: 1, boxSizing: "border-box", padding: "10px", border: "2px solid #27ae60", borderRadius: "4px", outline: "none" }} />
            <button onClick={adicionarLead} style={{ background: "#27ae60", color: "white", border: "none", borderRadius: "4px", padding: "0 15px", cursor: "pointer", fontSize: "20px", fontWeight: "bold" }}>+</button>
          </div>
        </div>
      )}

      <div style={{ padding: "10px" }}>
        {lista.length === 0 && <p style={{ color: "#95a5a6", textAlign: "center", marginTop: "20px" }}>Nenhum pedido encontrado.</p>}
        {lista.map((p) => {
            const dataMostrada = (aba === "finalizados" && p.dataSaida) ? p.dataSaida : p.dataEntrada;
            return (
              <div
                key={p.id}
                onClick={() => setIdSelecionado(p.id)}
                style={{
                  padding: "12px",
                  background: idSelecionado === p.id ? "white" : "#e0e6ed",
                  borderLeft: idSelecionado === p.id ? "5px solid #f1c40f" : "5px solid transparent",
                  marginBottom: "8px", cursor: "pointer", borderRadius: "6px",
                  boxShadow: idSelecionado === p.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontWeight: "bold", color: "#2c3e50", fontSize: "15px" }}>{p.cliente ? p.cliente : p.telefone}</div>
                {p.cliente && <div style={{ fontSize: "13px", color: "#34495e" }}>{p.telefone}</div>}
                <div style={{ fontSize: "11px", color: "#7f8c8d", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", height: "25px" }}>
                  {aba !== "leads" ? (
                    <span style={{ background: "#ddd", padding: "2px 6px", borderRadius: "4px" }}>{p.servico}</span>
                  ) : verificarAtraso(p.tsEntrada) ? (
                    <button onClick={(e) => reativarLead(e, p)} style={btnReativar}>📢 Reativar</button>
                  ) : (
                    <span style={{ color: "#27ae60", fontStyle: "italic" }}>Novo</span>
                  )}
                  <span style={{ fontWeight: "500" }}>{formatarDataLista(dataMostrada)}</span>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}