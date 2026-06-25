# Segurança da Informação

O **LinhaLivre** é um sistema de leitura pública de informação geográfica: painel React/Vite
estático (Vercel) + bot WhatsApp (`whatsapp-web.js`, login por QR) + pipeline Random Forest
offline. Não há banco transacional nem login de usuário final; o dado central é público por origem.

## Verificação executada (25/06/2026)

- **Dependências:** `npm audit` (painel, bot) e `pip-audit` (modelo, RF) → **0 vulnerabilidades**.
- **Segredos:** `detect-secrets` → **0 ocorrências**; nenhum `.env` versionado; `.wwebjs_auth` no `.gitignore`.
- **Transporte:** HTTPS + HSTS confirmados no painel.
- **Bot:** sem token/webhook (autenticação por QR), sem `exec`/`eval`, dados apenas em memória, logs sem PII.

## OWASP Top 10 (2021)

- **A02 / A06 / A10:** HTTPS + HSTS, 0 vulnerabilidades de dependência, *fetches* de destino fixo (sem SSRF).
- **A03 — Injeção:** sem SQL; entrada do bot sem *sink* perigoso.
- **A04 — Design inseguro:** minimização de dados; leitura anônima.
- **A05 — Configuração:** cabeçalhos de segurança adicionados via `vercel.json` (CSP, `nosniff`, frame, referrer, permissions).
- **A07 — Autenticação:** não se aplica (sem login; identidade via WhatsApp).

## Ferramentas

`npm audit`, `pip-audit`, `detect-secrets`, `curl` (auditoria de cabeçalhos), além de
GitHub Dependabot e Secret Scanning (recomendados para monitoramento contínuo).

## Uso de IA

Assistente de IA usado na revisão e na execução da verificação de segurança. **Nenhuma
credencial, token ou dado real foi enviado a ferramentas externas** — a análise usou apenas
o código público dos repositórios e a resposta HTTP pública do painel.

## Limitações conhecidas

MVP acadêmico. O bot roda Chromium com `--no-sandbox` e sem *rate limiting*; os dados não são
persistidos (positivo para privacidade, mas limitação funcional). Observabilidade de produção
fica como evolução pós-hackathon.