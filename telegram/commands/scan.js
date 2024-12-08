const {FINAL_API_URL} = require("../main");
module.exports.usage = () => {
    return '/scan <token>';
}

module.exports.name = () => {
    return 'scan';
}

module.exports.handle = async (bot, args, chatId) => {
    if (args.length < 2) {
        bot.sendMessage(chatId, module.exports.usage());
        return;
    }

    bot.sendMessage(chatId, 'Начинаю сканирование...');

    await fetch(FINAL_API_URL + 'scan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${args[1]}`
        }
    })
        .then(res => res.json())
        .then(json => {
            if (json.status === 'OK') {
                bot.sendMessage(chatId, 'Успешно! ' + json.message);
            } else {
                bot.sendMessage(chatId, 'Ошибка! ' + json.message);
            }
        });
};

module.exports.desc = () => {
    return 'Сканирование последних уязвимостей';
};