const lettersInput = document.getElementById('letters');
const clearBtn = document.getElementById('clear-btn');
const statusDiv = document.getElementById('status');
const resultsContainer = document.getElementById('results-container');
const resultCount = document.getElementById('result-count');
const resultsList = document.getElementById('results-list');

// Wait for dictionary to load
window.addEventListener('load', () => {
    if (window.DICTIONARY) {
        statusDiv.textContent = 'Dictionary ready.';
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 1000);
    } else {
        statusDiv.textContent = 'Error loading dictionary.';
        statusDiv.style.color = 'var(--danger)';
    }
});

lettersInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
    lettersInput.value = val; // Force clean input
    
    if (val.length >= 2) {
        solve(val);
    } else {
        hideResults();
    }
});

clearBtn.addEventListener('click', () => {
    lettersInput.value = '';
    hideResults();
    lettersInput.focus();
});

function hideResults() {
    resultsContainer.classList.add('hidden');
    resultsList.innerHTML = '';
}

function solve(input) {
    if (!window.DICTIONARY) return;

    const results = findSubAnagrams(input);
    displayResults(results);
}

/**
 * Optimized sub-anagram finder.
 * Finds all words that can be made from a subset of the input letters.
 */
function findSubAnagrams(input) {
    const sortedInput = input.split('').sort().join('');
    const found = new Set();
    
    // 1. Direct Anagram Check
    if (window.DICTIONARY[sortedInput]) {
        window.DICTIONARY[sortedInput].forEach(w => found.add(w));
    }

    // 2. Sub-anagrams (Power set of letters)
    // For Scrabble, we want all possible words.
    // However, generating a full power set of a 15-letter input is 2^15.
    // Better approach: Iterate over keys if input is small, or use a Frequency Map check.
    
    const inputFreq = getFrequencyMap(input);
    const keys = Object.keys(window.DICTIONARY);
    
    for (const key of keys) {
        if (key.length > input.length) continue;
        
        if (isSubset(key, inputFreq)) {
            window.DICTIONARY[key].forEach(w => found.add(w));
        }
    }

    // Group by length
    const grouped = {};
    found.forEach(word => {
        const len = word.length;
        if (!grouped[len]) grouped[len] = [];
        grouped[len].push(word);
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

function isSubset(key, inputFreq) {
    const keyFreq = getFrequencyMap(key);
    for (const char in keyFreq) {
        if (!inputFreq[char] || keyFreq[char] > inputFreq[char]) {
            return false;
        }
    }
    return true;
}

function displayResults(groupedResults) {
    resultsList.innerHTML = '';
    const lengths = Object.keys(groupedResults).sort((a, b) => b - a);
    
    let total = 0;

    if (lengths.length === 0) {
        resultCount.textContent = 'No words found';
        resultsContainer.classList.remove('hidden');
        return;
    }

    lengths.forEach(len => {
        const words = groupedResults[len].sort();
        total += words.length;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'word-group';
        
        groupDiv.innerHTML = `
            <div class="group-title">${len} Letters <span>${words.length}</span></div>
            <div class="word-grid">
                ${words.map(w => `<div class="word-chip">${w}</div>`).join('')}
            </div>
        `;
        
        resultsList.appendChild(groupDiv);
    });

    resultCount.textContent = `${total} word${total === 1 ? '' : 's'} found`;
    resultsContainer.classList.remove('hidden');
}
