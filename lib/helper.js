const fs = require('fs-extra');
const path = require('path');

class Helper {
    static async getButtons(type = 'menu') {
        const buttons = {
            menu: [
                { buttonId: 'id-help', buttonText: { displayText: '📋 Bantuan' }, type: 1 },
                { buttonId: 'id-owner', buttonText: { displayText: '👑 Owner' }, type: 1 },
                { buttonId: 'id-info', buttonText: { displayText: 'ℹ️ Info' }, type: 1 }
            ],
            main: [
                { buttonId: '.menu', buttonText: { displayText: '📁 Menu' }, type: 1 },
                { buttonId: '.owner', buttonText: { displayText: '👑 Owner' }, type: 1 },
                { buttonId: '.button', buttonText: { displayText: '🔘 Demo' }, type: 1 },
                { buttonId: '.ping', buttonText: { displayText: '🏓 Ping' }, type: 1 }
            ]
        };
        
        return buttons[type] || buttons.menu;
    }
    
    static formatUptime(uptime) {
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return `${hours} jam ${minutes} menit ${seconds} detik`;
    }
}

module.exports = Helper;
