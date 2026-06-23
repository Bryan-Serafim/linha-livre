// =============================================================
// LinhaLivre — Chatbot de Trafegabilidade (WhatsApp)
// Hackathon IFRO Ariquemes 2026 — Equipe Hagatangos
// =============================================================

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const cadastrados = new Map();
const relatos = [];

const RISCO = {
  "c-65": { nivel: "ALTA", drenagem: "parcial", motivo: "drenagem comprometida + chuva acumulada de 64mm" },
  "c-70": { nivel: "INTRANSITÁVEL", drenagem: "ausente", motivo: "sem escoamento e 88mm de chuva nas últimas 72h" },
  "c-60": { nivel: "MÉDIA", drenagem: "parcial", motivo: "suporta chuva moderada, atenção em períodos longos" },
  "b-40": { nivel: "BAIXA", drenagem: "boa", motivo: "escoamento adequado, trafegável" },
};

const EMOJI = { "ALTA": "🟠", "INTRANSITÁVEL": "🔴", "MÉDIA": "🟡", "BAIXA": "🟢" };

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "linha-livre" }),
  puppeteer: { headless: true, args: ["--no-sandbox"] },
});

client.on("qr", (qr) => {
  console.log("\n📲 Escaneie o QR code abaixo com o WhatsApp Business do LinhaLivre:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("\n✅ LinhaLivre conectado e pronto! O bot está ouvindo mensagens.\n");
});

function menu() {
  return (
    "🌧️ *LinhaLivre* — alerta de trafegabilidade das linhas de Ariquemes\n\n" +
    "Como posso ajudar?\n\n" +
    "1️⃣ Ver risco de uma linha (envie: *risco C-70*)\n" +
    "2️⃣ Relatar atoleiro (envie: *atolei C-70*)\n" +
    "3️⃣ Receber alertas (envie: *cadastrar C-65*)\n\n" +
    "É só digitar o comando com o nome da linha."
  );
}

function consultaRisco(linha) {
  const key = linha.toLowerCase().replace(/\s+/g, "");
  const r = RISCO[key];
  if (!r) {
    return `Não encontrei a linha "${linha}". Tente C-65, C-70, C-60 ou B-40.`;
  }
  return (
    `${EMOJI[r.nivel]} *Linha ${linha.toUpperCase()}* — risco *${r.nivel}*\n\n` +
    `Drenagem: ${r.drenagem}\n` +
    `Motivo: ${r.motivo}\n\n` +
    (r.nivel === "INTRANSITÁVEL" || r.nivel === "ALTA"
      ? "⚠️ Evite trafegar com carga pesada nos próximos dias."
      : "✅ Trânsito possível, mas acompanhe a previsão.")
  );
}

client.on("message", async (msg) => {
  // ignora mensagens do proprio bot, de status e de grupos
  if (msg.fromMe) return;
  if (msg.from === "status@broadcast") return;
  if (msg.from.endsWith("@g.us")) return;

  const texto = (msg.body || "").trim();
  const lower = texto.toLowerCase();
  const numero = msg.from;

  // saudacao / menu
  if (["oi", "olá", "ola", "menu", "início", "inicio", "bom dia", "boa tarde", "boa noite"].some((s) => lower === s || lower.startsWith(s))) {
    await msg.reply(menu());
    return;
  }

  // atalhos por numero do menu
  if (texto === "1") {
    await msg.reply("Qual linha? Envie por exemplo: *risco C-70*");
    return;
  }
  if (texto === "2") {
    await msg.reply("Qual linha atolou? Envie por exemplo: *atolei C-70*");
    return;
  }
  if (texto === "3") {
    await msg.reply("Qual linha quer acompanhar? Envie por exemplo: *cadastrar C-65*");
    return;
  }

  // consultar risco
  if (lower.startsWith("risco")) {
    const linha = texto.replace(/risco/i, "").trim();
    await msg.reply(consultaRisco(linha || "c-70"));
    return;
  }

  // relatar atoleiro
  if (lower.startsWith("atolei") || lower.startsWith("atolou") || lower.startsWith("relatar")) {
    const linha = texto.replace(/atolei|atolou|relatar/i, "").trim() || "não informada";
    relatos.push({ numero, linha, quando: new Date().toISOString() });
    await msg.reply(
      `📍 *Relato registrado!* Obrigado.\n\n` +
      `Linha: ${linha.toUpperCase()}\n` +
      `Seu aviso ajuda a prefeitura a priorizar a manutenção e alerta outros produtores da região.\n\n` +
      `Cada relato fica registrado com data e local, construindo o histórico que hoje não existe.`
    );
    console.log(`📍 Novo relato: linha ${linha} (total: ${relatos.length})`);
    return;
  }

  // cadastrar para alertas
  if (lower.startsWith("cadastrar")) {
    const linha = texto.replace(/cadastrar/i, "").trim() || "geral";
    cadastrados.set(numero, { linha });
    await msg.reply(
      `✅ *Cadastrado!* Você vai receber alertas da linha ${linha.toUpperCase()}.\n\n` +
      `Sempre que o risco subir, te avisamos por aqui antes da estrada ceder.`
    );
    return;
  }

  // localizacao enviada
  if (msg.location) {
    await msg.reply(
      "📍 Localização recebida! No sistema completo, identificamos automaticamente o trecho mais próximo e retornamos o risco atual dele."
    );
    return;
  }

  // fallback
  await msg.reply(menu());
});

client.initialize();