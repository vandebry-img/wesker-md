const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Jakarta');

// Config
const config = require('./config');

// Buat folder session
if (!fs.existsSync('./session')) fs.mkdirSync('./session', { recursive: true });
if (!fs.existsSync('./media')) fs.mkdirSync('./media', { recursive: true });

const logger = pino({ level: 'silent' });

async function startBot() {
    console.log(chalk.green.bold(`
╔══════════════════════════════╗
║     𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃 𝐁𝐨𝐭          ║
║     Owner: ${config.author}     ║
╚══════════════════════════════╝
    `));

    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false, // Nonaktifkan QR
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser: Browsers.macOS('Safari'),
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
            return {};
        },
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;
        
        if (qr) {
            console.log(chalk.yellow('⚠️  QR Code terdeteksi, tapi mode pairing aktif.'));
        }
        
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect.error).output.statusCode;
            if (reason === DisconnectReason.badSession) {
                console.log(chalk.red('Session rusak, hapus folder session dan restart bot.'));
                sock.logout();
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log(chalk.yellow('Koneksi tertutup, mencoba reconnect...'));
                startBot();
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(chalk.yellow('Koneksi hilang, mencoba reconnect...'));
                startBot();
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log(chalk.red('Koneksi diganti di perangkat lain, logout...'));
                sock.logout();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red('Device logged out, hapus folder session dan restart bot.'));
                sock.logout();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(chalk.yellow('Restart required, restarting...'));
                startBot();
            } else if (reason === DisconnectReason.timedOut) {
                console.log(chalk.yellow('Connection timeout, reconnecting...'));
                startBot();
            } else {
                console.log(chalk.red(`Unknown disconnect reason: ${reason}`));
                startBot();
            }
        }
        
        if (connection === 'open') {
            console.log(chalk.green('✅ Bot berhasil terhubung ke WhatsApp!'));
            console.log(chalk.cyan(`📱 Terhubung sebagai: ${sock.user?.name || 'Unknown'}`));
            console.log(chalk.cyan(`🆔 User ID: ${sock.user?.id || 'Unknown'}`));
            console.log(chalk.cyan(`⏰ Waktu: ${moment().format('DD/MM/YYYY HH:mm:ss')}`));
            
            // Update profile picture jika ada
            try {
                if (fs.existsSync('./media/logo.jpg')) {
                    const pic = fs.readFileSync('./media/logo.jpg');
                    await sock.updateProfilePicture(sock.user.id, pic);
                    console.log(chalk.green('🖼️ Profile picture berhasil diupdate!'));
                }
            } catch (err) {
                console.log(chalk.yellow('⚠️  Gagal update profile picture'));
            }
        }
        
        // Jika ada pairing code atau isNewLogin
        if (isNewLogin) {
            console.log(chalk.green('🔄 Login baru terdeteksi!'));
        }
    });

    // Handle messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;
        const type = Object.keys(msg.message)[0];
        let text = '';
        
        if (type === 'conversation') text = msg.message.conversation;
        if (type === 'extendedTextMessage') text = msg.message.extendedTextMessage.text;
        if (type === 'imageMessage') text = msg.message.imageMessage.caption || '';
        
        const command = text.toLowerCase().trim();
        const pushname = msg.pushName || 'User';
        
        console.log(chalk.cyan(`📨 [${moment().format('HH:mm:ss')}] ${pushname}: ${text}`));
        
        // Handle commands
        if (command === '.menu' || command === '!menu' || command === '/menu') {
            await sock.sendMessage(from, {
                text: `Halo *${pushname}*! 👋

*🤖 𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃 𝐁𝐨𝐭*
_Dibuat oleh ${config.author}_

📁 *MENU UTAMA*
• .menu - Menu utama
• .help - Bantuan
• .owner - Owner bot
• .info - Info bot
• .ping - Cek kecepatan

🎮 *BUTTON MENU*
• .button - Demo button
• .list - Demo list
• .template - Demo template

📊 *STATUS*
• .status - Status bot
• .runtime - Waktu aktif

_*Gunakan prefix: ${config.prefa.join(' ')}*_`,
                footer: config.botName,
                headerType: 1
            });
        }
        
        else if (command === '.button' || command === '!button') {
            await sock.sendMessage(from, {
                text: "*Contoh Button Menu*\nPilih salah satu:",
                buttons: [
                    { buttonId: 'id1', buttonText: { displayText: '🎮 Game' }, type: 1 },
                    { buttonId: 'id2', buttonText: { displayText: '📊 Info' }, type: 1 },
                    { buttonId: 'id3', buttonText: { displayText: '👑 Owner' }, type: 1 },
                    { buttonId: 'id4', buttonText: { displayText: '❌ Tutup' }, type: 1 }
                ],
                footer: config.botName
            });
        }
        
        else if (command === '.list' || command === '!list') {
            await sock.sendMessage(from, {
                text: "*List Menu Pilihan*",
                title: "Pilih Kategori:",
                buttonText: "Klik Disini",
                sections: [
                    {
                        title: "📁 KATEGORI UTAMA",
                        rows: [
                            { title: "🎮 Game", rowId: ".game" },
                            { title: "📊 Informasi", rowId: ".info" },
                            { title: "⚙️ Settings", rowId: ".settings" }
                        ]
                    },
                    {
                        title: "🔧 TOOLS",
                        rows: [
                            { title: "🛠️ Tools", rowId: ".tools" },
                            { title: "📈 Stats", rowId: ".stats" },
                            { title: "ℹ️ About", rowId: ".about" }
                        ]
                    }
                ]
            });
        }
        
        else if (command === '.template' || command === '!template') {
            await sock.sendMessage(from, {
                text: "*Template Button*",
                templateButtons: [
                    {
                        index: 1,
                        urlButton: {
                            displayText: "🌐 Website",
                            url: "https://github.com/vryptt/buttons-warpper"
                        }
                    },
                    {
                        index: 2,
                        callButton: {
                            displayText: "📞 Call Owner",
                            phoneNumber: config.owner[0]
                        }
                    },
                    {
                        index: 3,
                        quickReplyButton: {
                            displayText: "🎮 Quick Reply",
                            id: "qr-menu"
                        }
                    }
                ]
            });
        }
        
        else if (command === '.owner' || command === '!owner') {
            await sock.sendMessage(from, {
                text: `*👑 OWNER BOT*
Nama: ${config.author}
Nomor: ${config.owner[0]}
WhatsApp: https://wa.me/${config.owner[0].replace('+', '')}

Hubungi owner untuk informasi lebih lanjut!`,
                footer: config.botName
            });
        }
        
        else if (command === '.ping' || command === '!ping') {
            const start = Date.now();
            const sent = await sock.sendMessage(from, { text: '🏓 Pong!' });
            const latency = Date.now() - start;
            await sock.sendMessage(from, { 
                text: `*Speed Test*\n\n🏓 Latency: ${latency}ms\n📶 Connection: Excellent` 
            });
        }
        
        else if (command === '.info' || command === '!info') {
            await sock.sendMessage(from, {
                text: `*🤖 BOT INFORMATION*
Nama: ${config.botName}
Owner: ${config.author}
Nomor Owner: ${config.owner[0]}
Versi: 2.0.0
Status: Active
Mode: Pairing Code
Library: Baileys MD
Prefix: ${config.prefa.join(', ')}

_*Bot ini menggunakan pairing code tanpa QR*_`,
                footer: config.botName
            });
        }
        
        else if (command === '.status' || command === '!status') {
            const used = process.memoryUsage();
            await sock.sendMessage(from, {
                text: `*📊 BOT STATUS*
Memory Usage:
• RSS: ${Math.round(used.rss / 1024 / 1024)}MB
• Heap: ${Math.round(used.heapUsed / 1024 / 1024)}MB
• Total: ${Math.round(used.heapTotal / 1024 / 1024)}MB

Platform: ${process.platform}
Node.js: ${process.version}
Uptime: ${process.uptime().toFixed(2)}s`
            });
        }
        
        else if (command === '.runtime' || command === '!runtime') {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            await sock.sendMessage(from, {
                text: `*⏰ RUNTIME BOT*
Bot telah aktif selama:
${hours} Jam ${minutes} Menit ${seconds} Detik

Sejak: ${moment(Date.now() - (uptime * 1000)).format('DD/MM/YYYY HH:mm:ss')}`
            });
        }
        
        else if (command === '.help' || command === '!help') {
            await sock.sendMessage(from, {
                text: `*📋 HELP MENU*

*PERINTAH UTAMA*
• .menu - Menu utama bot
• .help - Menampilkan pesan ini
• .owner - Kontak owner
• .info - Informasi bot

*BUTTON & TEMPLATE*
• .button - Contoh button
• .list - Contoh list message
• .template - Contoh template button

*STATUS & INFO*
• .ping - Test kecepatan
• .status - Status memory
• .runtime - Waktu aktif bot

*PENTING*
- Bot ini menggunakan pairing code
- Hanya owner yang bisa akses semua fitur
- Laporkan bug ke owner`,
                footer: config.botName
            });
        }
        
        // Response untuk button yang diklik
        if (msg.message?.templateButtonReplyMessage || msg.message?.buttonsResponseMessage) {
            const buttonId = msg.message.templateButtonReplyMessage?.selectedId || 
                            msg.message.buttonsResponseMessage?.selectedButtonId;
            
            if (buttonId === 'id1') {
                await sock.sendMessage(from, { text: "🎮 Anda memilih Game!" });
            } else if (buttonId === 'id2') {
                await sock.sendMessage(from, { text: "📊 Anda memilih Info!" });
            } else if (buttonId === 'id3') {
                await sock.sendMessage(from, { 
                    text: `👑 Owner: ${config.author}\nWhatsApp: https://wa.me/${config.owner[0].replace('+', '')}` 
                });
            } else if (buttonId === 'id4') {
                await sock.sendMessage(from, { text: "❌ Menu ditutup!" });
            }
        }
    });

    // Handle ketika ada button response
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (msg?.message?.listResponseMessage) {
            const listId = msg.message.listResponseMessage.title;
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `Anda memilih: ${listId}` 
            });
        }
    });

    return sock;
}

// Start bot
startBot().catch(console.error);
