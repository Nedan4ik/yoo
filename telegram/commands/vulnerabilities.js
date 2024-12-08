const {FINAL_API_URL} = require("../main");
module.exports.usage = () => {
    return '/vulners <token>';
}

module.exports.name = () => {
    return 'vulners';
}

module.exports.handle = async (bot, args, chatId) => {
    if (args.length < 2) {
        bot.sendMessage(chatId, module.exports.usage());
        return;
    }

    bot.sendMessage(chatId, 'Пытаюсь получить последние уязвимости...');

    await fetch(FINAL_API_URL + 'vulnerabilities', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${args[1]}`,
        }
    }).then(res => res.json())
        .then(json => {
            let text = '*Последние уязвимости:*\n\n';

            for (const vulner of json.data.vulns) {
                text += `*ID:* ${vulner.id}\n`;
                text += `*Название:* ${vulner.title}\n`;
                text += `*Дата:* ${vulner.date}\n`;
                text += `*Источник:* ${vulner.source}\n`;
                text += '\n';
            }

            bot.sendMessage(chatId, text, {parse_mode: 'Markdown'});

            // console.log(json);
        });
};

module.exports.desc = () => {
    return 'Получаение последних уязвимостей';
};