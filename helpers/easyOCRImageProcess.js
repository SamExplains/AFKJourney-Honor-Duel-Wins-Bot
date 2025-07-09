require('dotenv').config();
const { ocrSpace } = require('ocr-space-api-wrapper');

async function easyOCRImageProcess(base64) {
    try {
        // Using the OCR.space default free API key (max 10reqs in 10mins) + remote file
        // Using your personal API key + local file
        const res = await ocrSpace('data:image/jpg;base64,'+base64, { apiKey: process.env.OCR_KEYS_1, OCREngine: 2 });
        /**
         * res2.ParsedResults[0].ParsedText
         * RETURNS THIS BELOW
         * Round
         * Complete
         * Battle Record →
         * Wins: 9
         * HP: 2
         * * Duel Points #
         * 953(+42)
         * 4 Team & Artifact →
         * Glowing Blossom
         * Tap to close
         * Share
         *
         * */
        const lines = res.ParsedResults[0].ParsedText.split('\n');
        // Search for matching indexes and get the next element right after

        const winsRegex = /^Wins:\s*(\d+)/;
        const hpRegex = /^HP:\s*(\d+)/;
        const duelLabelRegex = /[*→«‹]?\s*Duel Points\s*[»→]?/i;
        const duelPointsValueRegex = /^(\d[\d,]*)\(\+\d+\)$/;
        const teamLabelRegex = /[*→«‹]?\s*Team\s*&\s*Artifact\s*[»→]?/i;

        // Output object
        let result = {
            wins: null,
            hp: null,
            duelPoints: null,
            teamName: null
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Wins
            const winsMatch = line.match(winsRegex);
            if (winsMatch) {
                result.wins = parseInt(winsMatch[1], 10);
                continue;
            }

            // HP
            const hpMatch = line.match(hpRegex);
            if (hpMatch) {
                result.hp = parseInt(hpMatch[1], 10);
                continue;
            }

            // Duel Points Label (look ahead to next line for value)
            if (duelLabelRegex.test(line)) {
                const valueLine = lines[i + 1];
                const valueMatch = valueLine.match(duelPointsValueRegex);
                if (valueMatch) {
                    result.duelPoints = parseInt(valueMatch[1].replace(/,/g, ''), 10);
                }
                continue;
            }

            // Team Label (look ahead to next line for team name)
            if (teamLabelRegex.test(line)) {
                result.teamName = lines[i + 1]?.trim();
                continue;
            }
        }

        return result;
    } catch (error) {
        console.error(error);
    }
}

module.exports = { easyOCRImageProcess };