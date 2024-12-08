const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const telegramBot = new TelegramBot('<token>', {polling: true});

let commandHandlers = [];

process.on('uncaughtException', ex => {
    console.error(`Произошла необработанная ошибка: ${ex}`);
    console.error(ex);
});

fs.readdir('./commands', (err, files) => {
    if (err) {
        console.log(`Произошла ошибка при читании директории: ${err}`);
        throw err;
    }

    for (const file of files) {
        const requirement = require(`./commands/${file}`);

        if (!requirement.usage || !requirement.handle || !requirement.name || !requirement.desc) {
            continue;
        }

        commandHandlers.push(requirement);
    }
});

telegramBot.on('message', msg => {
    if (msg.text.startsWith('/')) {
        const mes = msg.text.substring(1);
        const args = mes.split(' ');

        if (args[0].toLowerCase() === 'help' || args[0].toLowerCase() === 'start') {
            let text = `Команды бота:\n`;

            for (const req of commandHandlers) {
                text += `*Название:* ${req.name()}\n`;
                text += `*Использование:* ${req.usage()}\n`;
                text += `*Описание:* ${req.desc()}\n`;
                text += '\n';
            }

            telegramBot.sendMessage(msg.from.id, `Этот бот предназначен для поиска последних уязвимостей и уязвимостей на IP адресах/доменах.\n\n${text}`, { parse_mode: 'Markdown' });
            return;
        }

        for (const handler of commandHandlers) {
            if (handler.name().toLowerCase() === args[0].toLowerCase()) {
                handler.handle(telegramBot, args, msg.from.id);
            }
        }
    }
});

module.exports.FINAL_API_URL = "http://localhost:8080/api/v1/";