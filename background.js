// Handle keyboard shortcut command to copy clean link(s)
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy_clean_link') {
        try {
            await handleCopyRequest();
        } catch (error) {
            console.error('Command execution failed:', error);
        }
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
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab) {
            console.error('No active tab found');
            return;
        }

    const { cleanUrlEnabled, applyScope } = await chrome.storage.sync.get(['cleanUrlEnabled', 'applyScope']);
    const shouldClean = cleanUrlEnabled !== false; // default true
    const scope = applyScope || 'thisTab';

            const tabsToProcess = await collectTabsByScope(scope, activeTab);
        if (!tabsToProcess || tabsToProcess.length === 0) {
            console.error('No tabs to process');
            return;
        }

    const urls = tabsToProcess.map((t) => {
        const url = t.url || '';
        return shouldClean ? cleanUrl(url) : url;
    }).filter((u) => !!u);

            const textBlob = urls.join('\n');
        if (textBlob.length > 0) {
            const copyResult = await copyToClipboard(textBlob);
            if (copyResult && copyResult.error) {
                throw new Error(copyResult.error);
            }
        }
    } catch (error) {
        console.error('Error in handleCopyRequest:', error);
        throw error;
    }
}

async function collectTabsByScope(scope, activeTab) {
    switch (scope) {
        case 'thisTab': {
            return [activeTab];
        }
        case 'thisGroup': {
            // Check if tab is in a group
            if (activeTab.groupId && activeTab.groupId !== chrome.tabs.TAB_ID_NONE) {
                try {
                    const tabs = await chrome.tabs.query({ groupId: activeTab.groupId });
                    return tabs || [];
                } catch (error) {
                    // Fallback to active tab if group query fails
                    return [activeTab];
                }
            } else {
                // Tab is not in a group, return just this tab
                return [activeTab];
            }
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
            // Check if the tab URL is restricted (can't be scripted)
            if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
                // For restricted pages, try to use clipboard API directly
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(text);
                        return;
                    }
                } catch (clipboardError) {
                    console.log('Clipboard API not available on restricted page');
                }
                
                // If clipboard API fails, show user-friendly error
                console.log('Cannot copy from restricted page. Please try on a regular webpage.');
                return { error: 'Cannot copy from this page. Please try on a regular webpage.' };
            }
            
            // For regular pages, use script injection
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (textToCopy) => {
                    try {
                        const textArea = document.createElement('textarea');
                        textArea.value = textToCopy;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        textArea.style.opacity = '0';
                        textArea.style.pointerEvents = 'none';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        const successful = document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        if (successful) {
                            console.log('execCommand copy successful');
                        } else {
                            console.error('execCommand copy failed');
                        }
                    } catch (error) {
                        console.error('Error in content script copy:', error);
                    }
                },
                args: [text]
            });
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
    }
}
