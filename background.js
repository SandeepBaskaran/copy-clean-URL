// Handle keyboard shortcut command to copy clean link(s)
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy_clean_link') {
        await handleCopyRequest();
    }
});

// Also handle requests coming from popup button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'copy_clean_link') {
        handleCopyRequest().then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: String(err) }));
        return true; // keep the channel open for async response
    }
});

async function handleCopyRequest() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
        return;
    }

    const { cleanUrlEnabled, applyScope } = await chrome.storage.sync.get(['cleanUrlEnabled', 'applyScope']);
    const shouldClean = cleanUrlEnabled !== false; // default true
    const scope = applyScope || 'thisTab';

    const tabsToProcess = await collectTabsByScope(scope, activeTab);
    if (!tabsToProcess || tabsToProcess.length === 0) {
        return;
    }

    const urls = tabsToProcess.map((t) => {
        const url = t.url || '';
        return shouldClean ? cleanUrl(url) : url;
    }).filter((u) => !!u);

    const textBlob = urls.join('\n');
    if (textBlob.length > 0) {
        await copyToClipboard(textBlob);
    }
}

async function collectTabsByScope(scope, activeTab) {
    switch (scope) {
        case 'thisTab': {
            return [activeTab];
        }
        case 'thisGroup': {
            const groupId = typeof activeTab.groupId === 'number' ? activeTab.groupId : chrome.tabGroups ? activeTab.groupId : -1;
            if (groupId === -1) return [activeTab];
            const tabs = await chrome.tabs.query({ groupId });
            return tabs || [];
        }
        case 'thisWindow': {
            const tabs = await chrome.tabs.query({ windowId: activeTab.windowId });
            return tabs || [];
        }
        case 'allWindows': {
            const tabs = await chrome.tabs.query({});
            return tabs || [];
        }
        default:
            return [activeTab];
    }
}

// Clean URL function - strips everything from '?' onwards
function cleanUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.origin + urlObj.pathname;
    } catch (error) {
        // Fallback for invalid URLs
        const questionMarkIndex = url.indexOf('?');
        return questionMarkIndex !== -1 ? url.substring(0, questionMarkIndex) : url;
    }
}

// Copy to clipboard function (background script version)
async function copyToClipboard(text) {
    try {
        // In MV3 service workers, use injection approach
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (textToCopy) => {
                    const textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                },
                args: [text]
            });
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
    }
}
