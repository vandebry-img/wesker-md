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
    
    console.log(chalk.yellow('🔄 Connecting to WhatsApp...'));
    
    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, require('pino')({ level: 'silent' })),
        },
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    let pairingCodeDisplayed = false;
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, pairingCode } = update;
        
        if (qr && !pairingCodeDisplayed) {
            console.log(chalk.red('⚠️  QR Code detected! Using pairing code instead.'));
            pairingCodeDisplayed = true;
        }
        
        if (pairingCode) {
            console.log(chalk.green.bold(`\n🔢 PAIRING CODE: ${pairingCode}`));
            console.log(chalk.yellow.bold('\n📱 FOLLOW THESE STEPS:'));
            console.log(chalk.white('1. Open WhatsApp on your phone'));
            console.log(chalk.white('2. Go to Menu → Linked Devices → Link a Device'));
            console.log(chalk.white('3. Select "Link with phone number"'));
            console.log(chalk.white(`4. Enter phone number: ${config.pairingNumber}`));
            console.log(chalk.white(`5. Enter this code: ${pairingCode}`));
            console.log(chalk.white('6. Wait for connection...\n'));
            
            // Save pairing code to file
            fs.writeFileSync('./pairing_code.txt', `Code: ${pairingCode}\nTime: ${new Date().toLocaleString()}\nNumber: ${config.pairingNumber}`);
            console.log(chalk.blue('📝 Pairing code saved to pairing_code.txt'));
        }
        
        if (connection === 'open') {
            console.log(chalk.green.bold('\n✅ PAIRING SUCCESSFUL!'));
            console.log(chalk.cyan(`🤖 Connected as: ${sock.user?.name || 'Unknown'}`));
            console.log(chalk.cyan(`📱 Number: ${sock.user?.id?.split(':')[0] || 'Unknown'}`));
            console.log(chalk.cyan(`🆔 JID: ${sock.user?.id || 'Unknown'}`));
            
            // Save pairing info
            const pairInfo = {
                paired: true,
                timestamp: new Date().toISOString(),
                user: sock.user,
                pairingCode: pairingCode,
                device: 'pairing-mode'
            };
            
            fs.writeFileSync('./session/pairing_info.json', JSON.stringify(pairInfo, null, 2));
            
            console.log(chalk.green('\n🎉 Pairing completed successfully!'));
            console.log(chalk.yellow('\n🚀 Starting bot...'));
            console.log(chalk.white('   Run: npm start'));
            console.log(chalk.white('   or: node index.js\n'));
            
            // Auto start bot after pairing
            setTimeout(() => {
                console.log(chalk.blue('🔗 Launching bot in 5 seconds...'));
                setTimeout(() => {
                    require('./index');
                }, 5000);
            }, 3000);
        }
        
        if (connection === 'close') {
            console.log(chalk.red('\n❌ Pairing failed or connection closed.'));
            console.log(chalk.yellow('Try again or check your internet connection.'));
            process.exit(1);
        }
    });
    
    // Request pairing code after 3 seconds
    setTimeout(() => {
        if (!pairingCodeDisplayed) {
            console.log(chalk.yellow('📡 Requesting pairing code...'));
            sock.requestPairingCode(config.pairingNumber || config.owner[0]);
        }
    }, 3000);
    
    // Timeout after 10 minutes
    setTimeout(() => {
        console.log(chalk.red('\n⏰ Pairing timeout! (10 minutes)'));
        console.log(chalk.yellow('Please try again.'));
        process.exit(1);
    }, 10 * 60 * 1000);
    
    // Handle process exit
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n🛑 Pairing cancelled by user.'));
        process.exit(0);
    });
}

// Check if already paired
if (fs.existsSync('./session/creds.json')) {
    console.log(chalk.yellow('⚠️  Session already exists!'));
    rl.question('Do you want to pair again? (y/N): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
            console.log(chalk.yellow('🗑️  Removing old session...'));
            fs.removeSync('./session');
            pairDevice().catch(console.error);
        } else {
            console.log(chalk.green('✅ Keeping existing session.'));
            console.log(chalk.blue('Run: npm start to start bot.'));
            rl.close();
            process.exit(0);
        }
    });
} else {
    pairDevice().catch(error => {
        console.error(chalk.red('❌ Pairing error:'), error);
        process.exit(1);
    });
}
