const lettersInput = document.getElementById('letters');
const clearBtn = document.getElementById('clear-btn');
const statusDiv = document.getElementById('status');
const resultsContainer = document.getElementById('results-container');
const resultCount = document.getElementById('result-count');
const resultsList = document.getElementById('results-list');

let worker = null;
let currentRequestId = 0;
let debounceTimer = null;
let useMainThread = false;
let cachedKeysByLength = null;

// Initialize worker or fallback
function init() {
    console.log('Initializing application...');
    const isLocalFile = window.location.protocol === 'file:';
    
    if (isLocalFile || !window.Worker) {
        console.warn('Running locally or Worker not supported. Fallback to main thread.');
        loadDictionaryInMainThread();
    } else {
        try {
            initWorker();
        } catch (e) {
            console.error('Worker failed:', e);
            loadDictionaryInMainThread();
        }
    }
}

function initWorker() {
    console.log('Spawning worker...');
    statusDiv.textContent = 'Loading dictionary...';
    worker = new Worker('worker.js');
    
    worker.onmessage = (e) => {
        const { type, results, requestId, message } = e.data;
        if (type === 'ready') {
            statusDiv.textContent = 'Dictionary ready.';
            setTimeout(() => statusDiv.classList.add('hidden'), 1000);
        } else if (type === 'error') {
            loadDictionaryInMainThread();
        } else if (type === 'results') {
            if (requestId === currentRequestId) displayResults(results);
        }
    };

    worker.onerror = (err) => {
        if (!useMainThread) loadDictionaryInMainThread();
    };
    worker.postMessage({ input: null });
}

function loadDictionaryInMainThread() {
    if (useMainThread) return;
    useMainThread = true;
    statusDiv.textContent = 'Loading dictionary (fallback)...';

    const script = document.createElement('script');
    script.src = 'dictionary.js';
    script.onload = () => {
        if (window.DICTIONARY) {
            statusDiv.textContent = 'Dictionary ready.';
            setTimeout(() => statusDiv.classList.add('hidden'), 1000);
        }
    };
    document.head.appendChild(script);
}

window.addEventListener('load', init);

lettersInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z.]/g, '');
    lettersInput.value = val;
    clearTimeout(debounceTimer);
    if (val.length >= 2) {
        debounceTimer = setTimeout(() => solve(val), 150);
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
    currentRequestId++;
    if (!useMainThread && worker) {
        worker.postMessage({ input, requestId: currentRequestId });
    } else if (window.DICTIONARY) {
        displayResults(findSubAnagramsMain(input));
    }
}

function findSubAnagramsMain(input) {
    const cleanInput = input.replace(/\./g, '');
    const inputFreq = getFrequencyMap(cleanInput);
    const wildcardCount = (input.match(/\./g) || []).length;
    
    const found = [];
    const keysByLength = getKeysByLengthMain();
    
    for (let len = 2; len <= input.length; len++) {
        const keys = keysByLength[len];
        if (!keys) continue;
        for (const key of keys) {
            const wildcardIndices = getWildcardIndices(key, inputFreq, wildcardCount);
            if (wildcardIndices !== null) {
                window.DICTIONARY[key].forEach(word => {
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

function getWildcardIndices(key, inputFreq, wildcardCount) {
    const wildcardIndices = [];
    const currentFreq = { ...inputFreq };
    for (let i = 0; i < key.length; i++) {
        const char = key[i];
        if (currentFreq[char] > 0) currentFreq[char]--;
        else wildcardIndices.push(i);
    }
    return wildcardIndices.length <= wildcardCount ? wildcardIndices : null;
}

function mapIndicesToWord(word, alphagramWildcardIndices) {
    if (alphagramWildcardIndices.length === 0) return [];
    const wordChars = word.split('');
    const alphagram = word.split('').sort();
    const wildChars = alphagramWildcardIndices.map(i => alphagram[i]);
    const resultIndices = [];
    const usedIndices = new Set();
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

function getKeysByLengthMain() {
    if (cachedKeysByLength) return cachedKeysByLength;
    cachedKeysByLength = {};
    const keys = Object.keys(window.DICTIONARY);
    for (const key of keys) {
        const len = key.length;
        if (!cachedKeysByLength[len]) cachedKeysByLength[len] = [];
        cachedKeysByLength[len].push(key);
    }
    return cachedKeysByLength;
}

function getFrequencyMap(str) {
    const map = {};
    for (const char of str) map[char] = (map[char] || 0) + 1;
    return map;
}

function displayResults(groupedResults) {
    const fragment = document.createDocumentFragment();
    const lengths = Object.keys(groupedResults).sort((a, b) => b - a);
    let total = 0;

    if (lengths.length === 0) {
        resultCount.textContent = 'No words found';
        resultsContainer.classList.remove('hidden');
        resultsList.innerHTML = '';
        return;
    }

    lengths.forEach(len => {
        const items = groupedResults[len].sort((a, b) => a.word.localeCompare(b.word));
        total += items.length;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'word-group';
        const grid = document.createElement('div');
        grid.className = 'word-grid';

        items.forEach(item => {
            const chip = document.createElement('div');
            chip.className = 'word-chip';
            chip.dataset.word = item.word;
            
            if (item.wildcards.length > 0) {
                const wordArr = item.word.split('');
                item.wildcards.forEach(idx => {
                    wordArr[idx] = `<span class="wildcard">${wordArr[idx]}</span>`;
                });
                chip.innerHTML = wordArr.join('');
            } else {
                chip.textContent = item.word;
            }
            grid.appendChild(chip);
        });
        
        groupDiv.innerHTML = `<div class="group-title">${len} Letters <span>${items.length}</span></div>`;
        groupDiv.appendChild(grid);
        fragment.appendChild(groupDiv);
    });

    resultsList.innerHTML = '';
    resultsList.appendChild(fragment);
    resultCount.textContent = `${total} word${total === 1 ? '' : 's'} found`;
    resultsContainer.classList.remove('hidden');
}

resultsList.addEventListener('click', (e) => {
    const chip = e.target.closest('.word-chip');
    if (chip) window.open(`https://www.google.com/search?q=define+${chip.dataset.word}`, '_blank');
});

resultsList.addEventListener('contextmenu', (e) => {
    const chip = e.target.closest('.word-chip');
    if (chip) {
        e.preventDefault();
        const word = chip.dataset.word;
        navigator.clipboard.writeText(word);
        const originalContent = chip.innerHTML;
        chip.textContent = 'COPIED!';
        chip.style.color = '#10b981';
        setTimeout(() => { chip.innerHTML = originalContent; chip.style.color = ''; }, 1000);
    }
});
