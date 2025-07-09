const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');

const IMAGE_SIZE_W = 64;
const IMAGE_SIZE_H = 93;

function loadAndProcessImage(imageBuffer) {
    const imgTensor = tf.node.decodeImage(imageBuffer, 3); // 3 for RGB
    const resized = tf.image.resizeBilinear(imgTensor, [IMAGE_SIZE_W, IMAGE_SIZE_H]);
    return resized.toFloat().div(255);
}

// Predict a new image
async function predictImage(imageBuffer) {
    const CLASSNAMES = JSON.parse(fs.readFileSync('./helpers/tensorflow/model/character_model/character_model_labels.json'));
    const model = await tf.loadLayersModel('file://./helpers/tensorflow/model/character_model/model.json');
    const tensor = loadAndProcessImage(imageBuffer).expandDims(0);
    const prediction = model.predict(tensor);
    const predictedIndex = (await prediction.argMax(-1).data())[0];
    return CLASSNAMES[predictedIndex];
}

// Predict a new equipment
async function predictEquipment(imageBuffer) {
    const CLASSNAMES = JSON.parse(fs.readFileSync('./helpers/tensorflow/model/equipment_model/equipment_model_labels.json'));
    const model = await tf.loadLayersModel('file://./helpers/tensorflow/model/equipment_model/model.json');
    const tensor = loadAndProcessImage(imageBuffer).expandDims(0);
    const prediction = model.predict(tensor);
    const predictedIndex = (await prediction.argMax(-1).data())[0];
    return CLASSNAMES[predictedIndex];
}

const getCropParams = (screenX, screenY) => {
    // Calculate Y Start as a percentage of screen height
    const yStartPercent = screenX <= 1080 ? 0.654395500432635 : 0.65450643776824; // average from your data
    const yStart = Math.round(screenY * yStartPercent);

    // Derive card width from screen width (from ratio: 123/1320 or 108/1170)
    const cardWidthRatio = screenX <= 1080 ? 0.0925925925925926 : 0.0931818181818182; // Based on your samples
    const cardWidth = Math.round(screenX * cardWidthRatio);

    // Assume square spacing between cards and same value for left margin
    const spacing = cardWidth;
    const leftMargin = screenX <= 1080 ? screenX * 0.12037037037037 : screenX * 0.11965811965812;

    // Derive card height from card width using original aspect ratio
    // const aspectRatio = screenX >= 1280 ? (174 / 123) : (155 / 108);
    // Case 1 is Androd (1.45) , Case 2 is iOS with 2 different aspect ratios
    const aspectRatio = screenX <= 1080 ? 1.45 : screenX >= 1280 ? (174 / 123) : (155 / 108);
    const cardHeight = Math.round(cardWidth * aspectRatio);

    return {
        yStart,
        leftMargin,
        spacing,
        cardWidth,
        cardHeight
    };
}

const getCropParamsEquipment = (screenX, screenY) => {
    // Calculate Y Start as a percentage of screen height
    const yStartPercent = screenX <= 1080 ? 0.654395500432635 : 0.65450643776824; // average from your data
    const yStart = Math.round(screenY * yStartPercent);

    // Derive card width from screen width (from ratio: 123/1320 or 108/1170)
    const cardWidthRatio = screenX <= 1080 ? 0.0925925925925926 : 0.0931818181818182; // Based on your samples
    const cardWidth = Math.round(screenX * cardWidthRatio);

    // Assume square spacing between cards and same value for left margin
    const spacing = cardWidth;
    const leftMargin = screenX <= 1080 ? screenX * 0.175925925925926 : screenX * 0.175968992248062;

    // Case 1 is Androd (1.45) , Case 2 is iOS with 2 different aspect ratios
    const aspectRatio = screenX <= 1080 ? 1.45 : screenX >= 1280 ? (174 / 123) : (155 / 108);
    const cardHeight = Math.round(cardWidth * aspectRatio);

    return {
        yStart,
        leftMargin,
        spacing,
        cardWidth,
        cardHeight
    };
}

async function extractElementsWithPrediction(base64) {
    const imageBuffer = Buffer.from(base64, 'base64');
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const cropParams = getCropParams(image.width, image.height);
    const cropParamsEquipment = getCropParamsEquipment(image.width, image.height);

    // Grab regions
    const regions = {
        // Dynamically change the Y coordinate based on image size, platform or device (phone / tablet)
        characters: Array.from({ length: 5 }).map((_, i) => ({
            name: `character_card_${i + 1}`,
            // This will add extra spacing when it is the first or last element
            x: (i === 0 || i === 5 ) ? cropParams.leftMargin + (i * cropParams.spacing) : cropParams.leftMargin + ((i * cropParams.spacing) + (i * 21)),
            y: cropParams.yStart,
            w: cropParams.cardWidth,
            h: cropParams.cardHeight,
        })),
        equipment: Array.from({ length: 5 }).map((_, i) => ({
            name: `equipment_card_${i + 1}`,
            x: (i === 0 || i === 5 ) ? cropParamsEquipment.leftMargin + (i * cropParamsEquipment.spacing) : cropParamsEquipment.leftMargin + ((i * cropParamsEquipment.spacing) + (i * 21)),
            y: (image.width === 1080) ? cropParamsEquipment.yStart + 20 : cropParamsEquipment.yStart,
            w: 38,
            h: 48,
        }))
    };

    // Counter to determine to process cards or equipment
    // MAX limit for Characters / Equipment is 5 at the moment.
    let count = 0;

    const promises = regions.characters.map(async (character, index) => {
        const equipmentRegion = regions.equipment[index];
        const tempCanvas = createCanvas(character.w, character.h);
        const tempCanvasEquipment = createCanvas(equipmentRegion.w, equipmentRegion.h);
        const tempCtx = tempCanvas.getContext('2d');
        const tempCtxEquipment = tempCanvasEquipment.getContext('2d');
        tempCtx.drawImage(canvas, character.x, character.y, character.w, character.h, 0, 0, character.w, character.h);
        tempCtxEquipment.drawImage(canvas, equipmentRegion.x, equipmentRegion.y, equipmentRegion.w, equipmentRegion.h, 0, 0, equipmentRegion.w, equipmentRegion.h);

        // Step 2: Get image buffer from canvas
        const rawBuffer = tempCanvas.toBuffer('image/jpeg');
        const rawBufferEquipment = tempCanvasEquipment.toBuffer('image/jpeg');

        try {
            const imageBuffer = await sharp(rawBuffer)
                .toBuffer();

            const imageBufferEquipment = await sharp(rawBufferEquipment)
                .toBuffer();

            count += 1;
            if (count <= 5) {
                // Make prediction
                const character = await predictImage(imageBuffer)
                const equipment = await predictEquipment(imageBufferEquipment);
                return {character, equipment};
            }
        } catch (e) {
            console.error('Error processing character:', e);
            return null;  // Return null if any error occurs
        }
    });

// Wait for all promises to resolve before moving on
    return Promise.all(promises)
        .catch((err) => {
            console.error('Error in processing characters:', err);
        });
}

module.exports = { extractElementsWithPrediction }