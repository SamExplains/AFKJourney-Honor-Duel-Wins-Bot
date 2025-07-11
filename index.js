// Load environment variables
require('dotenv').config()
const fs = require('node:fs');
const path = require('node:path');
// Require the necessary discord.js classes
const {Client, Collection, GatewayIntentBits, Partials, Events} = require('discord.js');

// SQLite
const { sequelize } = require('./database/database');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.once(Events.ClientReady, async () => {
    // Sync Models if don't exist
    await sequelize.sync();
});

// Establish the commands that the bot will listen for
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    /**
     * Sequelize related:
     * When working with slash commands and trying to access those Models in other files(slash command), we are
     * attaching the model to the client once event where in ready.js we are then attaching to client object to
     * access wherever needed.
     * */
    if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
    }
}

// Log in to Discord with your client's token
client.login(process.env.CLIENT_TOKEN);
