import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} from "@whiskeysockets/baileys";
import QR from "qrcode-terminal";
import pino from "pino";
import "dotenv/config";
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import { tiktokdl } from "@bochilteam/scraper";
import fetch from "node-fetch";
import { fileTypeFromBuffer } from "file-type";
import fs from "fs";

const AUTH_DIR = "./auth";
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const OWNER = process.env.OWNER || "62812xxxxxxx";
const BOT_NAME = process.env.BOT_NAME || "Wesker-MD";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const isUrl = (s="") => /https?:\/\/\S+/i.test(s);

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log("\n=== Scan QR ini (Perangkat Tertaut) ===");
      QR.generate(qr, { small: true });
    }
    if (connection === "open") console.log("✅ Tersambung.");
    if (connection === "close") {
      console.log("⚠️ Putus, mencoba ulang...");
      start();
    }
  });

  // helper: ambil teks
  const getText = (m) => {
    const msg = m.message || {};
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage) return msg.extendedTextMessage.text || "";
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.listResponseMessage) return msg.listResponseMessage.singleSelectReply.selectedRowId;
    return "";
  };

  // helper: ambil media (gambar) dari pesan/reply
  const getQuoted = (m) => m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
  async function getImageBuffer(m) {
    const q = getQuoted(m);
    const imgMsg = q?.imageMessage ? q.imageMessage :
                   m.message?.imageMessage ? m.message.imageMessage : null;
    if (!imgMsg) return null;

    const stream = await downloadContentFromMessage(imgMsg, "image");
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
  }

  // kirim menu list sederhana
  function buildMenu() {
    return {
      title: "Selection",
      text: "Pilih salah satu kategori:",
      footer: `${BOT_NAME} • Free Edition`,
      buttonText: "Select",
      sections: [
        {
          title: "⬇️ Downloader",
          rows: [{ title: "TikTok", description: "Unduh video tanpa watermark", rowId: "dl_tiktok" }]
        },
        {
          title: "🧩 Sticker",
          rows: [{ title: "Buat Sticker", description: "Kirim/reply gambar + ketik /sticker", rowId: "sticker_info" }]
        },
        {
          title: "👑 Owner",
          rows: [{ title: "Kontak Owner", description: "Info & kontak pemilik bot", rowId: "owner_info" }]
        }
      ]
    };
  }

  async function handleSelection(id, jid) {
    if (id === "dl_tiktok")
      return sock.sendMessage(jid, { text: "Kirim link TikTok: /tiktok <url>" });
    if (id === "sticker_info")
      return sock.sendMessage(jid, { text: "Cara pakai: kirim/reply gambar lalu ketik /sticker" });
    if (id === "owner_info")
      return sendOwner(jid);
  }

  async function sendOwner(jid) {
    const vcard =
      "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      `FN:Owner Bot\n` +
      `TEL;type=CELL;type=VOICE;waid=${OWNER}:${OWNER}\n` +
      "END:VCARD";
    await sock.sendMessage(jid, {
      contacts: { displayName: "Owner", contacts: [{ vcard }] }
    });
    await sock.sendMessage(jid, { text: `👑 Owner: wa.me/${OWNER}\nBot: ${BOT_NAME}` });
  }

  // COMMANDS
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const jid = m.key.remoteJid;
    const body = getText(m).trim();

    // handler selection dari list
    if (m.message?.listResponseMessage) {
      const id = m.message.listResponseMessage.singleSelectReply.selectedRowId;
      return handleSelection(id, jid);
    }

    // /menu
    if (/^([!/]|)(menu)$/i.test(body)) {
      return sock.sendMessage(jid, buildMenu());
    }

    // /owner
    if (/^([!/]|)(owner)$/i.test(body)) {
      return sendOwner(jid);
    }

    // /sticker
    if (/^([!/]|)(sticker|s|stc)$/i.test(body)) {
      const imgBuf = await getImageBuffer(m);
      if (!imgBuf) return sock.sendMessage(jid, { text: "❗Kirim/reply *gambar* lalu ketik /sticker" });

      const sticker = new Sticker(imgBuf, {
        pack: "Wesker-MD",
        author: "Febry",
        type: StickerTypes.FULL
      });
      const webp = await sticker.build();
      return sock.sendMessage(jid, { sticker: webp });
    }

    // /tiktok <url>
    if (/^([!/]|)(tiktok|tt)(\s|$)/i.test(body)) {
      const url = body.split(/\s+/)[1];
      if (!url || !isUrl(url)) return sock.sendMessage(jid, { text: "❗Format: /tiktok <url>" });

      try {
        await sock.sendMessage(jid, { text: "⏳ Mengunduh video..." });
        const res = await tiktokdl(url);
        const dl =
          res?.video?.no_watermark || res?.video?.no_watermark2 || res?.video?.with_watermark;
        if (!dl) throw new Error("gagal ambil link video");

        await sock.sendMessage(jid, {
          video: { url: dl },
          caption: "✅ TikTok tanpa watermark"
        });
      } catch (e) {
        await sock.sendMessage(jid, { text: "❌ Gagal unduh. Pastikan link valid." });
        console.log("tiktok error:", e.message);
      }
    }
  });
}

start().catch(e => console.error(e));
