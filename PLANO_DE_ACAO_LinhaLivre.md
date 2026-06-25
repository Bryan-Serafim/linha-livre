# Plano de Ação — LinhaLivre (antes da suíte de testes)

Dois fronts, executados em paralelo mas com uma dependência compartilhada (Fase 0).
Tudo verificado rodando o pipeline entregue. Os comandos assumem que você está em
`linha-livre-main/modelo/` num ambiente local com `requirements.txt` instalado.

> **Recap dos fatos que motivam o plano** (todos confirmados rodando o repo):
> - Dataset montado dá `intransitavel = 0`. As 3 classes presentes batem ~0,99 (modelo reaprendendo a própria regra). O 0,74 sai da média com a classe vazia de 0,00.
> - `drenagem` = 100% NaN, `revestimento` = constante `terra`, `canaleta` = 100% NaN no dataset → o "fator nº 1" do pitch **não está no modelo**.
> - Âncoras são aplicadas por merge em `[trecho_id, data_obs]` (`aplica_regra.py`). A âncora **só entra** se o `trecho_id` existir E o `data_obs` for uma das 11 datas do dataset.
> - A regra só emite `intransitavel` quando `score_total > 8`; sem campo (drenagem/canaleta), o score nunca chega lá. Logo intransitável hoje **só pode entrar via âncora**.
> - As 11 datas-alvo: 2023-02-15, 2023-03-08, 2023-07-20, 2023-11-15, 2024-01-20, 2024-02-25, 2024-07-15, 2024-10-20, 2025-02-10, 2025-03-15, 2025-08-15.

---

## FASE 0 — Crosswalk nome-de-linha → `trecho_id` (dependência dos dois fronts)

O documento de âncoras nomeia ruas reais (LC-55, RO-140, Travessão B-65...); o modelo
usa `trecho_id` derivado do OSM. Sem mapear um no outro, nenhuma âncora se aplica.

**Passo 0.1 — Gerar a tabela de centroides** (já existe lat/lon por trecho no `chuva.csv`):

```bash
python - <<'PY'
import pandas as pd
c = pd.read_csv("data/interim/chuva.csv").drop_duplicates("trecho_id")
c[["trecho_id","lat_centroide","lon_centroide"]].to_csv("data/interim/centroides.csv", index=False)
print("194 centroides ->", "data/interim/centroides.csv")
PY
```

**Passo 0.2 — Para cada âncora do documento, achar o `trecho_id` mais próximo.**
Geocodifique manualmente o ponto de cada âncora (você conhece a região; pegue lat/lon
aproximada no Google Maps do trecho nomeado) e rode o helper abaixo. Ele devolve os 3
trechos mais próximos pra você escolher por inspeção visual no `trechos.geojson`.

```bash
python - <<'PY'
import pandas as pd, math
cen = pd.read_csv("data/interim/centroides.csv")
# EDITE: (nome_legivel, lat, lon) de cada ancora geocodificada
ANCORAS = [
    ("LC-55 BR-421",            -9.9XX, -63.0XX),
    ("Travessao B-65 RO-257",   -9.9XX, -63.0XX),
    ("RO-140 Rio Crespo",       -9.8XX, -63.0XX),
    # ... complete com as ancoras de confianca alta/media do documento
]
def dist(a,b,c,d): return math.hypot(a-c,b-d)
for nome,la,lo in ANCORAS:
    cen["_d"] = cen.apply(lambda r: dist(la,lo,r.lat_centroide,r.lon_centroide), axis=1)
    top = cen.nsmallest(3,"_d")
    print(f"\n{nome}:")
    for _,r in top.iterrows():
        print(f"   {r.trecho_id}  ({r.lat_centroide:.4f},{r.lon_centroide:.4f})  d={r._d:.4f}")
PY
```

**Passo 0.3 — Validar visualmente.** Abra `trechos/trechos.geojson` (geojson.io ou QGIS)
e confirme que o `trecho_id` escolhido cai mesmo sobre a linha nomeada. Anote o par
final `nome → trecho_id` numa planilha de trabalho.

**Pronto quando:** você tem uma tabela `nome_da_linha | trecho_id | confianca` para,
no mínimo, ~8–12 âncoras (precisamos de ≥5 verificadas pro teste honesto disparar, com
folga). Inclua pelo menos **1 âncora intransitável** (ex.: Ponte da Av. Hugo Frey
arrastada pela correnteza → `intransitavel`).

---

## FRONT A — Métrica honesta (plugar âncoras + fazer a drenagem existir)

### A.1 — Mapear a data do evento para uma das 11 datas-alvo
A âncora só casa se `data_obs` ∈ {11 datas}. Para cada âncora, escolha a data-alvo
mais próxima do evento de chuva (não da publicação). Ex.: evento da estação chuvosa
2024-25 → `2025-02-10` ou `2025-03-15`. Trate a data de publicação como **limite
superior** (conforme a recomendação 1 do próprio documento de âncoras).

### A.2 — Construir `ancoras.csv`
Formato exigido pelo `aplica_regra.py`: `trecho_id,data_obs,trafegabilidade`.

```csv
trecho_id,data_obs,trafegabilidade
RO-ARQ-XXXX,2025-03-15,baixa
RO-ARQ-YYYY,2024-11-15,alta
RO-ARQ-ZZZZ,2025-02-10,intransitavel
```

Regras de classe (use as do documento de âncoras):
- Obras concluídas com data/trecho (confiança alta) → `alta`.
- Indicações parlamentares / obra pós-chuva → `baixa` (peso menor até confirmar pluviometria).
- Ponte arrastada / estrutura levada pela água → `intransitavel`.
- **Não** use a âncora RO-010/fev-2022 (fora do período).

Salve em `data/raw/ancoras.csv`.

### A.3 — (Heavy lift, opcional mas é o que conserta a drenagem) Gerar `campo.csv`
Enquanto `drenagem`/`canaleta` forem NaN, o modelo não tem o fator nº 1. Monte um
`campo.csv` (`trecho_id,revestimento,drenagem,canaleta`) ao menos para os trechos
âncora e os do painel, com `drenagem ∈ {boa,regular,ruim}` derivada da evidência de
campo (SEMOSP/DER/NUCEX) ou de proxy de declividade+solo. Sem isso, o Front A entrega
a métrica honesta mas a história da drenagem continua sem lastro no modelo — então
**decida explicitamente** se a drenagem entra agora ou se vira escopo do Front B.

### A.4 — Remontar o dataset COM âncoras (e campo, se houver)

```bash
python src/rotulagem/aplica_regra.py \
  --chuva data/interim/chuva.csv \
  --solo data/interim/solo.csv \
  --declividade data/interim/declividade.csv \
  --trechos trechos/trechos.geojson \
  --campo data/raw/campo.csv \
  --ancoras data/raw/ancoras.csv \
  --saida data/processed/dataset.csv
```

Confira no output: `ancoras aplicadas: N linhas verificadas` (N ≥ 5) e que a
distribuição de classes **agora inclui intransitável > 0**.

### A.5 — Treinar e ler a métrica honesta

```bash
python src/modelo/treina_rf.py --dataset data/processed/dataset.csv
```

O bloco **"Avaliacao honesta: treino em 'regra', teste em 'verificado'"** só dispara
com ≥5 verificados e ≥10 de regra. **É esse F1-macro verificado** — não o 0,74 da CV —
que vira o número reportável. Anote-o.

**Pronto quando:**
1. `intransitavel > 0` na distribuição;
2. o bloco de avaliação honesta executa e imprime um F1 verificado;
3. você consegue afirmar à banca: "0,74 é a CV circular (modelo reaprendendo a regra);
   o número honesto, medido só nos trechos verificados em campo, é X".

---

## FRONT B — Escopo honesto (alinhar discurso ↔ artefato)

Faça isto **mesmo que o Front A vá em frente** — ele protege contra a banca pegar uma
contradição. Se o Front A não terminar a tempo, o Front B é o piso mínimo de honestidade.

### B.1 — `README.md`
- Onde diz que "a drenagem recalibrou os pesos do modelo": ou (a) reescreva para
  "a drenagem é o fator de projeto priorizado; sua incorporação plena ao modelo está
  em andamento (campo.csv)", ou (b) só mantenha se o Front A.3 entrar de fato.
- Acrescente em "O que ainda pode melhorar": "o modelo atual opera em 3 classes;
  `intransitavel` depende de âncoras verificadas / dados de campo".

### B.2 — `painel/src/data/trechos.ts`
- No cabeçalho e no campo `origem_dado` de cada registro: pare de afirmar
  "risco previsto pelo Random Forest" por registro. Use algo como
  "geometria real (OSM); risco ilustrativo de demonstração" onde o valor é sintético.
  (O README já admite síntese no agregado; o problema é a afirmação por-registro.)

### B.3 — `TESTING.md` (o mais importante pro próximo passo)
- **Seção 4, oráculo do modelo:** separe os dois números. Diga que a CV por trecho dá
  ~0,74 **mas é circular** (e que a aritmética é puxada pela classe vazia); declare que
  **o oráculo de aprovação é o F1 no subconjunto verificado**. Se Front A rodou, ponha o X.
- **MF-03** ("→ intransitável") e **PF-05** ("selecionar trecho intransitável"): ou
  marque "fora do escopo do MVP até haver dado intransitável", ou só os mantenha depois
  que o Front A produzir a classe. Não deixe caso verde sobre comportamento inexistente.
- **Adicione** um caso explícito de limitação: "ME-06 — distribuição com `intransitavel = 0`:
  o relatório imprime a classe com `zero_division=0` e a limitação é declarada à banca"
  (transforma o gap num teste honesto, em vez de num bug escondido).

### B.4 — `bot/bot.js`
- O mapa `RISCO` é estático e `c-70` está hardcoded como INTRANSITÁVEL, desligado do
  modelo. Para a banca: ou adicione um comentário/aviso de que o bot é demonstração
  rule-based (alinhado com "demonstrado no pitch" do README), ou documente no TESTING.md
  que o oráculo do bot é a tabela `RISCO` local, não o modelo. (Já está coerente com o
  texto; só não deixe a banca achar que o bot consulta o RF.)

**Pronto quando:** nenhum documento (README, trechos.ts, TESTING.md) afirma uma
capacidade que o artefato não tem — drenagem no modelo, classe intransitável, ou
predição RF por registro no painel.

---

## Sequência recomendada (pra não retrabalhar)

1. **Fase 0** (crosswalk) — bloqueia o Front A inteiro. Faça primeiro.
2. **Front B.3** (TESTING.md) em rascunho — porque ele define o oráculo que o Front A
   precisa produzir. Escreva o oráculo honesto antes de medir.
3. **Front A.2 + A.4 + A.5** — gere âncoras, remonte, treine, capture o F1 honesto e a
   classe intransitável.
4. **Decisão de drenagem (A.3):** se der tempo, entra no modelo (mantém o discurso do
   pitch); se não, vira limitação declarada no Front B.1.
5. **Front B.1, B.2, B.4** — preencha os números/limitações reais que o Front A revelou.
6. Só então: escrever a suíte de testes em cima de um sistema cujo discurso bate com o código.

## Checklist final (antes de declarar pronto pra testar)

- [ ] Crosswalk `nome → trecho_id` validado visualmente (≥8 âncoras, ≥1 intransitável)
- [ ] `ancoras.csv` com ≥5 linhas que casam em `[trecho_id, data_obs]`
- [ ] `dataset.csv` remontado mostra `intransitavel > 0` e `N verificadas ≥ 5`
- [ ] `treina_rf.py` dispara o bloco de avaliação honesta e imprime o F1 verificado
- [ ] Decisão tomada e registrada sobre drenagem (entra no modelo OU vira limitação)
- [ ] README, trechos.ts, TESTING.md, bot.js sem nenhuma afirmação que o código não sustenta
- [ ] TESTING.md distingue claramente CV circular (0,74) do F1 honesto (oráculo de aprovação)
