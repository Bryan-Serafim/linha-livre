# Runbook — Caminho A: estender malha + aplicar âncoras de 2022

Objetivo: fazer `intransitavel > 0` e a avaliação honesta disparar, aplicando
`ancoras_2022.csv` sobre uma malha de trechos estendida que cubra Monte Negro/Cacaulândia.

Legenda: **[VOCÊ]** = ação manual sua · **[CC]** = o Claude Code executa.
Repo raiz: `~/linha-livre-RF-training`. venv: `~/.venv-linhalivre`.

> **Bounding box alvo (união da malha atual + todas as âncoras + folga ~5 km):**
> `lat_min = -10.4463 · lat_max = -9.7482 · lon_min = -63.3447 · lon_max = -62.3705`

---

## PASSO 0 — Preparação  [CC]
```bash
cd ~/linha-livre-RF-training
git checkout main && git pull
git checkout -b feat/malha-estendida-ancoras-2022
source ~/.venv-linhalivre/bin/activate
pip install -r requirements.txt
# extrai a pedologia versionada (o DEM agora vem dos tiles COP30 do Passo 1B)
mkdir -p data/raw/_extr
unzip -o data/raw/compressed/pedo_tabelas.zip -d data/raw/_extr       # pedo_area.shp etc.
find data/raw/_extr -name "*.shp"
```

## PASSO 1 — Baixar as vias do Overpass  [VOCÊ]
No https://overpass-turbo.eu/, cole a query abaixo (bbox já na ordem S,W,N,E do Overpass),
rode, e exporte como **GeoJSON**. Salve em `data/raw/vias_osm.geojson`.

```
[out:json][timeout:180];
way["highway"~"^(primary|secondary|tertiary|unclassified|track|residential)$"]
   (-10.4463,-63.3447,-9.7482,-62.3705);
out geom;
```
> Confira no preview se a RO-010 (Monte Negro↔Cacaulândia), a RO-140 e a RO-257 aparecem
> — são as rodovias das âncoras. Se faltar alguma, é porque o tipo dela não entrou no filtro;
> acrescente o tipo (ex.: `trunk`) e rode de novo.

## PASSO 1B — Baixar e mesclar os tiles COP30 (declividade real)  [VOCÊ baixa · CC mescla]
**[VOCÊ]** baixe os **4 tiles** Copernicus GLO-30 que cobrem o bbox (resolução **30 m**,
EPSG:4326, **não** o GLO-90) e largue-os em `data/raw/cop30/`:
- `S11_W064`, `S11_W063`, `S10_W064`, `S10_W063`
  (o nome do tile é o canto **sul-oeste**; lat −10.4463 mora no tile **S11**, lon −63.34 no **W064**).

**[CC]** mescla os 4 num único DEM e **verifica a cobertura do bbox antes de prosseguir**:
```bash
mkdir -p data/raw/_extr
# 1) mescla (tenta gdal_merge.py; cai para gdalwarp se não houver)
if command -v gdal_merge.py >/dev/null; then
  gdal_merge.py -o data/raw/_extr/output_hh.tif data/raw/cop30/*.tif
else
  gdalwarp data/raw/cop30/*.tif data/raw/_extr/output_hh.tif
fi
# 2) verifica CRS, resolução e se o DEM abrange o bbox alvo
python3 - << 'PY'
import rasterio
BB=dict(W=-63.3447,S=-10.4463,E=-62.3705,N=-9.7482)
with rasterio.open("data/raw/_extr/output_hh.tif") as d:
    b=d.bounds; px=abs(d.transform.a)
    print("CRS:",d.crs," resolucao_graus:",round(px,6)," (~",round(px*111320),"m )")
    print("DEM  W,S,E,N:",round(b.left,4),round(b.bottom,4),round(b.right,4),round(b.top,4))
    cobre = b.left<=BB["W"] and b.bottom<=BB["S"] and b.right>=BB["E"] and b.top>=BB["N"]
    print("COBRE O BBOX ALVO?", "SIM" if cobre else "NAO -- falta tile; confira S11/W064")
    assert str(d.crs).endswith("4326"), "DEM nao esta em EPSG:4326 -- nao reprojete p/ UTM antes"
PY
```
> Se imprimir **NAO**, falta um tile (quase sempre o **S11** do sul, que cobre Rio Pardo).
> Baixe o que falta e rode de novo antes de seguir. Se a resolução vier ~90 m, você pegou
> o GLO-90 — baixe o GLO-30.

## PASSO 2 — Gerar a malha estendida  [CC]
```bash
python src/coleta/gera_trechos.py \
  --entrada data/raw/vias_osm.geojson \
  --regiao ARQ --alvo-km 1.5 \
  --saida trechos/trechos.geojson
# confira o nº de trechos (deve ser bem > 194)
```

## PASSO 3 — Adicionar a data de 2022 às datas-alvo  [CC]
```bash
grep -q '2022-02-23' data/raw/datas_alvo.csv || echo '2022-02-23' >> data/raw/datas_alvo.csv
sort -u data/raw/datas_alvo.csv -o data/raw/datas_alvo.csv   # mantém cabeçalho no topo? confira
cat data/raw/datas_alvo.csv
```
> Garanta que a 1ª linha continue sendo o cabeçalho `data_obs`. Se o `sort` o tiver
> deslocado, recoloque-o no topo.

## PASSO 4 — Recoletar chuva (todas as datas, malha nova)  [CC]
Precisa de rede (Open-Meteo) — o Cloud Shell tem.
```bash
python src/coleta/coleta_open_meteo.py \
  --trechos trechos/trechos.geojson \
  --datas data/raw/datas_alvo.csv \
  --saida data/interim/chuva.csv
```

## PASSO 5 — Declividade (por trecho)  [CC]
Usa o DEM mesclado do Passo 1B (agora com cobertura real do bbox).
```bash
python src/coleta/extrai_declividade.py \
  --dem data/raw/_extr/output_hh.tif \
  --trechos trechos/trechos.geojson --buffer 20 \
  --saida data/interim/declividade.csv
```
> Com os 4 tiles mesclados, a contagem de trechos "com cobertura do DEM" deve ser **alta**
> (poucos defaults). Se ainda houver muitos defaults, é sinal de tile faltando — volte ao 1B.

## PASSO 6 — Solo (por trecho)  [CC]
bbox do `extrai_solo` é na ordem **W S E N**.
```bash
SHP=$(find data/raw/_extr -name "pedo_area.shp" | head -1)
python src/coleta/extrai_solo.py \
  --solo "$SHP" \
  --trechos trechos/trechos.geojson \
  --bbox -63.3447 -10.4463 -62.3705 -9.7482 \
  --saida data/interim/solo.csv
```

## PASSO 7 — Crosswalk + montar ancoras.csv limpo  [CC]
Re-mapeia as coordenadas das âncoras (ordem **lat, lon**) para os novos `trecho_id`,
fixa `data_obs = 2022-02-23`, e gera dois arquivos: o `ancoras.csv` (3 colunas que o
`aplica_regra` espera) e um `ancoras_revisao.csv` para conferência humana.
```bash
python3 - << 'PY'
import pandas as pd, math, csv
cen = pd.read_csv("data/interim/chuva.csv").drop_duplicates("trecho_id")[
        ["trecho_id","lat_centroide","lon_centroide"]]
def km(la,lo,r):
    R=6371; dla=math.radians(r.lat_centroide-la); dlo=math.radians(r.lon_centroide-lo)
    x=math.sin(dla/2)**2+math.cos(math.radians(la))*math.cos(math.radians(r.lat_centroide))*math.sin(dlo/2)**2
    return 2*R*math.asin(math.sqrt(x))
out=[]; rev=[]
with open("data/raw/ancoras_2022.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        lat,lon = [float(x) for x in row["long, lat"].split(",")]   # 1º=lat, 2º=lon
        c=cen.copy(); c["_d"]=c.apply(lambda r:km(lat,lon,r),axis=1)
        t=c.nsmallest(1,"_d").iloc[0]
        out.append({"trecho_id":t.trecho_id,"data_obs":"2022-02-23",
                    "trafegabilidade":row["trafegabilidade"]})
        rev.append({"linha":row["linha"],"classe":row["trafegabilidade"],
                    "trecho_id":t.trecho_id,"dist_km":round(t._d,2),
                    "obs":row.get("observacao","")})
pd.DataFrame(out).to_csv("data/raw/ancoras.csv", index=False)
pd.DataFrame(rev).to_csv("data/raw/ancoras_revisao.csv", index=False)
print("== revisão (confira dist_km e classe) =="); 
print(pd.DataFrame(rev).to_string(index=False))
PY
```
> **[VOCÊ] revise `ancoras_revisao.csv` antes de prosseguir:**
> 1. `dist_km` alto (> ~2 km) = a malha ainda não cobre aquela âncora → ajuste a query
>    Overpass (Passo 1) para incluir a via e refaça a partir do Passo 2.
> 2. Confira a semântica de `trafegabilidade`: **baixa = via ruim/pouco trafegável**
>    (não "risco baixo"). Em particular a ponte Rio Bela Vista ("cabeceiras
>    comprometidas, não arrastada") talvez deva ser `media`, não `baixa`.

## PASSO 8 — Montar o dataset com âncoras  [CC]
```bash
mkdir -p data/processed
python src/rotulagem/aplica_regra.py \
  --chuva data/interim/chuva.csv --solo data/interim/solo.csv \
  --declividade data/interim/declividade.csv --trechos trechos/trechos.geojson \
  --ancoras data/raw/ancoras.csv \
  --saida data/processed/dataset.csv
```
> No output, confirme: **`intransitavel > 0`** na distribuição e **`N verificadas >= 5`**.
> Se as âncoras intransitáveis não entraram, o problema é dist_km alto (Passo 7.1) ou a
> data não casou (cheque que 2022-02-23 está no `chuva.csv`).

## PASSO 9 — Treinar e verificar  [CC]
```bash
python src/modelo/treina_rf.py --dataset data/processed/dataset.csv | tee docs/RESULTADOS.md
```
> Critério de sucesso: o bloco **"Avaliacao honesta: treino em 'regra', teste em
> 'verificado'"** dispara e imprime um F1 verificado. Esse é o número honesto.

## PASSO 10 — Documentar limitações e abrir PR  [CC]
Crie `docs/MELHORIAS_MODELO.md` registrando: (a) declividade agora com cobertura real
(4 tiles COP30 GLO-30 mesclados) — conferir nº de trechos com cobertura; (b) âncoras de
2022 mapeadas para 2022-02-23 — premissa de que a condição vale para a data-âncora;
(c) drenagem ainda fora do modelo (campo.csv futuro); (d) revisão de classe das âncoras
feita no Passo 7.
```bash
git add -A
git commit -m "feat: malha estendida + ancoras 2022 (intransitavel>0, avaliacao honesta)"
git push -u origin feat/malha-estendida-ancoras-2022
```
Abra o PR com: distribuição antes/depois, o F1 verificado, e a lista de limitações.

---

## Checklist de sucesso
- [ ] `vias_osm.geojson` cobre RO-010 / RO-140 / RO-257
- [ ] 4 tiles COP30 (GLO-30) mesclados; verificação imprimiu **COBRE O BBOX ALVO? SIM**
- [ ] malha estendida gerada (trechos >> 194)
- [ ] `2022-02-23` em `datas_alvo.csv` e presente em `chuva.csv`
- [ ] `ancoras_revisao.csv` revisado: todas as âncoras com `dist_km` pequeno; classes conferidas
- [ ] dataset com `intransitavel > 0` e `>= 5` verificadas
- [ ] `treina_rf.py`: bloco de avaliação honesta dispara; F1 verificado em `docs/RESULTADOS.md`
- [ ] limitações documentadas; PR aberto
