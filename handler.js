import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { buildMenu } from "./lib/menu.js";
import { imageToSticker } from "./lib/sticker.js";
import { downloadTikTok } from "./lib/downloader.js";

const isUrl = (s="") => /https?:\/\/\S+/i.test(s);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function pickText(m) {
  const msg = m.message || {};
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage) return msg.extendedTextMessage.text || "";
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  if (msg.listResponseMessage) return msg.listResponseMessage.singleSelectReply?.selectedRowId || "";
  if (msg.buttonsResponseMessage) return msg.buttonsResponseMessage.selectedButtonId || "";
  return "";
}

async function getImageBufferFromMessageOrQuote(m) {
  const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imgMsg = q?.imageMessage ? q.imageMessage : m.message?.imageMessage ? m.message.imageMessage : null;
  if (!imgMsg) return null;
  const stream = await downloadContentFromMessage(imgMsg, "image");
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

export function registerHandlers(sock, config) {
  const prefRe = new RegExp(`^(${config.prefix.map(esc).join("|")})`, "i");

  async function sendOwner(jid) {
    const vcard =
      "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      "FN:Owner Bot\n" +
      `TEL;type=CELL;type=VOICE;waid=${config.owner}:${config.owner}\n` +
      "END:VCARD";
    await sock.sendMessage(jid, { contacts: { displayName: "Owner", contacts: [{ vcard }] } });
    await sock.sendMessage(jid, { text: `👑 Owner: wa.me/${config.owner}\nBot: ${config.botName}` });
  }

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const m = messages[0];
    if (!m?.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const raw = pickText(m).trim();

    // List selection handler
    if (m.message?.listResponseMessage) {
      const id = m.message.listResponseMessage.singleSelectReply?.selectedRowId;
      if (id === "dl_tiktok") return sock.sendMessage(jid, { text: "Kirim link TikTok: /tiktok <url>" });
      if (id === "sticker_info") return sock.sendMessage(jid, { text: "Kirim/reply *gambar* lalu ketik /sticker" });
      if (id === "owner_info") return sendOwner(jid);
      return;
    }

    // Plain menu (tanpa prefix)
    if (/^([!/\.]?menu)$/i.test(raw)) {
      return sock.sendMessage(jid, buildMenu(config.botName));
    }

    // Parse prefix + command
    const hit = raw.match(prefRe);
    const prefix = hit ? hit[0] : null;
    if (!prefix) return;

    const text = raw.slice(prefix.length).trim();
    const [cmd, ...args] = text.split(/\s+/);
    if (!cmd) return;

    switch (cmd.toLowerCase()) {
      case "owner":
        return sendOwner(jid);

      case "sticker":
      case "s":
      case "stc": {
        const img = await getImageBufferFromMessageOrQuote(m);
        if (!img) return sock.sendMessage(jid, { text: "❗Kirim/reply *gambar* lalu ketik /sticker" });
        const webp = await imageToSticker(img, config.sticker.pack, config.sticker.author);
        return sock.sendMessage(jid, { sticker: webp });
      }

      case "tiktok":
      case "tt": {
        const url = args[0];
        if (!url || !isUrl(url)) return sock.sendMessage(jid, { text: "❗Format: /tiktok <url>" });
        try {
          await sock.sendMessage(jid, { text: "⏳ Mengunduh video..." });
          const { url: dl } = await downloadTikTok(url);
          return sock.sendMessage(jid, { video: { url: dl }, caption: "✅ TikTok tanpa watermark" });
        } catch (e) {
          console.log("tiktok err:", e?.message || e);
          return sock.sendMessage(jid, { text: "❌ Gagal unduh. Coba link lain." });
        }
      }

      default:
        return sock.sendMessage(jid, { text: `Perintah tidak dikenal: ${prefix}${cmd}\nKetik /menu untuk daftar.` });
    }
  });
}
