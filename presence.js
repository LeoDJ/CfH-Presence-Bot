const request = require('request');
const config = require('./config');

let dataService = null;

function setDataService(ds) {
    dataService = ds;
}

const loginUrl = "https://login.my.cfhn.it/login/token.json";
const apiUrl = "https://presence.my.cfhn.it/presence/";

let callback = null;

function loadToken() {
    const token = dataService.getToken();
    if(!token || !tokenIsValid(token)) {
        console.log("Refreshing cfhn token");
        return login(config.user.username, config.user.password)
            .then(token => dataService.setToken(token))
            .catch(err => console.warn('Error during login', err));
    }
    return Promise.resolve(dataService.getToken());
}

function comparer(otherArray) {
    return function (current) {
        return otherArray.filter(function (other) {
            return other.username === current.username && other.location === current.location;
        }).length === 0;
    }
}

function tokenIsValid(token) {
    let tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString("utf-8"));
	let now = Math.floor(Date.now() / 1000);
    return tokenData.exp > now;
}

function login(username, password) {
    return new Promise((resolve, reject) => {
        request.post(loginUrl, {body: {username, password}, json: true}, (err, res, body) => {
            if(err) {
                return reject(err);
            }
            resolve(body.token);
        })
    })
}

function poll() {
    loadToken().then(token => {
	    request(apiUrl, {auth: {bearer: token}}, (err, res, body) => {
		    if (!err) {
			    let curPresence = JSON.parse(body);
			    let lastPresence = dataService.getPresence();
			    let joined = curPresence.filter(comparer(lastPresence));
			    let left = lastPresence.filter(comparer(curPresence));
			    dataService.setPresence(curPresence);

			    if (callback) {
				    callback({joined: joined, left: left, current: curPresence});
			    }
		    }
	    });
    })
}

function setCallback(cbk) {
    callback = cbk;
}

setInterval(poll, 60 * 1000);

module.exports = {
    setDataService,
    setCallback
};
