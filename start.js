const { spawn } = require('child_process');
const fs = require('fs-extra');
const chalk = require('chalk');
const gradient = require('gradient-string');
const figlet = require('figlet');

console.clear();
console.log(gradient.rainbow(figlet.textSync('Wesker-MD', {
    font: 'Small',
    horizontalLayout: 'default'
})));

console.log(gradient.pastel(`
╔══════════════════════════════════════╗
║     𝐖𝐞𝐬𝐤𝐞𝐫-𝐌𝐃 Auto Starter           ║
║     Created by: 𝐅𝐞𝐛𝐫𝐲𝐖𝐞𝐬𝐤𝐞𝐫         ║
╚══════════════════════════════════════╝
`));

async function checkRequirements() {
    console.log(chalk.blue('🔍 Checking requirements...'));
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    
    if (majorVersion < 16) {
        console.log(chalk.red(`❌ Node.js ${nodeVersion} is too old!`));
        console.log(chalk.yellow('📦 Please install Node.js 16 or higher.'));
        process.exit(1);
    }
    
    console.log(chalk.green(`✅ Node.js ${nodeVersion}`));
    
    // Check npm
    try {
        const { execSync } = require('child_process');
        const npmVersion = execSync('npm --version').toString().trim();
        console.log(chalk.green(`✅ npm ${npmVersion}`));
    } catch (error) {
        console.log(chalk.yellow('⚠️  npm not found'));
    }
    
    // Check ffmpeg
    try {
        const { execSync } = require('child_process');
        execSync('ffmpeg -version', { stdio: 'pipe' });
        console.log(chalk.green('✅ ffmpeg installed'));
    } catch (error) {
        console.log(chalk.yellow('⚠️  ffmpeg not found (required for media processing)'));
    }
    
    // Check dependencies
    if (!fs.existsSync('node_modules')) {
        console.log(chalk.yellow('📦 Installing dependencies...'));
        const install = spawn('npm', ['install'], { stdio: 'inherit' });
        
        install.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green('✅ Dependencies installed'));
                startBot();
            } else {
                console.log(chalk.red('❌ Failed to install dependencies'));
                process.exit(1);
            }
        });
    } else {
        startBot();
    }
}

function startBot() {
    console.log(chalk.blue('🚀 Starting Wesker-MD Bot...'));
    
    if (fs.existsSync('./session/creds.json')) {
        console.log(chalk.green('✅ Session found, starting bot...'));
        
        const botProcess = spawn('node', ['index.js'], {
            stdio: 'inherit',
            shell: true
        });
        
        botProcess.on('error', (error) => {
            console.error(chalk.red('❌ Failed to start bot:'), error);
            process.exit(1);
        });
        
        botProcess.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.yellow('🔄 Bot stopped gracefully'));
            } else if (code === 1) {
                console.log(chalk.red('❌ Bot crashed, restarting in 5 seconds...'));
                setTimeout(startBot, 5000);
            } else {
                console.log(chalk.red(`❌ Bot exited with code ${code}`));
                console.log(chalk.yellow('🔄 Restarting in 10 seconds...'));
                setTimeout(startBot, 10000);
            }
        });
        
        // Handle process signals
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n🛑 Stopping bot...'));
            botProcess.kill('SIGINT');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log(chalk.yellow('\n🛑 Terminating bot...'));
            botProcess.kill('SIGTERM');
            process.exit(0);
        });
        
    } else {
        console.log(chalk.yellow('⚠️  No session found!'));
        console.log(chalk.cyan('🔗 Starting pairing mode...\n'));
        
        const pairProcess = spawn('node', ['pair.js'], {
            stdio: 'inherit',
            shell: true
        });
        
        pairProcess.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green('\n✅ Pairing successful!'));
                console.log(chalk.yellow('🔄 Starting bot in 3 seconds...'));
                setTimeout(startBot, 3000);
            } else {
                console.log(chalk.red('\n❌ Pairing failed!'));
                console.log(chalk.yellow('🔄 Restarting process in 10 seconds...'));
                setTimeout(checkRequirements, 10000);
            }
        });
    }
}

// Start checking requirements
checkRequirements().catch(console.error);
