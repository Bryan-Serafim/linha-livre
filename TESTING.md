# Plano Mínimo de Teste — LinhaLivre

**Equipe Hagatangos** — Hackathon Extensionista IFRO Ariquemes 2026/1
**Disciplina:** Teste de Software — IFRO Campus Ariquemes
**Categoria:** Desafio Empresa e Comunidade (proponente: Quanyx Tecnologia)

Este documento é a evidência de qualidade da solução exigida pelo edital
(critério "Impacto, validação" e checklist do Anexo I). Ele define, para cada
componente do LinhaLivre, **o oráculo** (como sabemos que uma saída está
correta), os **casos de caminho feliz** e os **casos de caminho de erro**,
ancorados nos conceitos da disciplina.

---

## 1. Fundamentação: o que é um oráculo de teste

Um **oráculo de teste** é o mecanismo que decide se o resultado observado de uma
execução está correto (BSTQB, 2023, *Certified Tester Foundation Level* v4.0).
Sem oráculo não há teste — há apenas execução. Para cada componente abaixo
declaramos explicitamente o oráculo adotado, porque os três têm naturezas
diferentes:

- **Painel web** — oráculo **especificado**: a saída correta é definida pela
  fonte de dados (`trechos.ts`) e pelas regras de interface. É verificável de
  forma determinística.
- **Bot de WhatsApp** — oráculo **especificado**: cada comando tem uma resposta
  esperada definida em regra (rule-based). Determinístico.
- **Modelo preditivo (Random Forest)** — oráculo **probabilístico / derivado**:
  não existe base pública rotulada de trafegabilidade para vicinais de Rondônia,
  então o "gabarito" é **construído** por supervisão fraca com verificação
  amostral (ver `modelo/docs/PROTOCOLO_ROTULAGEM.md`). O oráculo aqui não é uma
  saída exata por linha, e sim uma **métrica agregada** (F1-macro) medida contra
  o subconjunto verificado em campo.

A distinção entre caminho feliz (*happy path*) e caminho de erro segue a noção
de **particionamento** do espaço de entradas: o caminho feliz exercita entradas
válidas e esperadas; os caminhos de erro exercitam entradas inválidas, de
fronteira e de exceção, onde defeitos costumam se concentrar (COUTINHO;
NASCIMENTO, 2025; BSTQB, 2023, cap. sobre técnicas de caixa-preta e análise de
valor limite).

---

## 2. Componente: Painel Web (MVP avaliado pela banca)

**URL:** https://linha-livre.vercel.app/
**Tecnologias:** React, TypeScript, Vite, Leaflet, OpenStreetMap.
**Fonte de verdade:** `painel/src/data/trechos.ts` (54 trechos, geometria real
do OSM; risco previsto pelo Random Forest).

### Oráculo
Uma renderização do painel está **correta** quando, para cada trecho:
1. a **cor** exibida no mapa e no card corresponde à `classe_risco` do trecho em
   `trechos.ts` (mapeamento fixo: baixa→verde, média→amarelo, alta→laranja,
   intransitável→vermelho);
2. os **atributos exibidos** no detalhe (drenagem, solo, largura, chuva 72h)
   são exatamente os valores do registro correspondente;
3. a **geometria** desenhada corresponde ao array `path` do trecho.

O oráculo é a própria estrutura de dados tipada (`interface Trecho`): a saída
visual é uma função determinística dela.

### 2.1 Casos de caminho feliz

| ID | Entrada / ação | Resultado esperado (oráculo) |
|----|----------------|------------------------------|
| PF-01 | Abrir a URL do painel | Mapa de Ariquemes carrega centralizado; todos os 54 trechos aparecem coloridos por risco; legenda visível |
| PF-02 | Clicar em um trecho de risco "alta" no mapa | Card de detalhe abre com `classe_risco = alta` (laranja), e drenagem/solo/largura/chuva idênticos a `trechos.ts` |
| PF-03 | Clicar no mesmo trecho de novo (ou em "ver todas") | Volta à visão geral, sem trecho selecionado |
| PF-04 | Abrir no celular e alternar abas "Mapa" / "Painel" | Cada aba mostra sua visão; estado de seleção é preservado na troca |
| PF-05 | Selecionar um trecho "intransitável" | Card vermelho, com destaque visual (pulse) coerente com o nível crítico |

### 2.2 Casos de caminho de erro / fronteira

| ID | Entrada / ação | Resultado esperado (oráculo) |
|----|----------------|------------------------------|
| PE-01 | Carregar o painel com a aba/rede offline (tiles do OSM indisponíveis) | A camada de trechos ainda renderiza sobre fundo neutro; o app não quebra (sem tela branca) |
| PE-02 | Trecho com `chuva_72h_mm = 0` (valor de fronteira) | Card exibe "0 mm" corretamente, sem campo vazio ou `NaN` |
| PE-03 | Redimensionar para largura mínima de celular (~320px) | Layout não estoura; abas continuam acessíveis; mapa permanece interativo |
| PE-04 | Clicar rapidamente em vários trechos em sequência | Apenas o último selecionado fica ativo; sem cards duplicados ou estado inconsistente |
| PE-05 | (verificação de build) Adicionar um trecho com `classe_risco` fora do union type | O TypeScript **recusa o build** — o tipo `ClasseRisco` atua como oráculo estático em tempo de compilação |

> PE-05 é exemplo de **teste estático** (BSTQB, 2023): o sistema de tipos
> impede uma classe inteira de defeitos antes de qualquer execução.

---

## 3. Componente: Bot de WhatsApp

**Arquivo:** `bot/bot.js` (whatsapp-web.js, rule-based).
**Comandos:** `risco <linha>`, `atolei <linha>`, `cadastrar <linha>`, atalhos
numéricos `1/2/3`, saudações (menu).

### Oráculo
Cada comando tem uma resposta **especificada** em código. A saída está correta
quando o texto retornado corresponde à regra do comando para a entrada dada.
Linhas conhecidas pelo bot: `C-65` (alta), `C-70` (intransitável), `C-60`
(média), `B-40` (baixa).

### 3.1 Casos de caminho feliz

| ID | Mensagem do usuário | Resultado esperado (oráculo) |
|----|---------------------|------------------------------|
| BF-01 | `oi` (ou "menu", "bom dia") | Retorna o menu com as 3 opções |
| BF-02 | `risco C-70` | Retorna risco **INTRANSITÁVEL** 🔴, drenagem "ausente", aviso de evitar carga pesada |
| BF-03 | `risco B-40` | Retorna risco **BAIXA** 🟢, drenagem "boa", mensagem de trânsito possível |
| BF-04 | `atolei C-65` | Confirma "Relato registrado", ecoa a linha, incrementa o array `relatos` |
| BF-05 | `cadastrar C-65` | Confirma cadastro para alertas da linha C-65 |
| BF-06 | `1` (atalho do menu) | Pede a linha: "envie por exemplo: risco C-70" |

### 3.2 Casos de caminho de erro / fronteira

| ID | Mensagem do usuário | Resultado esperado (oráculo) |
|----|---------------------|------------------------------|
| BE-01 | `risco C-99` (linha inexistente) | Mensagem de não encontrada, sugerindo C-65/C-70/C-60/B-40 — **sem travar** |
| BE-02 | `risco` (sem linha) | Faz fallback para `c-70` (default definido em código) e responde mesmo assim |
| BE-03 | `RISCO c-70` / `  risco   C-70 ` (caixa e espaços) | Normaliza (lowercase + trim) e responde igual a BF-02 |
| BE-04 | `atolei` (sem linha) | Registra relato com linha "não informada", sem quebrar |
| BE-05 | Texto aleatório (`asdkfj`) | Faz fallback para o menu, em vez de erro ou silêncio |
| BE-06 | Mensagem de grupo (`@g.us`) ou status | Bot **ignora** (não responde), conforme guarda no topo do handler |

> As guardas de BE-06 (`fromMe`, `status@broadcast`, `@g.us`) são **casos de
> exceção** tratados explicitamente — evitam loops e respostas indevidas.

---

## 4. Componente: Modelo Preditivo (Random Forest)

**Arquivos:** `modelo/src/modelo/treina_rf.py`, `modelo/src/rotulagem/aplica_regra.py`.
**Protocolo do oráculo:** `modelo/docs/PROTOCOLO_ROTULAGEM.md`.

### Oráculo (probabilístico)
Não há gabarito externo de trafegabilidade. O oráculo é construído em três camadas:

1. **Função de rotulagem** (regra física do protocolo, Seção 3) gera label
   provisório para todos os trechos — `label_origin = "regra"`.
2. **Verificação amostral** por evidência real (campo SEMOSP/DER/NUCEX, notícia
   datada, observação de seca) sobrescreve a regra onde diverge —
   `label_origin = "verificado"`.
3. A **métrica honesta** é o F1-macro medido **apenas no subconjunto
   verificado**, com validação cruzada **por trecho** (`GroupKFold` em
   `trecho_id`), nunca aleatória por linha — para impedir vazamento espacial.

O critério de aprovação adotado: **F1-macro ≈ 0,74** no protocolo atual, valor
reportável à banca.

### 4.1 Casos de caminho feliz

| ID | Entrada / ação | Resultado esperado (oráculo) |
|----|----------------|------------------------------|
| MF-01 | Rodar `treina_rf.py` no dataset processado | Imprime distribuição de classes, F1-macro por fold e médio, matriz de confusão e importância das features |
| MF-02 | Trecho seco, drenagem boa, solo arenoso | Regra/modelo classificam como **baixa** (escoamento adequado) |
| MF-03 | Trecho encharcado (chuva_72h ≥ 80), drenagem ausente | Regra/modelo classificam como **intransitável** |
| MF-04 | Conferir que `trecho_id` e coordenadas **não** entram como feature | Lista de features impressa exclui as colunas de `EXCLUI` (anti-vazamento) |

### 4.2 Casos de caminho de erro / fronteira

| ID | Entrada / ação | Resultado esperado (oráculo) |
|----|----------------|------------------------------|
| ME-01 | Feature numérica faltante (NaN) em uma linha | `prepara()` preenche com a mediana; o treino não quebra |
| ME-02 | Categoria de solo nunca vista no treino | `pd.get_dummies(dummy_na=True)` cria coluna; sem exceção |
| ME-03 | Classe "intransitável" com pouquíssimos exemplos | F1-macro reportado com `zero_division=0`; a classe rara não derruba a execução, e a limitação é declarada na banca |
| ME-04 | Tentativa de avaliar treinando e testando no mesmo trecho | `GroupKFold` impede; split é sempre por `trecho_id` (oráculo de metodologia) |
| ME-05 | Circularidade regra→modelo | Declarada explicitamente no protocolo (Seção 0): o ganho real vem das correções verificadas e das interações entre features, não de reaprender a regra |

---

## 5. Rastreabilidade aos conceitos da disciplina

| Conceito (BSTQB, 2023; Coutinho; Nascimento, 2025) | Onde aparece neste plano |
|----|----|
| Oráculo de teste | Seções 2, 3 e 4 (um oráculo declarado por componente) |
| Particionamento / classes de equivalência | Separação caminho feliz × caminho de erro |
| Análise de valor limite (BVA) | PE-02 (chuva = 0), BE-02 (comando sem argumento), MF-02/03 (fronteiras de chuva) |
| Tratamento de exceção | BE-06 (guardas do bot), PE-01 (rede offline) |
| Teste estático | PE-05 (tipos TypeScript barram defeito em compilação) |
| Independência de teste / anti-vazamento | ME-04 (GroupKFold por trecho) |
| Limitações declaradas (teste honesto) | ME-03, ME-05 |

---

## 6. Status de execução

Os casos de caminho feliz dos três componentes foram exercitados manualmente
durante o desenvolvimento: o painel está online e navegável; o bot foi testado
em conversa real no WhatsApp Business (QR-code); o modelo treina e reporta
F1-macro ≈ 0,74. Os casos de erro de fronteira foram verificados nos pontos
indicados acima. Este plano é o **mínimo** exigido pelo edital como evidência de
qualidade; a suíte automatizada formal da disciplina foi desenvolvida sobre o
projeto-base de internet banking (repositório separado).

---

## Referências

- BSTQB. *Certified Tester Foundation Level (CTFL) — Syllabus v4.0*. Brazilian
  Software Testing Qualifications Board, 2023.
- COUTINHO, J.; NASCIMENTO, R. *Fundamentos e práticas de teste de software*. 2025.
- RATNER, A. et al. *Data Programming: Creating Large Training Sets, Quickly*.
  NeurIPS, 2016. (base metodológica da supervisão fraca usada no oráculo do modelo)
