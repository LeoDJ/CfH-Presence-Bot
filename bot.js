const Telegraf = require('telegraf');
const extra = require('telegraf/extra')
const markdown = extra.markdown()
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
    return JSON.stringify(ctx.from.id === ctx.chat.id ? ctx.from : {
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
    console.log("> <broadcast>", broadcastMessage);
    subscribedChats.forEach(userId => {
        bot.telegram.sendMessage(userId, broadcastMessage, markdown);
    })
}

let maxLocationLength = -1;

function generateLocationString(location) {
    if(maxLocationLength === -1) {
        // call "currently present request" to calculate maximum location name length, should not generate loop(tm)
        generateCurrentlyPresentMsg();
    }

    // generate stylized location with padding
    let locationStr = config.emojiReplacement[location] || '❓';
    locationStr += `\` ${location} ${' '.repeat(maxLocationLength - location.length)}\`|   `;
    return locationStr;
}


function generateLeftMsg(person) {
    let username = person.username;
    return `${generateLocationString(person.location)}❌ ${username} ist vor Kurzem gegangen.`;
}

function generateJoinedMsg(person) {
    let username = person.username;
    return `${generateLocationString(person.location)}✅ ${username} ist angekommen.`;
}

function generateCurrentlyPresentMsg() {
    let persons = dataService.getPresence();

    if(persons.length === 0) {
        return "Niemand da ¯\\\\_(ツ)\\_/¯"; // escaping needed for markdown parser
    }
    else {
        // sort persons alphabetically
        persons.sort((a, b) => a.username.toLowerCase() > b.username.toLowerCase());

        // split persons into their locations
        personsByLocation = {};
        persons.forEach(person => {
            let username = person.username;
            let location = person.location;
            if(personsByLocation[location] === undefined) {
                personsByLocation[location] = [];
            }
            personsByLocation[location].push(username);
        })

        let locations = Object.keys(personsByLocation);
        // calculate maximum length of location names for alignment
        maxLocationLength = locations.reduce((prev, loc) => loc.length > prev ? loc.length : prev, 0);
        
        // generate message
        let msg = "*[ Aktuell anwesend ]*";
        locations.forEach((location, i) => {
            let locationStr = generateLocationString(location);
            personsByLocation[location].forEach(person => {
                msg += `\n${locationStr + person}`;
            });
            // draw line if needed
            if(i < locations.length - 1) {
                msg += '\n——————————————';
            }
        });

        return msg;
    }
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
    ctx.reply(msg, markdown);
});

bot.command('stop', ctx => {
    logMsg(ctx);
    dataService.removeChat(ctx);
    var m = "OK, du bekommst jetzt keinen Spam mehr.";
    logOutMsg(ctx, m);
    ctx.reply(m);
});

bot.command('broadcast', ctx => {
    logMsg(ctx);
    if(config.adminChatIds.indexOf(ctx.from.id) > -1) {
        let text = ctx.message.text.split(' ').slice(1).join(' '); //remove command
        broadcastMsg(text);
    }
    else {
        console.log("Denied broadcast to unauthenticated user");
    }
});

bot.startPolling();

module.exports = {
    setDataService,
    setPresenceService
};
