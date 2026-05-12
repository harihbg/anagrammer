// worker.js
console.log('Worker script starting...');

// Mock window for dictionary.js
self.window = self;

try {
    console.log('Importing dictionary.js...');
    importScripts('dictionary.js');
    console.log('dictionary.js imported successfully.');
} catch (e) {
    console.error('Worker failed to import dictionary.js:', e);
    self.postMessage({ type: 'error', message: 'Failed to import dictionary script: ' + e.message });
}

let cachedKeysByLength = null;

function getKeysByLength() {
    if (cachedKeysByLength) return cachedKeysByLength;
    if (!self.DICTIONARY) return {};

    cachedKeysByLength = {};
    const keys = Object.keys(self.DICTIONARY);
    for (const key of keys) {
        const len = key.length;
        if (!cachedKeysByLength[len]) cachedKeysByLength[len] = [];
        cachedKeysByLength[len].push(key);
    }
    return cachedKeysByLength;
}

self.onmessage = function(e) {
    const { input, requestId } = e.data;
    
    if (input === null) {
        if (self.DICTIONARY) {
            getKeysByLength();
            self.postMessage({ type: 'ready' });
        } else {
            self.postMessage({ type: 'error', message: 'Dictionary data missing.' });
        }
        return;
    }

    const results = findSubAnagrams(input);
    self.postMessage({ type: 'results', results, requestId });
};

function findSubAnagrams(input) {
    const cleanInput = input.replace(/\./g, '');
    const inputFreq = getFrequencyMap(cleanInput);
    const wildcardCount = (input.match(/\./g) || []).length;
    
    const found = [];
    const keysByLength = getKeysByLength();
    
    for (let len = 2; len <= input.length; len++) {
        const keys = keysByLength[len];
        if (!keys) continue;
        
        for (const key of keys) {
            const wildcardIndices = getWildcardIndices(key, inputFreq, wildcardCount);
            if (wildcardIndices !== null) {
                self.DICTIONARY[key].forEach(word => {
                    // Map wildcard indices from alphagram to the actual word
                    const wordWildcardIndices = mapIndicesToWord(word, wildcardIndices);
                    found.push({ word, wildcards: wordWildcardIndices });
                });
            }
        }
    }

    const grouped = {};
    found.forEach(item => {
        const len = item.word.length;
        if (!grouped[len]) grouped[len] = [];
        grouped[len].push(item);
    });

    return grouped;
}

function getFrequencyMap(str) {
    const map = {};
    for (const char of str) {
        map[char] = (map[char] || 0) + 1;
    }
    return map;
}

/**
 * Returns an array of indices in the alphagram 'key' that must be wildcards.
 * Returns null if the key cannot be formed.
 */
function getWildcardIndices(key, inputFreq, wildcardCount) {
    const wildcardIndices = [];
    const currentFreq = { ...inputFreq };
    
    for (let i = 0; i < key.length; i++) {
        const char = key[i];
        if (currentFreq[char] > 0) {
            currentFreq[char]--;
        } else {
            wildcardIndices.push(i);
        }
    }
    
    if (wildcardIndices.length <= wildcardCount) {
        return wildcardIndices;
    }
    return null;
}

/**
 * Maps wildcard indices from a sorted alphagram back to the original word.
 */
function mapIndicesToWord(word, alphagramWildcardIndices) {
    if (alphagramWildcardIndices.length === 0) return [];
    
    const wordChars = word.split('');
    const alphagram = word.split('').sort();
    const wildChars = alphagramWildcardIndices.map(i => alphagram[i]);
    
    const resultIndices = [];
    const usedIndices = new Set();
    
    // For each character that needs to be a wildcard, find its first unused occurrence in the word
    wildChars.forEach(char => {
        for (let i = 0; i < wordChars.length; i++) {
            if (wordChars[i] === char && !usedIndices.has(i)) {
                resultIndices.push(i);
                usedIndices.add(i);
                break;
            }
        }
    });
    
    return resultIndices;
}

function isSubset(key, inputFreq, wildcardCount) {
    let neededWildcards = 0;
    let i = 0;
    while (i < key.length) {
        const char = key[i];
        let countInKey = 0;
        while (i < key.length && key[i] === char) {
            countInKey++;
            i++;
        }
        const countInInput = inputFreq[char] || 0;
        if (countInKey > countInInput) {
            neededWildcards += (countInKey - countInInput);
        }
        if (neededWildcards > wildcardCount) return false;
    }
    return true;
}
