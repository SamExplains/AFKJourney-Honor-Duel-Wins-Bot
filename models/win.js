module.exports = (sequelize, DataTypes) => {
    return sequelize.define('wins', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        season: {type: DataTypes.INTEGER},
        artifact: {type: DataTypes.STRING},
        lives: {type: DataTypes.INTEGER},
        trophies: {type: DataTypes.INTEGER},
        faction: {type: DataTypes.STRING},
        units: {type: DataTypes.STRING},
        photo_url: {type: DataTypes.STRING},
        photo_compressed: {type: DataTypes.TEXT},
        timestamp: {type: DataTypes.DATE},
        user_id: {type: DataTypes.INTEGER},
        avatar: {type: DataTypes.STRING},
        username: {type: DataTypes.STRING},
    });
};
