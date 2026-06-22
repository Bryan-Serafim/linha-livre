# LinhaLivre — Painel Web

Painel de gestão das estradas vicinais de Ariquemes. Mostra os trechos
monitorados num mapa, coloridos por nível de risco de trafegabilidade.

## Rodar localmente
```
npm install
npm run dev
```
Abre em http://localhost:5173

## Subir no Vercel
1. Suba esta pasta num repositório GitHub
2. No Vercel: New Project > importe o repo
3. Framework: Vite (detecta sozinho). Build: `npm run build`. Output: `dist`
4. Deploy. Pronto, link público sem instalação (requisito do edital).

## >>> INTEGRAÇÃO COM O MODELO (Leo) <<<
O painel lê os dados de `src/data/trechos.ts`.
Para plugar o output real do Random Forest, basta gerar os trechos
nesse mesmo formato (id, nome, classe_risco, drenagem, solo, largura_m,
chuva_72h_mm, path com coordenadas). classe_risco aceita:
"alta" | "media" | "baixa" | "intransitavel".

Se o modelo exportar um JSON, dá pra trocar o import por um fetch
desse JSON — a estrutura é a mesma.

## Stack
React + TypeScript + Vite + Leaflet (mapa) + OpenStreetMap (tiles).
Tudo gratuito, sem chave de API.
