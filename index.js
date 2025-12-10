import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import "dotenv/config";

import config from "./config.js";
import { registerHandlers } from "./handler.js";

const AUTH_DIR = "./auth";
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome")
  });

  sock.ev.on("creds.update", saveCreds);

  // ================================
  // PAIRING CODE MODE
  // ================================
  if (!sock.authState.creds.registered) {
    const phone = process.env.PAIRING_NUMBER;
    if (!phone) {
      console.log("❗ Tambahkan PAIRING_NUMBER=628xxxxxx di file .env");
      process.exit(1);
    }

    try {
      const code = await sock.requestPairingCode(phone);

      console.log("\n==============================");
      console.log("       PAIRING CODE WA");
      console.log("==============================");
      console.log("Masuk ke WhatsApp:");
      console.log(" → Perangkat tertaut");
      console.log(" → Tautkan dengan nomor telepon");
      console.log("");
      console.log("Masukkan kode ini:");
      console.log(`👉 ${code}`);
      console.log("==============================\n");

    } catch (err) {
      console.error("❌ Gagal membuat pairing code:", err);
      process.exit(1);
    }
  }

  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") console.log("✅ Bot tersambung.");
    if (connection === "close") {
      console.log("⚠️ Koneksi terputus, mencoba ulang...");
      start();
    }
  });

  registerHandlers(sock, config);
}

start().catch(e => console.error(e));
