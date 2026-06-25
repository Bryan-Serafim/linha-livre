# LinhaLivre

Plataforma preditiva de trafegabilidade para as estradas vicinais (linhas) de Ariquemes, Rondônia. O sistema cruza dados de clima, solo, topografia e drenagem para antecipar quais trechos têm maior risco de ficarem intransitáveis, transformando a manutenção reativa em ação preventiva.

## Equipe

- **Nome da equipe:** Hagatangos
- **Integrantes:** Bryan, Alexsandro, Leonardo e Yago
- **Curso/Turma:** Tecnologia em Análise e Desenvolvimento de Sistemas (ADS) — IFRO Campus Ariquemes
- **Categoria:** Desafio Empresa e Comunidade
- **Desafio:** Plataforma Preditiva de Trafegabilidade (proponente: Quanyx Tecnologia)

## Problema

O escoamento da produção agropecuária e aquícola de Ariquemes depende das estradas vicinais não pavimentadas, chamadas localmente de linhas. Durante a estação chuvosa, esses trechos ficam intransitáveis: caminhões atolam, produtores ficam isolados e a logística da região trava.

Hoje a resposta é reativa. A manutenção só acontece depois que o problema já ocorreu, e não existe registro histórico estruturado de quais trechos falham nem quando. Faltam ferramentas que cruzem as condições de cada via com a previsão do tempo para antecipar o risco.

**Público impactado:** produtores rurais (incluindo piscicultores e produtores de leite), motoristas de transporte de carga, cooperativas locais, e a Secretaria Municipal de Obras (SEMOSP), que gerencia as linhas, além do DER, responsável pelos travessões.

## Solução

O LinhaLivre é composto por três partes que trabalham juntas:

1. **Modelo preditivo (Random Forest):** classifica cada trecho de estrada em quatro níveis de risco (baixa, média, alta, intransitável), a partir de dados reais de chuva, solo, topografia e características da via.

2. **Painel web de gestão:** um mapa de Ariquemes que mostra os trechos coloridos por risco, permitindo à SEMOSP priorizar a manutenção preventiva com critério técnico. É a interface que a banca acessa.

3. **Canal de relato e alerta via WhatsApp:** o produtor recebe avisos de risco e pode relatar atoleiros, alimentando o sistema. Cada relato vira um registro georreferenciado, criando o histórico que hoje não existe.

Um achado central, validado em campo, orienta a solução: o fator número um para uma linha ficar intransitável não é a chuva, e sim a drenagem. A chuva é apenas o gatilho. Hoje os dados de drenagem/canaleta por trecho ainda não estão disponíveis em base estruturada, então a drenagem entra como o **fator de projeto priorizado** — a coleta de campo e sua incorporação plena ao modelo estão em andamento. Os drivers já ativos no modelo são a chuva acumulada (72h/7d/30d) e a topografia (declividade, fração íngreme); a drenagem é o próximo dado a fechar essa lacuna, e é justamente esse gap entre regra e campo que diferencia a solução de uma abordagem que olharia apenas para a previsão do tempo.

## Link do MVP

Painel online: https://linha-livre.vercel.app/

Acessível por navegador, sem instalação, no computador e no celular (no celular, alterne entre as abas Mapa e Painel).

## Vídeo de pitch

https://drive.google.com/file/d/1dMcQP3R2NBf3V7ifVhTon5Qa23Lw_c5h/view?usp=sharing

## Pitch ou apresentação

https://canva.link/nrl11wa8sovhy0w

## Como testar

1. Acesse https://linha-livre.vercel.app/
2. No mapa, observe os trechos de estrada coloridos conforme o nível de risco (veja a legenda no canto inferior direito).
3. Clique em um trecho, no mapa ou na lista lateral, para ver seus detalhes: drenagem, solo, largura e chuva acumulada. Clique novamente, ou no botão "ver todas", para voltar à visão geral.
4. No celular, use as abas "Mapa" e "Painel" no topo para alternar entre as duas visões.

Não é necessário login.

## Tecnologias utilizadas

**Painel web:** React, TypeScript, Vite, Leaflet (mapa) e OpenStreetMap (tiles). Hospedagem na Vercel.

**Modelo preditivo:** Python, scikit-learn (Random Forest), pandas, geopandas. Fontes de dados: Open-Meteo (chuva), TOPODATA/INPE (topografia), IBGE (pedologia/solo) e OpenStreetMap (geometria das vias). O detalhe completo do modelo está no diretório `modelo/`.

**Canal de mensagens:** WhatsApp via biblioteca não oficial (whatsapp-web.js), demonstrado no pitch.

## Uso de IA

**Ferramentas utilizadas:** assistentes de IA foram usados como apoio ao desenvolvimento.

**Finalidade:** auxílio na escrita e revisão de código, organização da arquitetura, redação de documentação e textos, e apoio na análise de dados e definição do modelo.

**Partes do projeto apoiadas por IA:** estruturação do painel web, organização do pipeline de dados, redação do README e dos materiais de apresentação.

**O que a equipe revisou, adaptou ou validou:** todas as decisões técnicas, a coleta e validação de dados em campo (entrevistas com SEMOSP, DER e NUCEX), a calibração do modelo de risco e a verificação dos resultados foram conduzidas e revisadas pela equipe. O sistema não utiliza modelos de linguagem (LLM) em tempo de execução; o componente de inteligência é o modelo de machine learning (Random Forest), treinado com dados públicos.

## Validação

A equipe foi a campo antes de desenvolver. Foram realizadas entrevistas com:

- **SEMOSP** (Secretaria Municipal de Obras): confirmou a ausência de registro histórico de atoleiros e o uso de imagens de satélite para avaliar as vias.
- **DER** (Departamento de Estradas de Rodagem): explicou a influência da topografia e da drenagem sobre a chuva.
- **NUCEX / Junior** (servidor com 6 anos de experiência em estradas): validou a ordem dos fatores de risco — drenagem acima da chuva — e o caso real de uma linha que deixou de alagar após receber aterro de drenagem.

A Quanyx Tecnologia, proponente do desafio, indicou os trechos prioritários para o piloto e confirmou a inexistência de uma base de dados estruturada sobre as condições das vias.

## Dados e demonstração

A geometria das estradas é real, extraída do OpenStreetMap. O modelo Random Forest é treinado no pipeline (`modelo/`) sobre a malha de trechos, com dados públicos (IBGE, INPE, Open-Meteo). No painel de demonstração, porém, o risco e os atributos exibidos por trecho são **ilustrativos, montados à mão** para a navegação da banca — não são a saída do RF por registro. Os cenários de chuva e parte dos atributos são sintéticos, claramente sinalizados na interface. A arquitetura está pronta para conectar a saída do modelo ao painel em produção. Essa abordagem foi alinhada com a Quanyx e com a coordenação do curso.

## O que funciona

- Painel web online com mapa de risco dos trechos, responsivo (desktop e celular).
- Modelo Random Forest treinado e avaliado, classificando trechos por nível de risco.
- Pipeline de coleta e processamento de dados reais (clima, solo, topografia, vias).
- Detalhamento por trecho (drenagem, solo, largura, chuva).

## O que ainda pode melhorar

- Integração ao vivo do chatbot de WhatsApp (no MVP, demonstrado no pitch).
- Mapeamento dos códigos de trecho para os nomes oficiais das linhas (C-65, C-70, etc.).
- Ampliação do histórico real a partir dos relatos dos usuários, permitindo o retreino contínuo do modelo.
- Inclusão consistente da classe "intransitável" conforme mais dados de campo forem coletados.
- Sensores LoRa em pontos isolados sem sinal de internet (evolução futura).

## Plano de teste

O plano mínimo de teste da solução — oráculo, casos de caminho feliz e casos de
caminho de erro para os três componentes (painel, bot e modelo), ancorado nos
conceitos da disciplina de Teste de Software (BSTQB, 2023; Coutinho e Nascimento,
2025) — está em [TESTING.md](TESTING.md).

## Licença

Projeto de finalidade acadêmica e extensionista, desenvolvido para a Hackathon Extensionista IFRO Ariquemes 2026/1.

## Repositório

- Código e documentação: https://github.com/Bryan-Serafim/linha-livre
- Modelo preditivo (detalhes técnicos): diretório `modelo/`
- GitHub do desenvolvedor do modelo: https://github.com/LeoEliel
