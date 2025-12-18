// =================================================================
// Core Logic: Cleaning, Scraping, and URL Collection
// =================================================================

// Function to clean a URL by stripping query parameters and hash
function cleanUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.origin + urlObj.pathname;
    } catch (error) {
        const questionMarkIndex = url.indexOf('?');
        if (questionMarkIndex !== -1) {
            return url.substring(0, questionMarkIndex);
        }
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
            return url.substring(0, hashIndex);
        }
        return url;
    }
}

// Function to get URLs based on the selected scope from the popup
async function getUrlsForScope(scope, shouldClean) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
        return { urls: [], error: 'No active tab found.' };
    }

    let itemsToProcess = [];
    if (scope === 'allLinksInPage') {
        // Special case: Scrape links from the page
        if (activeTab && activeTab.id) {
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    function: () => Array.from(document.querySelectorAll('a')).map(a => a.href),
                });
                if (results && results[0] && results[0].result) {
                    itemsToProcess = results[0].result.map(url => ({ url }));
                }
            } catch (e) {
                console.error("Failed to scrape links:", e);
                return { urls: [], error: 'Cannot scrape links from this page.' };
            }
        }
    } else {
        // Standard cases: Query tabs based on scope
        let queryOptions = {};
        switch (scope) {
            case 'thisTab':
                itemsToProcess = [activeTab];
                break;
            case 'selectedTabs':
                queryOptions = { highlighted: true, currentWindow: true };
                break;
            case 'thisGroup':
                if (activeTab.groupId && activeTab.groupId !== chrome.tabs.TAB_ID_NONE) {
                    queryOptions = { groupId: activeTab.groupId };
                } else {
                    return { urls: shouldClean ? [cleanUrl(activeTab.url)] : [activeTab.url], error: null };
                }
                break;
            case 'thisWindow':
                queryOptions = { windowId: activeTab.windowId };
                break;
            case 'allWindows':
                queryOptions = {};
                break;
            default:
                itemsToProcess = [activeTab];
                break;
        }
        if (Object.keys(queryOptions).length > 0) {
            itemsToProcess = await chrome.tabs.query(queryOptions);
        }
    }

    let processedUrls = itemsToProcess.map(item => (item.url ? (shouldClean ? cleanUrl(item.url) : item.url) : ''));
    
    // Remove duplicates and filter out empty/invalid entries
    const uniqueUrls = [...new Set(processedUrls)].filter(url => url && url.startsWith('http'));
    
    return { urls: uniqueUrls, error: null };
}

// =================================================================
// Clipboard and Tab Management
// =================================================================

// Function to copy text to clipboard using content script injection
async function copyToClipboard(text, tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: async (textToCopy) => {
                // Ensure text has proper line breaks preserved
                // Try modern Clipboard API with explicit MIME type first
                try {
                    // Use ClipboardItem with explicit text/plain MIME type to preserve formatting
                    const type = 'text/plain';
                    const blob = new Blob([textToCopy], { type });
                    const data = [new ClipboardItem({ [type]: blob })];
                    await navigator.clipboard.write(data);
                    return { success: true };
                } catch (err) {
                    // Fallback to simpler writeText
                    try {
                        await navigator.clipboard.writeText(textToCopy);
                        return { success: true };
                    } catch (err2) {
                        console.warn('Clipboard API failed, falling back to execCommand:', err2);
                        // Fallback to deprecated document.execCommand('copy')
                        const textArea = document.createElement('textarea');
                        textArea.value = textToCopy;
                        // Ensure textarea preserves whitespace and line breaks
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.whiteSpace = 'pre'; // Preserve line breaks
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                            const success = document.execCommand('copy');
                            document.body.removeChild(textArea);
                            return { success: success };
                        } catch (execErr) {
                            console.error('execCommand copy failed:', execErr);
                            document.body.removeChild(textArea);
                            return { success: false, error: execErr.message };
                        }
                    }
                }
            },
            args: [text]
        });
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        throw new Error('Could not copy to clipboard. The page might be restricted or another error occurred.');
    }
}

// =================================================================
// Event Listeners: Commands, Messages, Context Menus
// =================================================================

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'copy_clean_link') {
        const { cleanUrlEnabled, applyScope } = await chrome.storage.sync.get(['cleanUrlEnabled', 'applyScope']);
        const { urls, error } = await getUrlsForScope(applyScope || 'thisTab', cleanUrlEnabled !== false);
        
        if (error) {
            console.error(error);
            return;
        }

        if (urls.length > 0) {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab) {
                await copyToClipboard(urls.join('\n'), activeTab.id);
            }
        }
    }
});

// Handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        if (message.type === 'get_urls_for_preview' || message.type === 'copy_clean_link') {
            const { cleanUrlEnabled, applyScope } = await chrome.storage.sync.get(['cleanUrlEnabled', 'applyScope']);
            const result = await getUrlsForScope(applyScope || 'thisTab', cleanUrlEnabled !== false);
            
            if (result.error) {
                sendResponse({ ok: false, error: result.error });
                return;
            }

            if (message.type === 'copy_clean_link') {
                if (result.urls.length === 0) {
                    sendResponse({ ok: false, error: 'No URLs to copy.' });
                    return;
                }
                try {
                    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    await copyToClipboard(result.urls.join('\n'), activeTab.id);
                    sendResponse({ ok: true });
                } catch (e) {
                    sendResponse({ ok: false, error: e.message });
                }
            } else {
                sendResponse({ ok: true, urls: result.urls });
            }
        } else if (message.type === 'open_urls_in_new_tabs') {
            const urls = message.urls;
            if (!urls || urls.length === 0) {
                sendResponse({ ok: false, error: 'No URLs provided.' });
                return;
            }

            const tabIds = [];
            for (const url of urls) {
                const tab = await chrome.tabs.create({ url, active: false });
                tabIds.push(tab.id);
            }

            if (message.openInNewGroup && tabIds.length > 0) {
                const group = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(group, { title: 'Imported Links' });
            }
            sendResponse({ ok: true });
        } else if (message.type === 'clean_and_copy_urls') {
             const urls = message.urls;
            if (!urls || urls.length === 0) {
                sendResponse({ ok: false, error: 'No URLs provided.' });
                return;
            }
            const cleaned = [...new Set(urls.map(cleanUrl))].filter(Boolean);
            if (cleaned.length > 0) {
                 try {
                    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    await copyToClipboard(cleaned.join('\n'), activeTab.id);
                    sendResponse({ ok: true });
                } catch (e) {
                    sendResponse({ ok: false, error: e.message });
                }
            } else {
                 sendResponse({ ok: false, error: 'No valid URLs to copy.' });
            }
        }
    })();
    return true; // Keep message channel open for async response
});


// Context Menu Setup and Handler
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "copyCleanLinkContext",
        title: "Copy Clean Link",
        contexts: ["link", "image", "video", "audio"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "copyCleanLinkContext") {
        const urlToClean = info.linkUrl || info.srcUrl;
        if (urlToClean) {
            const cleanedUrl = cleanUrl(urlToClean);
            try {
                await copyToClipboard(cleanedUrl, tab.id);
            } catch (e) {
                console.error("Context menu copy failed:", e.message);
            }
        }
    }
});