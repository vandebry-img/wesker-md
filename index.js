// ============================================
// 𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃 WhatsApp Bot
// Created by: 𝐅𝐞𝐛𝐫𝐲𝐖𝐞𝐬𝐤𝐞𝐫
// Version: 2.0.0
// ============================================

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    downloadContentFromMessage,
    getAggregateVotesInPollMessage,
    proto
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment-timezone');
const gradient = require('gradient-string');
const figlet = require('figlet');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');

// Config
const config = require('./config');
moment.tz.setDefault('Asia/Jakarta');

// Buat folder jika belum ada
const folders = ['session', 'media', 'plugins', 'logs', 'temp', 'database'];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// Load plugins
const plugins = {};
const pluginsDir = path.join(__dirname, 'plugins');

if (fs.existsSync(pluginsDir)) {
    const pluginFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
    
    for (const file of pluginFiles) {
        try {
            const plugin = require(path.join(pluginsDir, file));
            plugins[plugin.name] = plugin;
            console.log(chalk.green(`✅ Plugin loaded: ${plugin.name}`));
        } catch (error) {
            console.error(chalk.red(`❌ Failed to load plugin ${file}:`), error);
        }
    }
}

// Banner
function showBanner() {
    console.clear();
    console.log(gradient.rainbow(figlet.textSync('Wesker-MD', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    })));
    
    console.log(gradient.pastel(`
╔══════════════════════════════════════════════════╗
║     🤖 𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃 WhatsApp Bot                    ║
║     👑 Owner: ${config.author}                    ║
║     📱 Phone: ${config.owner[0]}                 ║
║     ⚡ Version: 2.0.0                             ║
║     🕒 Time: ${moment().format('DD/MM/YYYY HH:mm:ss')}  ║
╚══════════════════════════════════════════════════╝
    `));
}

// Helper functions
class Helper {
    static formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static formatUptime(uptime) {
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return `${hours} jam ${minutes} menit ${seconds} detik`;
    }

    static isOwner(sender) {
        if (!sender) return false;
        const phone = sender.split('@')[0];
        return config.owner.includes(phone) || 
               config.owner.includes(phone.replace('62', '628')) ||
               config.owner.includes('62' + phone.slice(2)) ||
               config.owner.includes('0' + phone.slice(2));
    }

    static async downloadMedia(msg, type = 'image') {
        try {
            const media = msg.message.imageMessage || 
                         msg.message.videoMessage || 
                         msg.message.audioMessage || 
                         msg.message.documentMessage;
            
            if (!media) return null;
            
            const stream = await downloadContentFromMessage(media, type);
            let buffer = Buffer.from([]);
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            return buffer;
        } catch (error) {
            console.error('Download error:', error);
            return null;
        }
    }

    static getRandom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }
}

// Main bot function
async function startBot() {
    showBanner();
    
    console.log(chalk.cyan('🚀 Starting Wesker-MD Bot...'));
    console.log(chalk.yellow('📁 Loading session...'));
    
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(chalk.blue(`📦 Using WA v${version.join('.')}, latest: ${isLatest}`));
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        browser: Browsers.macOS('Safari'),
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
            return {};
        },
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Connection update handler
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;
        
        if (qr) {
            console.log(chalk.yellow('⚠️  QR Code detected, but pairing mode is active.'));
            console.log(chalk.yellow('   Run: node pair.js for pairing code'));
        }
        
        if (connection === 'close') {
            let reason = new Error(lastDisconnect?.error?.message || 'Unknown');
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            
            console.log(chalk.red(`🔌 Connection closed: ${reason.message}`));
            
            if (statusCode === DisconnectReason.badSession) {
                console.log(chalk.red('🗑️  Bad session, deleting...'));
                await fs.remove('./session');
                console.log(chalk.yellow('🔄 Restarting...'));
                startBot();
            } else if (statusCode === DisconnectReason.connectionClosed) {
                console.log(chalk.yellow('🔄 Connection closed, reconnecting...'));
                startBot();
            } else if (statusCode === DisconnectReason.connectionLost) {
                console.log(chalk.yellow('📡 Connection lost, reconnecting...'));
                startBot();
            } else if (statusCode === DisconnectReason.connectionReplaced) {
                console.log(chalk.red('🔄 Connection replaced on another device.'));
                console.log(chalk.yellow('📱 Please restart bot.'));
                process.exit(0);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('🔓 Logged out, deleting session...'));
                await fs.remove('./session');
                console.log(chalk.yellow('🔄 Please pair again with: node pair.js'));
                process.exit(0);
            } else if (statusCode === DisconnectReason.restartRequired) {
                console.log(chalk.yellow('🔄 Restart required...'));
                startBot();
            } else if (statusCode === DisconnectReason.timedOut) {
                console.log(chalk.yellow('⏰ Connection timeout, reconnecting...'));
                startBot();
            } else {
                console.log(chalk.yellow('🔄 Unknown disconnect, reconnecting...'));
                startBot();
            }
        }
        
        if (connection === 'open') {
            console.log(chalk.green('✅ Successfully connected to WhatsApp!'));
            console.log(chalk.cyan(`👤 User: ${sock.user?.name || 'Unknown'}`));
            console.log(chalk.cyan(`🆔 ID: ${sock.user?.id || 'Unknown'}`));
            console.log(chalk.cyan(`📱 Platform: ${sock.user?.platform || 'Unknown'}`));
            console.log(chalk.cyan(`⏰ Connected at: ${moment().format('HH:mm:ss')}`));
            
            // Update profile
            try {
                const profilePic = './media/profile.jpg';
                if (fs.existsSync(profilePic)) {
                    const picBuffer = fs.readFileSync(profilePic);
                    await sock.updateProfilePicture(sock.user.id, picBuffer);
                    console.log(chalk.green('🖼️  Profile picture updated!'));
                }
                
                // Set status
                await sock.updateProfileStatus(`🤖 ${config.botName} | Online`);
            } catch (err) {
                console.log(chalk.yellow('⚠️  Could not update profile'));
            }
        }
        
        if (isNewLogin) {
            console.log(chalk.green('🆕 New login detected!'));
        }
    });

    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;
            
            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const pushname = msg.pushName || 'User';
            const isGroup = from.endsWith('@g.us');
            const isOwner = Helper.isOwner(sender);
            
            // Get message text
            let text = '';
            let type = '';
            
            if (msg.message.conversation) {
                text = msg.message.conversation;
                type = 'conversation';
            } else if (msg.message.extendedTextMessage) {
                text = msg.message.extendedTextMessage.text;
                type = 'extendedTextMessage';
            } else if (msg.message.imageMessage) {
                text = msg.message.imageMessage.caption || '';
                type = 'image';
            } else if (msg.message.videoMessage) {
                text = msg.message.videoMessage.caption || '';
                type = 'video';
            } else if (msg.message.documentMessage) {
                text = msg.message.documentMessage.caption || '';
                type = 'document';
            }
            
            const command = text.toLowerCase().trim();
            const args = text.trim().split(' ').slice(1);
            const prefix = config.prefa.find(p => command.startsWith(p)) || '';
            
            // Log message
            const logTime = moment().format('HH:mm:ss');
            console.log(chalk.cyan(`[${logTime}] ${isGroup ? '👥' : '👤'} ${pushname}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`));
            
            // Auto read message
            await sock.readMessages([msg.key]);
            
            // Handle commands
            if (prefix) {
                const cmd = command.slice(prefix.length).split(' ')[0];
                const fullCmd = command.slice(prefix.length);
                
                // Check plugins first
                let pluginHandled = false;
                for (const pluginName in plugins) {
                    const plugin = plugins[pluginName];
                    if (plugin.command && Array.isArray(plugin.command)) {
                        for (const pluginCmd of plugin.command) {
                            if (command.startsWith(pluginCmd) || cmd === pluginCmd.replace(prefix, '')) {
                                try {
                                    await plugin.execute(sock, msg, from, args, command);
                                    pluginHandled = true;
                                    return;
                                } catch (error) {
                                    console.error(chalk.red(`Plugin ${pluginName} error:`), error);
                                    await sock.sendMessage(from, { 
                                        text: `❌ Error in plugin: ${error.message}` 
                                    });
                                    return;
                                }
                            }
                        }
                    }
                }
                
                // Built-in commands if not handled by plugin
                if (!pluginHandled) {
                    switch (cmd) {
                        case 'menu':
                            if (plugins.menu) {
                                await plugins.menu.execute(sock, msg, from);
                            } else {
                                await sock.sendMessage(from, {
                                    text: `*${config.botName} Menu*\n\nType .help for commands list`
                                });
                            }
                            break;
                            
                        case 'ping':
                            const start = Date.now();
                            await sock.sendMessage(from, { text: '🏓 Pong!' });
                            const latency = Date.now() - start;
                            await sock.sendMessage(from, {
                                text: `*PONG!*\n\n⚡ Latency: ${latency}ms\n📡 Server: Online\n💾 Memory: ${Helper.formatSize(process.memoryUsage().heapUsed)}`
                            });
                            break;
                            
                        case 'owner':
                            await sock.sendMessage(from, {
                                text: `*👑 OWNER INFORMATION*\n\nName: ${config.author}\nPhone: ${config.owner[0]}\nWhatsApp: https://wa.me/${config.owner[0].replace('+', '')}\n\nContact for support or bug reports.`
                            });
                            break;
                            
                        case 'info':
                            const used = process.memoryUsage();
                            const uptime = Helper.formatUptime(process.uptime());
                            
                            await sock.sendMessage(from, {
                                text: `*🤖 BOT INFORMATION*\n\nName: ${config.botName}\nOwner: ${config.author}\nVersion: 2.0.0\nPlatform: Node.js ${process.version}\nUptime: ${uptime}\n\n*MEMORY USAGE*\nRSS: ${Helper.formatSize(used.rss)}\nHeap: ${Helper.formatSize(used.heapUsed)}/${Helper.formatSize(used.heapTotal)}\n\n*CONNECTION*\nStatus: Connected\nMode: Pairing Code\nPrefix: ${config.prefa.join(', ')}`
                            });
                            break;
                            
                        case 'stats':
                            const chats = await sock.groupFetchAllParticipating();
                            const chatCount = Object.keys(chats).length;
                            
                            await sock.sendMessage(from, {
                                text: `*📊 BOT STATISTICS*\n\nGroups: ${chatCount}\nPlugins: ${Object.keys(plugins).length}\nUptime: ${Helper.formatUptime(process.uptime())}\nMemory: ${Helper.formatSize(process.memoryUsage().heapUsed)}\nNode: ${process.version}\nPlatform: ${process.platform}`
                            });
                            break;
                            
                        case 'runtime':
                            const uptimeSec = process.uptime();
                            const days = Math.floor(uptimeSec / 86400);
                            const hours = Math.floor((uptimeSec % 86400) / 3600);
                            const minutes = Math.floor((uptimeSec % 3600) / 60);
                            const seconds = Math.floor(uptimeSec % 60);
                            
                            await sock.sendMessage(from, {
                                text: `*⏰ RUNTIME*\n\n${days > 0 ? `${days} days ` : ''}${hours}h ${minutes}m ${seconds}s\n\nStarted: ${moment(Date.now() - (uptimeSec * 1000)).format('DD/MM/YYYY HH:mm:ss')}`
                            });
                            break;
                            
                        case 'speedtest':
                            await sock.sendMessage(from, { text: '⏳ Testing speed...' });
                            const execPromise = util.promisify(exec);
                            try {
                                const { stdout } = await execPromise('speed-test --json');
                                const result = JSON.parse(stdout);
                                await sock.sendMessage(from, {
                                    text: `*📶 SPEED TEST*\n\nPing: ${result.ping} ms\nDownload: ${(result.download / 1000000).toFixed(2)} Mbps\nUpload: ${(result.upload / 1000000).toFixed(2)} Mbps\nISP: ${result.isp}\nServer: ${result.server.name}`
                                });
                            } catch (error) {
                                await sock.sendMessage(from, {
                                    text: '❌ Speed test failed. Install: npm install -g speed-test'
                                });
                            }
                            break;
                            
                        case 'sc':
                        case 'source':
                        case 'script':
                            await sock.sendMessage(from, {
                                text: `*📁 SOURCE CODE*\n\nBot Name: ${config.botName}\nCreator: ${config.author}\nVersion: 2.0.0\n\nThis bot is private and not open source.\nContact owner for more information.`
                            });
                            break;
                            
                        case 'donate':
                        case 'donasi':
                            await sock.sendMessage(from, {
                                text: `*💝 DONATION*\n\nThank you for considering donation!\n\nYour support helps maintain this bot!`
                            });
                            break;
                            
                        default:
                            // Check if command exists in any plugin
                            let found = false;
                            for (const pluginName in plugins) {
                                const plugin = plugins[pluginName];
                                if (plugin.command && Array.isArray(plugin.command)) {
                                    for (const pluginCmd of plugin.command) {
                                        if (command.startsWith(pluginCmd)) {
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            if (!found) {
                                await sock.sendMessage(from, {
                                    text: `❌ Command not found!\n\nType .menu to see available commands.\nType .help for help menu.`
                                });
                            }
                            break;
                    }
                }
            }
            
            // Auto response for non-commands
            if (!prefix && text) {
                const lowerText = text.toLowerCase();
                const responses = {
                    'hai': `Hai juga ${pushname}! 👋`,
                    'halo': `Halo ${pushname}! 😊`,
                    'p': `Ada apa ${pushname}?`,
                    'bot': `Ya, saya ${config.botName}! 🤖`,
                    'wesker': `Yes, that's me! ${config.author} is my creator.`,
                    'thanks': `You're welcome ${pushname}! 😊`,
                    'makasih': `Sama-sama ${pushname}! 😄`
                };
                
                for (const [key, response] of Object.entries(responses)) {
                    if (lowerText.includes(key)) {
                        await sock.sendMessage(from, 
