const Telegraf = require('telegraf');
const config = require('./config');

const bot = new Telegraf(config.botToken);

let dataService = null;
function setDataService(ds) {
    dataService = ds;
}

let presence = null;
function setPresenceService(pres) {
    presence = pres;

    presence.setCallback(presenceUpdate);
}


//get username for group command handling
bot.telegram.getMe().then((botInfo) => {
    bot.options.username = botInfo.username;
    console.log("Initialized", botInfo.username);
});

function userString(ctx) {
    return JSON.stringify(ctx.from.id == ctx.chat.id ? ctx.from : {
        from: ctx.from,
        chat: ctx.chat
    });
}

function logMsg(ctx) {
    var from = userString(ctx);
    console.log('<', ctx.message.text, from)
}

function logOutMsg(ctx, text) {
    console.log('>', {
        id: ctx.chat.id
    }, text);
}

function broadcastMsg(broadcastMessage) {
    let subscribedChats = dataService.getChatList();
    subscribedChats.forEach(userId => {
        console.log(">", {id: userId}, broadcastMessage);
        bot.telegram.sendMessage(userId, broadcastMessage);
    })
}

function generateLeftMsg(person) {
    let username = person.username;
    let firstName = person.name.split(' ')[0];
    return `❌ ${firstName} (${username}) ist gegangen.`;
}

function generateJoinedMsg(person) {
    let username = person.username;
    let firstName = person.name.split(' ')[0];
    return `✅ ${firstName} (${username}) ist gekommen.`;
}

function generateCurrentlyPresentMsg() {
    persons = dataService.getPresence();
    let msg = "Aktuell anwesend:";
    persons.forEach(person => {
        let username = person.username;
        let firstName = person.name.split(' ')[0];
        msg += `\n - ${firstName} (${username})`;
    });
    return msg;
}

function presenceUpdate(data) {
    let joined = data.joined;
    let left = data.left;

    joined.forEach(person => {
        let msg = generateJoinedMsg(person);
        broadcastMsg(msg);
    });

    left.forEach(person => {
        let msg = generateLeftMsg(person);
        broadcastMsg(msg);
    })

}

bot.command('start', ctx => {
    logMsg(ctx);
    dataService.registerChat(ctx);
    var m = "Ich werde dir nun Änderungen in der CfH Anwesenheit zukommen lassen";
    ctx.reply(m);
    logOutMsg(ctx, m);
});

bot.command('status', ctx => {
    logMsg(ctx);
    let msg = generateCurrentlyPresentMsg();
    logOutMsg(ctx, msg);
    ctx.reply(msg);
});

bot.command('stop', ctx => {
    logMsg(ctx);
    dataService.removeChat(ctx);
    var m = "OK, du bekommst jetzt keinen Spam mehr.";
    logOutMsg(ctx, m);
    ctx.reply(m);
});

bot.startPolling();

module.exports = {
    setDataService,
    setPresenceService
}