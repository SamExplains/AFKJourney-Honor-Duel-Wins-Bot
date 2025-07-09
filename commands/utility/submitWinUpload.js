const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
// OCR Process
const { easyOCRImageProcess } = require('../../helpers/easyOCRImageProcess');
// Compress image
const { compressImageUrl } = require('../../helpers/imageToBase64');
// Character prediction
const { extractElementsWithPrediction } = require('../../helpers/tensorflowCharacterPrediction');
// SQLite ORM
const {wins} = require("../../database/database");
// Tensorflow Models

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit-win')
        .setDescription('Submit a Honor Duel victory!'),

    async execute(client, interaction) {
        const REQUEST_TIMEOUT = 60_000;
        const { user, channel } = interaction;

        await interaction.reply({
            content: 'Please upload your image within 1 minute.',
            ephemeral: MessageFlags.Ephemeral,
        });

        // Wait for image upload
        const filter = (m) => m.author.id === user.id && m.attachments.size > 0;
        const collector = channel.createMessageCollector({ filter, max: 1, time: REQUEST_TIMEOUT });

        collector.on('collect', async (msg) => {
            /**
             * Filter and remove anything not image
             * Delete anything that is not an image
             * */
            const imageMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            const attachment = msg.attachments.first();

            const contentType = attachment.contentType?.toLowerCase();
            if (!imageMimeTypes.includes(contentType)) {
                // Delete the attachment from the channel
                await msg.delete();
                return interaction.followUp({ content: 'That was not a valid attachment and has been deleted. Image attachments only!.', ephemeral: MessageFlags.Ephemeral });
            }

            // Ask for confirmation
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm').setLabel('Submit').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
            );

            const sent = await interaction.editReply({
                content: 'Process and submit this image?',
                components: [confirmRow],
                fetchReply: true,
                ephemeral: MessageFlags.Ephemeral
            });

            // Button Collector
            const buttonFilter = i => ['confirm', 'cancel'].includes(i.customId) && i.user.id === interaction.user.id;
            const buttonCollector = sent.createMessageComponentCollector({ filter: buttonFilter, max: 1, time: REQUEST_TIMEOUT / 2 });

            buttonCollector.on('collect', async (i) => {
                const url = attachment.url;
                if (i.customId === 'confirm') {

                    // Show response just to not delay the buttton
                    interaction.editReply({components: [], content: 'Please wait while processing...'}).then(async () => {
                        // Delete the original image
                        // Delete the original upload
                        await msg.delete();
                        // Respond follow message to use with original attachment and visible to channel
                        interaction.followUp({ content: `${i.user.username} has submitted a Honor Duel victory 🎉.`, components: [], files: [url], fetchReply: true });
                    });

                    // Compress image to base64
                    // Images must be under 1000kb or else OCR won't process
                    // Resizing all images to width of 1080 and height will scale relative
                    // Also converting to JPG for the smaller size limit
                    const base64 = await compressImageUrl(attachment.url);

                    // Defaulting to JPG since we are reformating and resizing the images above
                    // anyway for the size limit
                    const ocrResults = await easyOCRImageProcess(base64);

                    // Cut and Process image with Model
                    const characters = await extractElementsWithPrediction(base64);

                    // Store all data into SQLite
                    await wins.create({
                        season: 0,
                        artifact: ocrResults.teamName ? ocrResults.teamName : "not detected",
                        lives: ocrResults?.lives ? ocrResults?.lives : 0,
                        trophies: ocrResults?.trophies? ocrResults?.trophies : 0,
                        faction: "not available",
                        units: characters ? JSON.stringify(characters) : "not available",
                        photo_url: url.toString(),
                        photo_compressed: base64,
                        timestamp: Date.now(),
                        user_id: i.user.id,
                        avatar: i.user.displayAvatarURL(),
                        username: i.user.username
                    });

                } else {
                    interaction.editReply({components: []}).then(async () => {
                        await msg.delete();
                        i.reply({
                            content: `${interaction.user.username} → you have chosen to cancel your request!`,
                            components: [],
                            flags: MessageFlags.Ephemeral
                        });
                    });
                }
            });

            buttonCollector.on('end', (collected) => {
                if (collected.size === 0) {
                    // Nothing was clicked, and we remove the buttons but also update the response
                    sent.edit({ content: `${interaction.user.username} → your request timed out.`, components: [] });
                }
            });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                interaction.followUp({
                    content: `${interaction.user.username} → your time limit has expired. No image was uploaded.`,
                    ephemeral: MessageFlags.Ephemeral
                });
            }
        });
    }
};