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
    const val = e.target.value.toLowerCase().replace(/[^a-z.]/g, '');
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
 * Finds all words that can be made from a subset of the input letters,
 * treating '.' as a wildcard (blank tile).
 */
function findSubAnagrams(input) {
    const wildcards = (input.match(/\./g) || []).length;
    const cleanInput = input.replace(/\./g, '');
    const inputFreq = getFrequencyMap(cleanInput);
    
    const found = new Set();
    const keys = Object.keys(window.DICTIONARY);
    
    for (const key of keys) {
        if (key.length > input.length) continue;
        
        if (isSubset(key, inputFreq, wildcards)) {
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

/**
 * Checks if a dictionary key (alphagram) can be formed by the input letters
 * plus a limited number of wildcards.
 */
function isSubset(key, inputFreq, wildcardCount) {
    let neededWildcards = 0;
    let i = 0;
    
    // Since 'key' is an alphagram (sorted), we can count consecutive chars efficiently
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
