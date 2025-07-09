// database.js
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    // SQLite only
    storage: './database.sqlite',
});

const db = { sequelize, Sequelize };

// Dynamically load all models
const modelFiles = fs.readdirSync(path.resolve(__dirname, '../models')).filter(file => file.endsWith('.js'));

for (const file of modelFiles) {
    const model = require(`${path.resolve(__dirname, '../models')}/${file}`)(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
}

module.exports = db;