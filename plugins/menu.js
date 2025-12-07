const fs = require('fs');
const config = require('../config');

module.exports = {
    name: 'menu',
    desc: 'Menampilkan menu utama bot',
    command: ['.menu', '!menu', '/menu', '#menu'],
    async execute(sock, msg, from) {
        const pushname = msg.pushName || 'User';
        
        const menuText = `╭───「 *${config.botName}* 」
│ 👋 Halo, *${pushname}*!
│ ⏰ ${new Date().toLocaleTimeString('id-ID')}
╰─────────────────

╭───「 📁 *MENU UTAMA* 」
│ • .menu - Menu ini
│ • .help - Bantuan
│ • .owner - Owner bot
│ • .info - Info bot
│ • .ping - Cek kecepatan
╰─────────────────

╭───「 📥 *DOWNLOADER* 」
│ • .ytmp3 [url] - YouTube to MP3
│ • .ytmp4 [url] - YouTube to MP4
│ • .tiktok [url] - Download TikTok
│ • .fb [url] - Download Facebook
│ • .ig [url] - Download Instagram
╰─────────────────

╭───「 🎨 *STICKER* 」
│ • .sticker - Buat sticker
│ • .take - Ambil sticker
│ • .toimg - Sticker to image
│ • .emojimix 😀+😁 - Mix emoji
╰─────────────────

╭───「 👑 *OWNER ONLY* 」
│ • .bc [text] - Broadcast
│ • .eval [code] - Eval code
│ • .exec [cmd] - Exec command
│ • .getses - Get session
╰─────────────────

╭───「 ⚡ *TOOLS* 」
│ • .tts [text] - Text to speech
│ • .translate [text] - Terjemahan
│ • .wiki [query] - Wikipedia
│ • .quote - Quote random
╰─────────────────

╭───「 ℹ️ *INFO* 」
│ Owner: ${config.author}
│ Prefix: ${config.prefa.join(' ')}
│ Status: ✅ Online
╰─────────────────`;

        await sock.sendMessage(from, {
            text: menuText,
            buttons: [
                { buttonId: '.help', buttonText: { displayText: '📋 Help' }, type: 1 },
                { buttonId: '.owner', buttonText: { displayText: '👑 Owner' }, type: 1 },
                { buttonId: '.ping', buttonText: { displayText: '🏓 Ping' }, type: 1 },
                { buttonId: '.info', buttonText: { displayText: 'ℹ️ Info' }, type: 1 }
            ],
            footer: config.botName,
            headerType: 1
        });
    }
};
