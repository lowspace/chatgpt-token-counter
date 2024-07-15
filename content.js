// Global object to store used message IDs
let usedMessageIds = {};
let tokenUsage = 0; // Initialize token usage counter

// Function to load the tokenizer based on the model slug stored in Chrome's local storage
async function loadTokenizer() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['currentModel'], function(result) {
            const modelSlug = result.currentModel || 'gpt4o';  // Use 'gpt4o' as default if none is set
            console.debug("currentModel:", modelSlug);
            let tokenizerModule;

            // Determine the correct tokenizer module based on the model slug
            if (modelSlug === 'gpt4o') {
                tokenizerModule = window.tokenizerGPT4O;  // Presume these modules are preloaded via Webpack
            } else {
                tokenizerModule = window.tokenizerGPT4;  // Presume these modules are preloaded via Webpack
            }

            // Check for the existence of tokenizer module and the method fromPreTrained
            if (tokenizerModule && tokenizerModule.fromPreTrained) {
                try {
                    const tokenizer = tokenizerModule.fromPreTrained();
                    resolve(tokenizer);
                } catch (error) {
                    reject(error);  // Handle errors during tokenizer initialization
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
    console.debug("Token usage updated to:", tokenUsage);
    chrome.storage.local.set({ tokenUsage: tokenUsage });
}

// Function to count tokens
async function tokenCounter(innerText) {
    const tokenizer = await loadTokenizer(); // Assume loadTokenizer is asynchronous
    const tokens = tokenizer.encode(innerText);
    return tokens.length;
}

// Function to check if messageId already exists
function checkMessageId(messageId, modelSlug) {
    return new Promise(resolve => {
        chrome.storage.local.get(messageId, function(result) {
            if (result[messageId] && result[messageId][modelSlug]) {
                resolve(result[messageId][modelSlug]); // Return existing token count
            } else {
                resolve(null); // If not found, handle text processing
            }
        });
    });
}

// Function to write messageId data
function writeMessageId(messageId, modelSlug, tokenCount) {
    let data = { [modelSlug]: tokenCount };
    chrome.storage.local.set({ [messageId]: data }, function() {
        console.debug(`Data for ${messageId} and model ${modelSlug} saved with token count: ${tokenCount}`);
    });
}

// Initialize and import Turndown Service
const turndownService = new TurndownService();

// Function to dynamically monitor text changes, debounce them, and return converted Markdown text
function getInnerText(element, delay = 1000) {
    let lastHtmlContent = element.innerHTML; // Record the initial HTML content of the element
    let debounceTimer;

    return new Promise(resolve => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        if (element.innerHTML !== lastHtmlContent) {
                            lastHtmlContent = element.innerHTML; // Update the last known HTML content
                            let markdownText = turndownService.turndown(lastHtmlContent); // Convert HTML to Markdown
                            resolve(markdownText); // Return the converted Markdown text
                        }
                    }, delay);
                }
            });
        });

        observer.observe(element, {
            characterData: true,
            childList: true,
            subtree: true
        });
    });
}

// Function to extract and update messages
function extractAndUpdateMessages() {
    chrome.storage.local.get('currentModel', async function(data) {
        const currentModelSlug = data.currentModel || 'gpt4o';
        if (!currentModelSlug) {
            console.error('No currentModelSlug found in storage.');
            return; // Stop execution if no currentModelSlug found
        }

        const elementsWithMessageId = document.querySelectorAll('[data-message-id]');
        elementsWithMessageId.forEach(async element => {
            const messageId = element.getAttribute('data-message-id');

            // Check if messageId has already been processed
            if (!usedMessageIds[messageId]) {
                usedMessageIds[messageId] = true; // Mark as processed

                // Check message ID
                const existingData = await checkMessageId(messageId, currentModelSlug);
                let tokensCnt; // Define a variable to store token count
                if (existingData) {
                    console.debug(`Data already exists for message ID: ${messageId} and model: ${currentModelSlug}`);
                    tokensCnt = existingData; // Use existing token count if data already exists
                } else {
                    const divElement = element.querySelector('div');
                    // Process innerText ...
                    const innerText = await getInnerText(divElement);
                    tokensCnt = await tokenCounter(innerText); // Calculate new token count
                    console.debug(`message ID: ${messageId}, innerText: ${innerText}`)
                    writeMessageId(messageId, currentModelSlug, tokensCnt); // Store new token count
                }
                updateTokenUsage(tokensCnt); // Update token usage, now outside the if and else block
            }
        });
    });
}

// Function to extract conversation ID from URL
function extractConversationId() {
    const fullUrl = window.location.href;
    const urlParts = fullUrl.split('/');
    return urlParts[urlParts.length - 1] === '' ? urlParts[urlParts.length - 2] : urlParts[urlParts.length - 1];
}

let currentConversationId = ""; // Initialize currentConversationId

// Function to check URL and update if necessary
function checkAndUpdateConversationId() {
    const newConversationId = extractConversationId();
    if (newConversationId !== currentConversationId) {
        currentConversationId = newConversationId;
        tokenUsage = 0; // Reset token usage
        usedMessageIds = {}; // Reset message id list
        chrome.storage.local.set({ tokenUsage: tokenUsage });
        extractAndUpdateMessages();  // Re-start message extraction and updating process
        console.debug("Conversation ID changed. Token usage reset and messages re-extracted.");
    } else {
        extractAndUpdateMessages();
    }
}

// Set up MutationObserver to listen for DOM changes and extract new messages
const observer = new MutationObserver((mutationsList, observer) => {
    extractAndUpdateMessages();
});

observer.observe(document.body, { childList: true, subtree: true });

// Regularly check and update conversation ID every 0.5 seconds
setInterval(checkAndUpdateConversationId, 10);
