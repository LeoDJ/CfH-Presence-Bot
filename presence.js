const request = require('request');

let dataService = null;

function setDataService(ds) {
    dataService = ds;
}

const apiUrl = "https://presence.my.cfhn.it/presence/";

let callback = null;

function comparer(otherArray) {
    return function (current) {
        return otherArray.filter(function (other) {
            return other.username == current.username
        }).length == 0;
    }
}

function poll() {
    request(apiUrl, (err, res, body) => {
        if (!err) {
            let curPresence = JSON.parse(body);
            let lastPresence = dataService.getPresence();
            let joined = curPresence.filter(comparer(lastPresence));
            let left = lastPresence.filter(comparer(curPresence));
            dataService.setPresence(curPresence);

            if(callback) {
                callback({joined: joined, left: left, current: curPresence});
            }
        }
    });
}

function setCallback(cbk) {
    callback = cbk;
}

poll();

module.exports = {
    setDataService,
    setCallback
}