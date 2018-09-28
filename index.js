const dataService = require('./dataService');
dataService.loadFile();

const presence = require('./presence');
presence.setDataService(dataService);

const bot = require('./bot');
bot.setDataService(dataService);
bot.setPresenceService(presence);

