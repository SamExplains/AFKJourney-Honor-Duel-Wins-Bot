const https = require('https'); // or 'http' for non-https URLs
const sharp = require('sharp');

const imageToBase64 = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = [];

            response.on('data', (chunk) => {
                data.push(chunk);
            });

            response.on('end', async () => {
                const buffer = Buffer.concat(data);

                // resize images to 1080 width and JPG for < 1000kb limit
                const resizedBuffer = await sharp(buffer)
                    .resize({ width: 1080 }) // no resize, just re-encode
                    .toFormat('jpg')
                    .toBuffer();

                const base64String = resizedBuffer.toString('base64');
                resolve(base64String);
            });

        }).on('error', (err) => {
            reject(err);
        });
    });
}


const compressImageUrl = async (imageUrl) => {
    try {
        if (imageUrl.startsWith("http") || imageUrl.startsWith("https")) {
            return await imageToBase64(imageUrl);
        }
    } catch (e) {
        // Error fetching image
        console.log('Error ',e);
    }
}

module.exports = { compressImageUrl };