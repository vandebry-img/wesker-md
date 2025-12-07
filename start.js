const { exec } = require('child_process');
const fs = require('fs-extra');
const chalk = require('chalk');

console.log(chalk.cyan.bold(`
╔══════════════════════════════╗
║    𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃 𝐀𝐮𝐭𝐨𝐬𝐭𝐚𝐫𝐭      ║
╚══════════════════════════════╝
`));

// Cek apakah sudah paired
if (fs.existsSync('./session/creds.json')) {
    console.log(chalk.green('✅ Session ditemukan, starting bot...'));
    exec('node index.js', (error, stdout, stderr) => {
        if (error) {
            console.error(chalk.red(`Error: ${error}`));
            return;
        }
        console.log(stdout);
        console.error(stderr);
    });
} else {
    console.log(chalk.yellow('⚠️  Session tidak ditemukan, mulai pairing...'));
    console.log(chalk.yellow('📱 Mode: Pairing Code (OTP)'));
    console.log(chalk.white('\nIkuti langkah-langkah di terminal...\n'));
    
    exec('node pair.js', (error, stdout, stderr) => {
        if (error) {
            console.error(chalk.red(`Error: ${error}`));
            return;
        }
        console.log(stdout);
        console.error(stderr);
    });
}
