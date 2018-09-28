const fs = require('fs');
var dataFileName = "./data.json";

var data = {};
var fileLocked = false;

function loadFile() {
    fs.readFile(dataFileName, (err, content) => {
        if (err) throw err;
        data = JSON.parse(content);
        if(!data.users) {
            data.users = {};
        }
        if(!data.presence) {
            data.presence = [];
        }
    });
}

function saveFile() {
    if (!fileLocked) {
        fileLocked = true;
        var json = JSON.stringify(data);
        fs.writeFile(dataFileName, json, 'utf8', function (err) {
            if (err) throw err;
            fileLocked = false;
        })
    }
}

function registerChat(msg) {
    var uid = msg.chat.id;
    var usr = { enabled: true, data: { from: msg.from, chat: msg.chat } };
    data.users[uid] = usr;
    saveFile();
}

function removeChat(msg) {
    var uid = msg.chat.id;
    delete data.users[uid];
    saveFile();
}

function getChatList() {
    return Object.keys(data.users);
}

function setPresence(presenceData) {
    data.presence = presenceData;
    saveFile();
}

function getPresence() {
    return data.presence;
}

module.exports = {
    loadFile,
    saveFile,
    registerChat,
    removeChat,
    getChatList,
    setPresence,
    getPresence
};