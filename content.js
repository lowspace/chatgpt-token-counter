// Global storage object
const messageIdToTextMap = {};
let tokenUsage = 0; // Initialize token usage

// Function to load the tokenizer based on the model slug stored in Chrome's local storage
async function loadTokenizer() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['currentModel'], function(result) {
            const modelSlug = result.currentModel || 'gpt4o';  // Default to 'gpt4' if not set
            console.log("currentModel:", modelSlug);
            let tokenizerModule;

            // Select the tokenizer module based on the model slug
            if (modelSlug === 'gpt4o') {
                tokenizerModule = window.tokenizerGPT4O;  // Assuming these are already loaded via Webpack
            } else {
                tokenizerModule = window.tokenizerGPT4;  // Assuming these are already loaded via Webpack
            }

            // Ensure the tokenizer module and the fromPreTrained method are available
            if (tokenizerModule && tokenizerModule.fromPreTrained) {
                try {
                    const tokenizer = tokenizerModule.fromPreTrained();
                    resolve(tokenizer);
                } catch (error) {
                    reject(error);  // Handle errors in tokenizer initialization
                }
            } else {
                reject(new Error("Tokenizer module not found or 'fromPreTrained' method is unavailable."));
            }
        });
    });
}

// Function to update token usage
function updateTokenUsage(additionalTokens) {
    tokenUsage += additionalTokens;
    console.log("Token usage updated to:", tokenUsage);
    chrome.storage.local.set({ tokenUsage: tokenUsage });
}

// Function to process each message text
async function processText(messageId, innerText) {
    // Load and initialize tokenizer
    const tokenizer = await loadTokenizer();
    const tokens = tokenizer.encode(innerText);
    const tokensCnt = tokens.length;

    // Update the total token usage
    updateTokenUsage(tokensCnt);

    chrome.storage.local.get(messageId, function(result) {
        if(result[messageId] && result[messageId][currentModelSlug]) {
            console.log(`Data for ${messageId} using model already exists.`);
        } else {
            let data = result[messageId] || {};
            data[currentModelSlug] = tokensCnt;
            chrome.storage.local.set({ [messageId]: data });
            console.log(`Token count for "${innerText}" is ${tokensCnt}. Data saved.`);
        }
    });
}

// Function to extract and update messages
function extractAndUpdateMessages() {
    const elementsWithMessageId = document.querySelectorAll('[data-message-id]');
    elementsWithMessageId.forEach(element => {
        const messageId = element.getAttribute('data-message-id');
        const innerText = element.querySelector('div') ? element.querySelector('div').innerText : "No inner <div> found";
        
        // Process new messages
        if (!messageIdToTextMap[messageId]) {
            messageIdToTextMap[messageId] = innerText;
            processText(messageId, innerText);
        }
    });
}

// Function to extract conversation ID from URL
function extractConversationId() {
    const fullUrl = window.location.href;
    const urlParts = fullUrl.split('/');
    return urlParts[urlParts.length - 1] === '' ? urlParts[urlParts.length - 2] : urlParts[urlParts.length - 1];
}

let currentConversationId = ""; // Initialize currentConversationId

// Function to check URL and update if needed
function checkAndUpdateConversationId() {
    const newConversationId = extractConversationId();
    if (newConversationId !== currentConversationId) {
        currentConversationId = newConversationId;
        tokenUsage = 0; // Reset token usage
        chrome.storage.local.set({ tokenUsage: tokenUsage });
        extractAndUpdateMessages();  // Re-start message extraction and update process
        console.log("Conversation ID changed. Token usage reset and messages re-extracted.");
    } else {
        extractAndUpdateMessages();
    }
}

// Set up MutationObserver to listen for DOM changes and extract new messages
const observer = new MutationObserver((mutationsList, observer) => {
    extractAndUpdateMessages();
});

observer.observe(document.body, { childList: true, subtree: true });

// Run checkAndUpdateConversationId every 0.5 seconds
setInterval(checkAndUpdateConversationId, 10);
