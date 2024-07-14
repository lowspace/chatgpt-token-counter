const tokenLimits = {
    'gpt3.5': 8192,
    'gpt4': 32768,
    'gpt4o': 32768
};

let currentModelSlug;
let defaultModelSlug;
let tokenUsage = 0;

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateDisplay() {
    const tokenLimit = tokenLimits[currentModelSlug];
    
    document.getElementById('token_limit').textContent = formatNumber(tokenLimit);
    document.getElementById('token_usage').textContent = formatNumber(tokenUsage);
    console.log("popup.js, token usage: ", tokenUsage)
    
    const percentage = (tokenUsage / tokenLimit) * 100;
    const bar = document.getElementById('token-usage-bar');
    bar.style.width = `${percentage}%`;
    bar.textContent = `${percentage.toFixed(2)}%`;

    bar.style.backgroundColor = percentage < 50 ? '#4CAF50' : percentage < 80 ? '#FFA500' : '#FF0000';
}

function updateModel(modelSlug) {
    currentModelSlug = modelSlug;
    chrome.storage.local.set({ currentModel: modelSlug }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving current model:', chrome.runtime.lastError);
        }
    });
    updateDisplay();
}

function togglePin() {
    const isPinned = document.getElementById('pin-switch').checked;
    chrome.storage.local.set({ isPinned: isPinned }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error saving pin state:', chrome.runtime.lastError);
            return;
        }
        if (isPinned) {
            chrome.windows.create({
                url: 'popup.html?pinned=true',
                type: 'popup',
                width: 320,
                height: 400
            }, (window) => {
                chrome.storage.local.set({ pinWindowId: window.id });
                chrome.tabs.getCurrent(tab => tab && chrome.tabs.remove(tab.id));
            });
        } else {
            chrome.storage.local.get('pinWindowId', (data) => {
                if (data.pinWindowId) {
                    chrome.windows.remove(data.pinWindowId);
                }
            });
        }
    });
}

function loadStorageData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['defaultModel', 'currentModel', 'tokenUsage', 'isPinned'], (data) => {
            console.log("Storage Data:", data);
            defaultModelSlug = data.defaultModel || 'gpt3.5';
            currentModelSlug = data.currentModel || defaultModelSlug;
            tokenUsage = data.tokenUsage || 0;
            resolve(data);
        });
    });
}

function updateUI(data) {
    document.getElementById('default-model').value = defaultModelSlug;
    document.getElementById('current-model').value = currentModelSlug;
    document.getElementById('pin-switch').checked = data.isPinned || false;
    updateDisplay();
}

async function initialize() {
    const data = await loadStorageData();
    updateUI(data);

    document.getElementById('default-model').addEventListener('change', (e) => {
        defaultModelSlug = e.target.value;
        chrome.storage.local.set({ defaultModel: defaultModelSlug });
    });

    document.getElementById('current-model').addEventListener('change', (e) => {
        updateModel(e.target.value);
    });

    document.getElementById('pin-switch').addEventListener('change', togglePin);

    setInterval(async () => {
        const { tokenUsage: newTokenUsage } = await loadStorageData();
        if (newTokenUsage !== tokenUsage) {
            tokenUsage = newTokenUsage;
            updateDisplay();
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', initialize);

if (window.location.search.includes('pinned=true')) {
    chrome.windows.getCurrent((window) => {
        chrome.storage.local.set({ pinWindowId: window.id });
    });
}