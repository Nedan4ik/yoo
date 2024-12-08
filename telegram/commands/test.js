function usage() {
    return '/test <argument>';
}

function name() {
    return 'test';
}

function handle(bot, args, chatId) {
    console.log(args);
}

module.exports.usage = usage;
module.exports.name = name;
module.exports.handle = handle;

module.exports.desc = () => {
    return 'test';
};