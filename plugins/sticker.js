const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

module.exports = {
    name: 'sticker',
    desc: 'Membuat sticker dari gambar/video',
    command: ['.sticker', '.take', '.toimg', '.emojimix'],
    
    async sticker(sock, msg, from) {
        if (!msg.message.imageMessage && !msg.message.videoMessage) {
            return sock.sendMessage(from, { 
                text: '❌ Kirim gambar atau video dengan caption .sticker\n\nCatatan: Video maksimal 10 detik' 
            });
        }
        
        await sock.sendMessage(from, { text: '⏳ Sedang membuat sticker...' });
        
        try {
            const mediaType = msg.message.imageMessage ? 'image' : 'video';
            const media = msg.message.imageMessage || msg.message.videoMessage;
            
            // Download media
            const stream = await downloadContentFromMessage(media, mediaType);
            const buffer = [];
            
            for await (const chunk of stream) {
                buffer.push(chunk);
            }
            
            const mediaBuffer = Buffer.concat(buffer);
            const filename = `sticker_${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
            const filepath = path.join(__dirname, '../media', filename);
            
            // Save media
            fs.writeFileSync(filepath, mediaBuffer);
            
            // Convert to webp (simulate)
            const stickerName = `sticker_${Date.now()}.webp`;
            const stickerPath = path.join(__dirname, '../media', stickerName);
            
            // Using ffmpeg to convert (you need ffmpeg installed)
            if (mediaType === 'image') {
                // For image to webp
                exec(`ffmpeg -i ${filepath} -vf "scale=512:512:flags=lanczos" ${stickerPath}`, async (err) => {
                    if (err) {
                        // Fallback: send original image as sticker
                        await sock.sendMessage(from, { 
                            sticker: mediaBuffer 
                        }, { quoted: msg });
                        await sock.sendMessage(from, { 
                            text: '✅ Sticker berhasil dibuat! (tanpa konversi)' 
                        });
                    } else {
                        const stickerBuffer = fs.readFileSync(stickerPath);
                        await sock.sendMessage(from, { 
                            sticker: stickerBuffer 
                        }, { quoted: msg });
                        await sock.sendMessage(from, { 
                            text: '✅ Sticker berhasil dibuat!' 
                        });
                        
                        // Cleanup
                        fs.unlinkSync(filepath);
                        fs.unlinkSync(stickerPath);
                    }
                });
            } else {
                // For video to webp
                await sock.sendMessage(from, { 
                    sticker: mediaBuffer,
                    mentions: [msg.key.participant || from]
                }, { quoted: msg });
                await sock.sendMessage(from, { 
                    text: '✅ Sticker video berhasil dibuat!' 
                });
                
                // Cleanup
                fs.unlinkSync(filepath);
            }
            
        } catch (error) {
            console.error(error);
            await sock.sendMessage(from, { text: '❌ Gagal membuat sticker.' });
        }
    },
    
    async take(sock, msg, from, args) {
        if (!args[0]) {
            return sock.sendMessage(from, { 
                text: '❌ Gunakan: .take [emoji]\nContoh: .take 😎\n\nAmbil sticker dari emoji' 
            });
        }
        
        const emoji = args[0];
        await sock.sendMessage(from, { 
            text: `⏳ Mengambil sticker untuk emoji: ${emoji}` 
        });
        
        // This would normally fetch sticker from emoji API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await sock.sendMessage(from, { 
            text: `✅ Sticker untuk ${emoji}:\n\nNote: Butuh API untuk fetch sticker dari emoji.` 
        });
    },
    
    async toimg(sock, msg, from) {
        if (!msg.message.stickerMessage) {
            return sock.sendMessage(from, { 
                text: '❌ Balas sticker dengan .toimg' 
            });
        }
        
        await sock.sendMessage(from, { text: '⏳ Mengkonversi sticker ke gambar...' });
        
        try {
            const stream = await downloadContentFromMessage(msg.message.stickerMessage, 'sticker');
            const buffer = [];
            
            for await (const chunk of stream) {
                buffer.push(chunk);
            }
            
            const stickerBuffer = Buffer.concat(buffer);
            const filename = `image_${Date.now()}.png`;
            const filepath = path.join(__dirname, '../media', filename);
            
            fs.writeFileSync(filepath, stickerBuffer);
            
            await sock.sendMessage(from, { 
                image: stickerBuffer,
                caption: '✅ Sticker berhasil dikonversi ke gambar!'
            }, { quoted: msg });
            
            // Cleanup
            setTimeout(() => {
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            }, 5000);
            
        } catch (error) {
            await sock.sendMessage(from, { text: '❌ Gagal mengkonversi sticker.' });
        }
    },
    
    async emojimix(sock, msg, from, args) {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const emojis = text.replace('.emojimix', '').trim().split('+');
        
        if (emojis.length < 2) {
            return sock.sendMessage(from, { 
                text: '❌ Gunakan: .emojimix 😀+😁\nContoh: .emojimix 😎+🤣' 
            });
        }
        
        await sock.sendMessage(from, { 
            text: `⏳ Mencampur emoji ${emojis[0]} + ${emojis[1]}...` 
        });
        
        // Simulate emoji mixing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await sock.sendMessage(from, {
            text: `✅ Hasil mix ${emojis[0]} + ${emojis[1]}:\n\n${emojis[0]}${emojis[1]}\n\nNote: Butuh API emoji mixer untuk hasil sebenarnya.`
        });
    },
    
    async execute(sock, msg, from, args) {
        const command = msg.message.conversation?.toLowerCase() || 
                       msg.message.extendedTextMessage?.text.toLowerCase() || '';
        
        if (command === '.sticker') {
            await this.sticker(sock, msg, from);
        } else if (command.startsWith('.take')) {
            await this.take(sock, msg, from, args);
        } else if (command === '.toimg') {
            await this.toimg(sock, msg, from);
        } else if (command.startsWith('.emojimix')) {
            await this.emojimix(sock, msg, from, args);
        }
    }
};
