const fs = require('fs');
const path = require('path');

// We merge multiple sources to match the comprehensive nature of Wordplays
const inputPaths = [
    path.join(__dirname, 'csw24.txt'),
    // path.join(__dirname, 'words_alpha.txt'),
    // path.join(__dirname, 'sowpods.txt'),
    // path.join(__dirname, 'twl06.txt')
];
const outputPath = path.join(__dirname, 'dictionary.js');

console.log('Processing and merging dictionaries...');

const wordSet = new Set();

inputPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`Reading ${path.basename(filePath)}...`);
        const data = fs.readFileSync(filePath, 'utf8');
        const words = data.split(/\r?\n/);
        words.forEach(word => {
            const cleanWord = word.trim().toLowerCase();
            // Filter: 2+ letters, only alpha
            if (cleanWord.length >= 2 && /^[a-z]+$/.test(cleanWord)) {
                wordSet.add(cleanWord);
            }
        });
    }
});

const alphagramMap = {};

wordSet.forEach(word => {
    const alphagram = word.split('').sort().join('');
    if (!alphagramMap[alphagram]) {
        alphagramMap[alphagram] = [];
    }
    alphagramMap[alphagram].push(word);
});

// Wrap in a JS variable for easy loading via <script> tag
const outputContent = `window.DICTIONARY = ${JSON.stringify(alphagramMap)};`;

fs.writeFileSync(outputPath, outputContent);

console.log(`Finished! Merged into ${wordSet.size} unique words.`);
console.log(`Dictionary saved to ${outputPath}`);
