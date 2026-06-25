# LinhaLivre — contexto para o Claude Code

Plataforma preditiva de trafegabilidade de estradas vicinais (Ariquemes/Vale do
Jamari, RO). Três componentes: `modelo/` (Random Forest + pipeline de dados),
`painel/` (React/Vite) e `bot/` (WhatsApp, demo rule-based).

## Ambiente
- Roda no Google Cloud Shell. **Só `$HOME` persiste.**
- Python via venv em `~/.venv-linhalivre` — **sempre ative antes de rodar Python**:
  `source ~/.venv-linhalivre/bin/activate`
- Deps do modelo: `pip install -r modelo/requirements.txt` (rasterio/geopandas via wheels).
- **Não use `sudo apt install`** para resolver dependência: pacotes de sistema não persistem.

## Estado atual VERIFICADO (não reabrir como dúvida)
Atualizado na branch `feat/malha-estendida-ancoras-2022` (malha estendida + âncoras
fev-2022). Rodando o pipeline com `--ancoras data/raw/ancoras.csv`, confirmou-se:
1. **Malha estendida: 194 → 6.126 trechos.** `chuva.csv` e `declividade.csv` cobrem
   os 6.126 trechos em **12 datas-alvo** (inclui a nova `2022-02-23`). **`solo.csv` foi
   regenerado (jun/2026) e agora cobre 6.123/6.126 trechos com solo REAL** (IBGE pedologia
   250k, versão 2023, re-baixada; o `.dbf` antigo tinha sido perdido). Só 3 trechos ficam
   NaN. solo_risco: 0=2.610 (LATOSSOLO), 1=3.513 (ARGISSOLO), 3=3.
2. **`intransitavel > 0`** agora: 56 no dataset (2 via âncora + ~54 que a regra emite na
   malha estendida; subiu de 49→56 com o solo real). As classes da regra ainda são circulares.
3. **CV F1-macro = 0,975 ± 0,029 — circular e NÃO reportável** (era 0,987 antes do solo
   real). É o modelo reaprendendo a própria regra.
4. **F1 honesto = 0,091** (treino em `regra` 73.503, teste nas **9 âncoras
   verificadas**, n pequeno). Acerto 2/9 — **inalterado pelo solo real**. É **este** o número
   reportável: o modelo treinado na regra **não reproduz** os eventos reais de fev-2022
   (0/2 nas pontes arrastadas → intransitável). Esse gap é o argumento por dado de drenagem.
5. **`drenagem` = 100% NaN**, `revestimento` ≈ constante `terra`, `canaleta` = 100% NaN.
   O "fator nº 1" do pitch (drenagem) **continua fora do modelo**. Solo real agora entra com
   importância pequena mas não-nula (`solo_dren_idx`/`solo_relevo`/`solo_textura` ~0,01 cada).
   Drivers reais: chuva_72h/7d/30d, frac_ingreme, declividade, mês.

## Restrições técnicas que importam
- Âncoras são aplicadas por merge em `[trecho_id, data_obs]` (`aplica_regra.py`).
  A âncora só entra se o `trecho_id` existir E o `data_obs` for uma das 12 datas-alvo:
  2022-02-23, 2023-02-15, 2023-03-08, 2023-07-20, 2023-11-15, 2024-01-20, 2024-02-25,
  2024-07-15, 2024-10-20, 2025-02-10, 2025-03-15, 2025-08-15.
- `ancoras.csv` (final, pronto): 9 âncoras, todas em `2022-02-23`, 2 `intransitavel`
  + 7 `baixa`. Crosswalk nome→trecho_id em `ancoras_2022.csv` (doc curado, lat/lon)
  e `ancoras_revisao.csv` (trecho_id antigo→novo na malha estendida, com dist_km).
- Na malha estendida a regra **passou a emitir `intransitavel` por conta própria**
  (score_total > 8 em trechos íngremes sob chuva de fev-2022). Antes dependia de âncora.
- O bloco de avaliação honesta exige ≥5 linhas `verificado` e ≥10 de `regra`.
- O painel (`painel/src/data/trechos.ts`) e o bot (`bot/bot.js`) são desacoplados do
  modelo — dados feitos à mão. Não afirmar "predição RF por registro" sem lastro.

## Objetivo da etapa: executar o PLANO_DE_ACAO_LinhaLivre.md
- **Front A (métrica honesta): CONCLUÍDO.** Crosswalk feito, `ancoras.csv` montado,
  dataset remontado com `--ancoras`, treinado. `intransitavel > 0` e o bloco de
  avaliação honesta dispara (F1 verificado = 0,091, n=9). Decisão de drenagem ainda
  em aberto: `--campo` NÃO entrou; drenagem fica como limitação declarada (Front B.1).
- **Front B (escopo honesto): CONCLUÍDO.** Alinhados README (drenagem = fator de projeto,
  não "recalibrou pesos"; risco do painel = ilustrativo, não RF por registro), `trechos.ts`
  (cabeçalho + 27× `origem_dado` → "risco ilustrativo de demonstração"), `bot.js` (comentário:
  demo rule-based, oráculo = tabela `RISCO` local). No TESTING.md a CV 0,975 circular foi
  separada do F1 honesto 0,091 (n=9, oráculo de aprovação); MF-03 não atribui mais a
  intransitável à drenagem; PF-05 marcado fora-de-escopo (sem trecho intransitável na demo);
  ME-06/ME-07 novos (CV vs. honesta; drenagem ausente). Nenhum "0,74" restante.
- **PRÓXIMO: suíte de testes** sobre um discurso já alinhado ao código (item 6 do plano).

Sequência e critérios de "pronto" detalhados em `PLANO_DE_ACAO_LinhaLivre.md` (raiz).

## Comandos de referência
```bash
source ~/.venv-linhalivre/bin/activate
cd modelo && mkdir -p data/processed
python src/rotulagem/aplica_regra.py --chuva data/interim/chuva.csv \
  --solo data/interim/solo.csv --declividade data/interim/declividade.csv \
  --trechos trechos/trechos.geojson --ancoras data/raw/ancoras.csv \
  --saida data/processed/dataset.csv
python src/modelo/treina_rf.py --dataset data/processed/dataset.csv
```

## Regras de trabalho
- Não inventar dado de campo nem âncora: classe de âncora vem da evidência citável
  (documento de curadoria de âncoras). Obra concluída → alta; indicação/pós-chuva →
  baixa; estrutura levada pela água → intransitavel. **O evento RO-010/fev-2022 AGORA
  está no escopo** (decisão da branch `feat/malha-estendida-ancoras-2022`): a malha foi
  estendida e `2022-02-23` virou data-alvo justamente para ancorar essas pontes do DER.
- Mudou algo no modelo? Rode `treina_rf.py` e reporte a nova distribuição + F1 honesto.
- `git push` com frequência (não confiar só no `$HOME`).
