const config = require('../config');

module.exports = {
    name: 'help',
    desc: 'Menampilkan bantuan penggunaan bot',
    command: ['.help', '!help', '/help', '#help'],
    
    async execute(sock, msg, from) {
        const helpText = `📚 *BANTUAN PENGGUNAAN* ${config.botName}

*📁 MENU UTAMA*
• .menu - Menu lengkap bot
• .help - Panduan penggunaan
• .owner - Kontak owner
• .info - Info bot
• .ping - Cek kecepatan

*📥 DOWNLOADER*
• .ytmp3 [url] - Download audio YouTube
• .ytmp4 [url] - Download video YouTube
• .tiktok [url] - Download video TikTok
• .fb [url] - Download video Facebook
• .ig [url] - Download Instagram

*🎨 STICKER MAKER*
• .sticker - Buat sticker (reply image/video)
• .take [emoji] - Sticker dari emoji
• .toimg - Convert sticker ke gambar
• .emojimix 😀+😁 - Mix 2 emoji

*👑 OWNER ONLY*
• .bc [text] - Broadcast pesan
• .eval [code] - Evaluate JavaScript
• .exec [cmd] - Execute shell command
• .getses - Get session data

*⚡ TOOLS LAINNYA*
• .tts [text] - Text to speech
• .translate [text] - Terjemahan
• .wiki [query] - Wikipedia search
• .quote - Quote acak

*ℹ️ INFORMASI*
Owner: ${config.author}
Prefix: ${config.prefa.join(' ')}
Status: Online 24/7

*📝 CATATAN*
- Video maksimal 10 detik untuk sticker
- Gunakan dengan bijak
- Laporkan bug ke owner`;

        await sock.sendMessage(from, {
            text: helpText,
            footer: config.botName,
            headerType: 1
        });
    }
};
