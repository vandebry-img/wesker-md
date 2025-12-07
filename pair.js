const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const chalk = require('chalk');
const readline = require('readline');
const config = require('./config');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function pairDevice() {
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════╗
║      𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃 𝐏𝐚𝐢𝐫𝐢𝐧𝐠 𝐌𝐨𝐝𝐞        ║
║     Pairing dengan Kode OTP          ║
╚══════════════════════════════════════╝
    `));
    
    if (!fs.existsSync('./session')) {
        fs.mkdirSync('./session', { recursive: true });
    }
    
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(chalk.yellow('🔄 Membuat koneksi...'));
    
    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false, // Tidak pakai QR
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, isNewLogin } = update;
        
        if (qr) {
            console.log(chalk.red('⚠️  QR Code muncul, restart dengan mode pairing.'));
            console.log(chalk.yellow('Gunakan: node index.js'));
            process.exit(0);
        }
        
        if (connection === 'open') {
            console.log(chalk.green('✅ Pairing berhasil!'));
            console.log(chalk.cyan(`🤖 Bot terhubung sebagai: ${sock.user?.name || 'Unknown'}`));
            console.log(chalk.cyan(`📱 Nomor: ${sock.user?.id.split(':')[0] || 'Unknown'}`));
            
            // Simpan informasi pairing
            const pairData = {
                paired: true,
                pairedAt: new Date().toISOString(),
                user: sock.user,
                platform: 'pairing-code'
            };
            
            fs.writeFileSync('./session/pairing.json', JSON.stringify(pairData, null, 2));
            
            console.log(chalk.green('\n🎉 Pairing selesai!'));
            console.log(chalk.yellow('\n📝 Mulai bot dengan:'));
            console.log(chalk.white('   npm start'));
            console.log(chalk.white('   atau'));
            console.log(chalk.white('   node index.js\n'));
            
            process.exit(0);
        }
        
        // Jika meminta pairing code
        if (update.pairingCode) {
            console.log(chalk.green(`\n🔢 Pairing Code: ${update.pairingCode}`));
            console.log(chalk.yellow('\n📱 Langkah-langkah:'));
            console.log(chalk.white('1. Buka WhatsApp di HP'));
            console.log(chalk.white(`2. Pergi ke Menu → Linked Devices → Link a Device`));
            console.log(chalk.white(`3. Pilih "Link with phone number"`));
            console.log(chalk.white(`4. Masukkan nomor: ${config.pairingNumber || config.owner[0]}`));
            console.log(chalk.white(`5. Masukkan kode: ${update.pairingCode}`));
            console.log(chalk.white(`6. Tunggu hingga bot terhubung...\n`));
        }
        
        if (isNewLogin) {
            console.log(chalk.green('🔄 Login baru terdeteksi!'));
        }
    });
    
    // Coba request pairing code
    setTimeout(() => {
        console.log(chalk.yellow('🔄 Meminta pairing code...'));
        sock.requestPairingCode(config.pairingNumber || config.owner[0]);
    }, 3000);
    
    // Auto exit setelah 5 menit
    setTimeout(() => {
        console.log(chalk.red('\n⏰ Waktu pairing habis!'));
        console.log(chalk.yellow('Silakan coba lagi.'));
        process.exit(1);
    }, 5 * 60 * 1000);
}

// Jalankan pairing
pairDevice().catch(err => {
    console.error(chalk.red('Error:', err));
    process.exit(1);
});
