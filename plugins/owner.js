const fs = require('fs');
const path = require('path');
const config = require('../config');
const { exec } = require('child_ process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
    name: 'owner',
    desc: 'Fitur khusus owner bot',
    command: ['.bc', '.broadcast', '.eval', '.exec', '.getses', '.shutdown', '.restart'],
    
    isOwner(sender) {
        const phone = sender.split('@')[0];
        return config.owner.includes(phone) || config.owner.includes(phone.replace('62', '628'));
    },
    
    async broadcast(sock, msg, from, args) {
        if (!this.isOwner(from)) {
            return sock.sendMessage(from, { text: '❌ Hanya owner yang bisa menggunakan fitur ini!' });
        }
        
        if (!args[0]) {
            return sock.sendMessage(from, { 
                text: '❌ Gunakan: .bc [pesan]\nContoh: .bc Halo semua user!' 
            });
        }
        
        const message = args.join(' ');
        await sock.sendMessage(from, { text: '📢 Mengirim broadcast ke semua chat...' });
        
        // Get all chats (simplified - in real app you need to store chat list)
        try {
            // This is a simplified version. In real app, you should maintain a database of chats
            const chats = await sock.groupFetchAllParticipating();
            let success = 0;
            let failed = 0;
            
            for (const chat of Object.values(chats)) {
                try {
                    await sock.sendMessage(chat.id, { 
                        text: `📢 *BROADCAST*\n\n${message}\n\n_From: ${config.author}_` 
                    });
                    success++;
                } catch (err) {
                    failed++;
                }
            }
            
            await sock.sendMessage(from, { 
                text: `✅ Broadcast selesai!\nBerhasil: ${success}\nGagal: ${failed}` 
            });
            
        } catch (error) {
            await sock.sendMessage(from, { text: '❌ Gagal broadcast.' });
        }
    },
    
    async eval(sock, msg, from, args) {
        if (!this.isOwner(from)) {
            return sock.sendMessage(from, { text: '❌ Hanya owner yang bisa menggunakan fitur ini!' });
        }
        
        if (!args[0]) {
            return sock.sendMessage(from, { 
                text: '❌ Gunakan: .eval [code]\nContoh: .eval 1+1' 
            });
        }
        
        try {
            const code = args.join(' ');
            let result = eval(code);
            
            if (typeof result === 'object') {
                result = JSON.stringify(result, null, 2);
            }
            
            await sock.sendMessage(from, { 
                text: `📝 *EVAL RESULT*\n\nInput:\n\`\`\`${code}\`\`\`\n\nOutput:\n\`\`\`${result}\`\`\`` 
            });
            
        } catch (error) {
            await sock.sendMessage(from, { 
                text: `❌ *EVAL ERROR*\n\n\`\`\`${error.message}\`\`\`` 
            });
        }
    },
    
    async exec(sock, msg, from, args) {
        if (!this.isOwner(from)) {
            return sock.sendMessage(from, { text: '❌ Hanya owner yang bisa menggunakan fitur ini!' });
        }
        
        if (!args[0]) {
            return sock.sendMessage(from, { 
                text: '❌ Gunakan: .exec [command]\nContoh: .exec ls' 
            });
        }
        
        try {
            const command = args.join(' ');
            const { stdout, stderr } = await execPromise(command);
            
            let output = '';
            if (stdout) output += `✅ STDOUT:\n\`\`\`${stdout}\`\`\`\n`;
            if (stderr) output += `⚠️ STDERR:\n\`\`\`${stderr}\`\`\`\n`;
            
            // Truncate if too long
            if (output.length > 4000) {
                output = output.substring(0, 4000) + '\n... [truncated]';
            }
            
            await sock.sendMessage(from, { 
                text: `💻 *EXEC RESULT*\n\nCommand: \`${command}\`\n\n${output}` 
            });
            
        } catch (error) {
            await sock.sendMessage(from, { 
                text: `❌ *EXEC ERROR*\n\n\`\`\`${error.message}\`\`\`` 
            });
        }
    },
    
    async getses(sock, msg, from) {
        if (!this.isOwner(from)) {
            return sock.sendMessage(from, { text: '❌ Hanya owner yang bisa menggunakan fitur ini!' });
        }
        
        try {
            if (fs.existsSync('./session/creds.json')) {
                const creds = fs.readFileSync('./session/creds.json', 'utf8');
                
                // Send as file if too long
                if (creds.length > 1000) {
                    const filename = `session_${Date.now()}.json`;
                    const filepath = path.join(__dirname, '../media', filename);
                    
                    fs.writeFileSync(filepath, creds);
                    await sock.sendMessage(from, {
                        document: fs.readFileSync(filepath),
                        fileName: 'session.json',
                        mimetype: 'application/json',
                        caption: '📁 Session file'
                    });
                    
                    fs.unlinkSync(filepath);
                } else {
                    await sock.sendMessage(from, { 
                        text: `📄 *SESSION DATA*\n\n\`\`\`${creds}\`\`\`` 
                    });
                }
            } else {
                await sock.sendMessage(from, { text: '❌ Session file tidak ditemukan.' });
            }
        } catch (error) {
            await sock.sendMessage(from, { text: '❌ Gagal membaca session.' });
        }
    },
    
    async shutdown(sock, msg, from) {
        if (!this.isOwner(from)) {
            return sock.sendMessage(from, { text: '❌ Hanya owner yang bisa menggunakan fitur ini!' });
        }
        
        await sock.sendMessage(from, { 
            text: '⚠️ Bot akan dimatikan dalam 3 detik...' 
        });
        
        setTimeout(() => {
            process.exit(0);
        }, 3000);
    },
    
    async restart(sock, msg, from) {
        if (!this.isOwner(from)) {
            return sock.sendMessage(from, { text: '❌ Hanya owner yang bisa menggunakan fitur ini!' });
        }
        
        await sock.sendMessage(from, { 
            text: '🔄 Bot akan restart dalam 3 detik...' 
        });
        
        setTimeout(() => {
            process.exit(1); // Exit with code 1 to trigger restart (if using pm2)
        }, 3000);
    },
    
    async execute(sock, msg, from, args) {
        const command = msg.message.conversation?.toLowerCase() || 
                       msg.message.extendedTextMessage?.text.toLowerCase() || '';
        
        if (command.startsWith('.bc') || command.startsWith('.broadcast')) {
            await this.broadcast(sock, msg, from, args);
        } else if (command.startsWith('.eval')) {
            await this.eval(sock, msg, from, args);
        } else if (command.startsWith('.exec')) {
            await this.exec(sock, msg, from, args);
        } else if (command.startsWith('.getses')) {
            await this.getses(sock, msg, from);
        } else if (command.startsWith('.shutdown')) {
            await this.shutdown(sock, msg, from);
        } else if (command.startsWith('.restart')) {
            await this.restart(sock, msg, from);
        }
    }
};
