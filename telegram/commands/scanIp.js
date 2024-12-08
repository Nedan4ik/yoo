const {FINAL_API_URL} = require("../main");

module.exports.usage = () => {
    return '/scanIp <token> <ip/domain>';
}

module.exports.name = () => {
    return 'scanIp';
}

module.exports.handle = async (bot, args, chatId) => {
    if (args.length < 3) {
        bot.sendMessage(chatId, module.exports.usage());
        return;
    }

    bot.sendMessage(chatId, `Начинаю сканирование ${args[2]}...`);

    await fetch(FINAL_API_URL + 'scanIp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${args[1]}`,
        },
        body: JSON.stringify({
            ip: args[2],
        })
    }).then(res => res.json())
        .then(json => {
            if (json.status !== 'OK') {
                bot.sendMessage(chatId, `Произошла ошибка: ${json.message}`);

                if (json.details)
                    bot.sendMessage(`Детали ошибки: ${json.details}`);

                return;
            }

            const vulns = json.data;

            let text = `Уязвимости на айпи/домене ${args[2]}:\n\n`;

            if (vulns.status !== 'уязвим') {
                bot.sendMessage(chatId, 'На айпи/домене не найдено уязвимостей.');
                return;
            }

            for (const vuln of vulns.vulns) {
                const status = vuln.verified ? 'Проверено' : 'Не проверено';
                const ports = vuln.ports.join(', ');

                text += `*${vuln.name}:*\n`;
                text += `*Статус:* ${status || 'Неизвестен'}\n`;
                text += `*Описание:* ${vuln.summary || 'Нет описания'}\n`;
                text += `*Порты:* ${ports || 'Нету информации'}\n`;
                text += `*Оценка CVSS:* ${vuln.cvss || 'Не указано'}\n`;
                text += '\n';
            }

            bot.sendMessage(chatId, text, {parse_mode: 'Markdown'})
        });

/*    const vulns = await getVulns(args[1]);
    console.log(vulns);

    let text = `Уязвимости на айпи/домене ${args[1]}`;

    if (vulns.status !== 'уязвим') {
        bot.sendMessage(chatId, 'На айпи/домене не найдено уязвимостей.');
        return;
    }

    for (const vuln of vulns.vulns) {
        const status = vuln.verified ? 'Проверено' : 'Не проверено';
        const ports = vuln.ports.join(', ');

        text += `*${vuln.name}:*\n`;
        text += `*Статус:* ${status || 'Неизвестен'}\n`;
        text += `*Описание:* ${vuln.summary || 'Нет описания'}\n`;
        text += `*Порты:* ${ports || 'Нету информации'}\n`;
        text += `*Оценка CVSS:* ${vuln.cvss || 'Не указано'}\n`;
        text += '\n';
    }

    bot.sendMessage(chatId, text, {parse_mode: 'Markdown'})*/
};

module.exports.desc = () => {
    return 'Сканирование последних уязвимостей';
};