// Global storage object
let usedMessageIds = {};
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

// 计数tokens
async function tokenCounter(innerText) {
    const tokenizer = await loadTokenizer(); // 假设loadTokenizer是异步的
    const tokens = tokenizer.encode(innerText);
    return tokens.length;
}

// 检查messageId是否已存在
function checkMessageId(messageId, modelSlug) {
    return new Promise(resolve => {
        chrome.storage.local.get(messageId, function(result) {
            if (result[messageId] && result[messageId][modelSlug]) {
                resolve(result[messageId][modelSlug]); // 返回已存在的token数量
            } else {
                resolve(null); // 不存在，需要处理文本
            }
        });
    });
}

// 写入messageId数据
function writeMessageId(messageId, modelSlug, tokenCount) {
    let data = { [modelSlug]: tokenCount };
    chrome.storage.local.set({ [messageId]: data }, function() {
        console.log(`Data for ${messageId} and model ${modelSlug} saved with token count: ${tokenCount}`);
    });
}

// 引入并初始化 Turndown 服务
const turndownService = new TurndownService();

// 动态监测文本变化并防抖处理，并返回转换为 Markdown 的文本
function getInnerText(element, delay = 1000) {
    let lastHtmlContent = element.innerHTML; // 初始时记录元素的 HTML 内容
    let debounceTimer;

    return new Promise(resolve => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        if (element.innerHTML !== lastHtmlContent) {
                            lastHtmlContent = element.innerHTML; // 更新最后的 HTML 内容
                            let markdownText = turndownService.turndown(lastHtmlContent); // 将 HTML 转换为 Markdown
                            resolve(markdownText); // 返回转换后的 Markdown 文本
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
        const currentModelSlug = data.currentModel;
        if (!currentModelSlug) {
            console.error('No currentModelSlug found in storage.');
            return; // 如果没有找到currentModelSlug，停止执行
        }

        const elementsWithMessageId = document.querySelectorAll('[data-message-id]');
        elementsWithMessageId.forEach(async element => {
            const messageId = element.getAttribute('data-message-id');

            // 检查是否已处理该messageId
            if (!usedMessageIds[messageId]) {
                usedMessageIds[messageId] = true; // 标记为已处理

                // 检查消息ID
                const existingData = await checkMessageId(messageId, currentModelSlug);
                let tokensCnt; // 定义一个变量来存储令牌数
                if (existingData) {
                    console.log(`Data already exists for message ID: ${messageId} and model: ${currentModelSlug}`);
                    tokensCnt = existingData; // 如果数据已存在，使用现有的令牌数
                } else {
                    const innerText = await getInnerText(element.querySelector('div') ? element.querySelector('div') : "No inner <div> found");
                    tokensCnt = await tokenCounter(innerText); // 计算新的令牌数
                    console.log(`TEST, current write text is: ${innerText}`)
                    writeMessageId(messageId, currentModelSlug, tokensCnt); // 写入新计算的令牌数
                }
                updateTokenUsage(tokensCnt); // 更新令牌使用量，现在在if和else块之外
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

// Function to check URL and update if needed
function checkAndUpdateConversationId() {
    const newConversationId = extractConversationId();
    if (newConversationId !== currentConversationId) {
        currentConversationId = newConversationId;
        tokenUsage = 0; // Reset token usage
        usedMessageIds = {}; // Reset message id list
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
