import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { TRECHOS, ARIQUEMES_CENTER, type Trecho, type ClasseRisco } from "./data/trechos";
import "./App.css";

const CORES: Record<ClasseRisco, string> = {
  intransitavel: "#8a1c1c",
  alta: "#d4541e",
  media: "#e0a52e",
  baixa: "#4a8a52",
};
const ROTULO: Record<ClasseRisco, string> = {
  intransitavel: "Intransitável",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
const DRENAGEM_LBL: Record<string, string> = { ausente: "Ausente", parcial: "Parcial", boa: "Boa" };

export default function App() {
  const [sel, setSel] = useState<string | null>(null);
  const [aba, setAba] = useState<"mapa" | "painel">("mapa");

  // clicar no mesmo trecho limpa a seleção (toggle)
  const toggle = (id: string) => setSel((atual) => (atual === id ? null : id));

  const contagem = useMemo(() => {
    const c: Record<ClasseRisco, number> = { intransitavel: 0, alta: 0, media: 0, baixa: 0 };
    TRECHOS.forEach((t) => c[t.classe_risco]++);
    return c;
  }, []);
  const criticos = contagem.intransitavel + contagem.alta;

  return (
    <div className="app" data-tab={aba}>
      <div className="mobile-tabs">
        <button className={`mobile-tab ${aba === "mapa" ? "ativo" : ""}`} onClick={() => setAba("mapa")}>🗺 Mapa</button>
        <button className={`mobile-tab ${aba === "painel" ? "ativo" : ""}`} onClick={() => setAba("painel")}>📋 Painel</button>
      </div>
      <aside className="sidebar">
        <div className="brand">
          <h1>Linha<span>Livre</span></h1>
          <p>Trafegabilidade preditiva das estradas vicinais de Ariquemes — Rondônia</p>
          <span className="selo">Monitoramento de campo</span>
        </div>

        <div className="resumo">
          <div className="resumo-titulo">Situação de hoje</div>
          <div className="resumo-grid">
            <div className="resumo-card crit">
              <div className="num">{criticos}</div>
              <div className="lbl">trechos em risco crítico</div>
            </div>
            <div className="resumo-card">
              <div className="num">{TRECHOS.length}</div>
              <div className="lbl">trechos monitorados</div>
            </div>
          </div>
        </div>

        <div className="lista-titulo">
          Trechos por prioridade
          {sel && (
            <button className="limpar-sel" onClick={() => setSel(null)}>ver todas</button>
          )}
        </div>
        {[...TRECHOS]
          .sort((a, b) => ordem(b.classe_risco) - ordem(a.classe_risco))
          .map((t) => (
            <TrechoItem key={t.id} t={t} sel={sel === t.id} onClick={() => toggle(t.id)} />
          ))}

        <div className="rodape">
          Modelo de risco com pesos <b>validados em campo</b> junto à SEMOSP, DER e NUCEX.
          <span className="aviso">Dados de demonstração (sintéticos). Arquitetura pronta para dados reais.</span>
        </div>
      </aside>

      <div className="mapa-wrap">
        <MapContainer center={ARIQUEMES_CENTER} zoom={11} scrollWheelZoom>
          <TileLayer attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {TRECHOS.map((t) => (
            <Polyline key={t.id} positions={t.path}
              pathOptions={{
                color: CORES[t.classe_risco],
                weight: sel === t.id ? 9 : 6,
                opacity: sel && sel !== t.id ? 0.4 : 0.95,
              }}
              eventHandlers={{ click: () => toggle(t.id) }}>
              <Popup>
                <div className="popup-trecho">
                  <h3>{t.nome}</h3>
                  <div className="linha"><span>💧 Drenagem</span><b>{DRENAGEM_LBL[t.drenagem]}</b></div>
                  <div className="linha"><span>⛰ Solo</span><b>{t.solo === "argiloso" ? "Argiloso" : "Arenoso"}</b></div>
                  <div className="linha"><span>↔ Largura</span><b>{t.largura_m} m {t.largura_m < 30 ? "(abaixo do padrão)" : ""}</b></div>
                  <div className="linha"><span>🌧 Chuva 72h</span><b>{t.chuva_72h_mm} mm</b></div>
                  <span className="popup-risco" style={{ background: CORES[t.classe_risco] }}>
                    Risco {ROTULO[t.classe_risco]}
                  </span>
                </div>
              </Popup>
            </Polyline>
          ))}
        </MapContainer>

        <div className="legenda">
          <div className="legenda-titulo">Nível de risco</div>
          {(["intransitavel", "alta", "media", "baixa"] as ClasseRisco[]).map((c) => (
            <div className="legenda-item" key={c}>
              <span className="legenda-cor" style={{ background: CORES[c] }} />
              {ROTULO[c]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrechoItem({ t, sel, onClick }: { t: Trecho; sel: boolean; onClick: () => void }) {
  const critico = t.classe_risco === "alta" || t.classe_risco === "intransitavel";
  return (
    <div className={`trecho-item ${sel ? "sel" : ""} ${critico ? "pulso" : ""}`} onClick={onClick}
         style={{ ["--cor-trecho" as string]: CORES[t.classe_risco] }}>
      <div className="trecho-nome">{t.nome}</div>
      <div className="trecho-tags">
        <span className="badge-risco" style={{ background: CORES[t.classe_risco] }}>{ROTULO[t.classe_risco]}</span>
        <span className="tag">💧 {DRENAGEM_LBL[t.drenagem]}</span>
        <span className="tag">↔ {t.largura_m}m</span>
      </div>
    </div>
  );
}

function ordem(c: ClasseRisco): number {
  return { intransitavel: 4, alta: 3, media: 2, baixa: 1 }[c];
}