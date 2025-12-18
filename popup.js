document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // Element Querying
    // =================================================================
    const cleanUrlToggle = document.getElementById('cleanUrlToggle');
    const scopeRadios = Array.from(document.querySelectorAll('input[name="applyScope"]'));
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Export tab elements
    const activateButton = document.getElementById('activateButton');
    const previewButton = document.getElementById('previewButton');
    const previewArea = document.getElementById('previewArea');
    const previewText = document.getElementById('previewText');

    // Import tab elements
    const importUrlsTextarea = document.getElementById('importUrls');
    const openAllImportButton = document.getElementById('openAllImportButton');
    const cleanAndCopyImportButton = document.getElementById('cleanAndCopyImportButton');
    const openInNewGroupCheckbox = document.getElementById('openInNewGroup');

    // =================================================================
    // Initial Setup
    // =================================================================

    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    function switchTab(tabId) {
        tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
        tabContents.forEach(content => content.classList.toggle('active', content.id === `${tabId}-tab`));
    }

    chrome.storage.sync.get(['cleanUrlEnabled', 'applyScope'], function(result) {
        cleanUrlToggle.checked = result.cleanUrlEnabled !== false;
        const scope = result.applyScope || 'thisTab';
        const radioToCheck = scopeRadios.find(r => r.value === scope);
        if (radioToCheck) radioToCheck.checked = true;
        
        updateCtaText();
        switchTab('export');
    });

    // =================================================================
    // Export Tab Logic (Communicates with background script)
    // =================================================================
    
    cleanUrlToggle.addEventListener('change', function() {
        chrome.storage.sync.set({ cleanUrlEnabled: this.checked });
        updateCtaText();
    });

    scopeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                chrome.storage.sync.set({ applyScope: this.value });
                updateCtaText();
                previewArea.classList.add('hidden');
            }
        });
    });

    activateButton.addEventListener('click', () => handleExportAction('copy_clean_link'));
    previewButton.addEventListener('click', () => handleExportAction('get_urls_for_preview'));

    async function handleExportAction(messageType) {
        try {
            const res = await chrome.runtime.sendMessage({ type: messageType });
            if (res && res.ok) {
                if (messageType === 'copy_clean_link') {
                    showToast('Copied!');
                    previewArea.classList.add('hidden');
                } else if (messageType === 'get_urls_for_preview') {
                    if (res.urls && res.urls.length > 0) {
                        previewText.value = res.urls.join('\n');
                        previewArea.classList.remove('hidden');
                    } else {
                        showToast('No URLs found to preview.');
                    }
                }
            } else {
                showToast(res ? res.error : 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Extension error:', error);
            showToast('Error: ' + error.message);
        }
    }

    // =================================================================
    // Import Tab Logic (Self-contained in popup.js)
    // =================================================================

    function cleanUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname;
        } catch (e) {
            const qIndex = url.indexOf('?');
            return qIndex !== -1 ? url.substring(0, qIndex) : url;
        }
    }

    function extractUrls(text) {
        if (!text) return [];

        const urls = [];

        // FIRST: Handle concatenated URLs by splitting at http:// or https:// boundaries
        // This handles cases like "searchhttps://example.com" -> ["search", "https://example.com"]
        const parts = text.split(/(https?:\/\/)/gi);

        let reconstructedText = '';
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] && (parts[i].toLowerCase() === 'http://' || parts[i].toLowerCase() === 'https://')) {
                // Add space before protocol to separate concatenated URLs
                if (reconstructedText && !reconstructedText.endsWith(' ') && !reconstructedText.endsWith('\n')) {
                    reconstructedText += ' ';
                }
                reconstructedText += parts[i];
            } else if (parts[i]) {
                reconstructedText += parts[i];
            }
        }

        // Now extract URLs from the properly spaced text
        // Pattern 1: URLs with http:// or https://
        const httpRegex = /https?:\/\/[^\s"'<>]+/gi;
        const httpMatches = reconstructedText.match(httpRegex) || [];

        // Clean each match: URLs might be concatenated, so split at the next http occurrence
        for (let url of httpMatches) {
            // Remove trailing punctuation
            url = url.replace(/[.,;:!?)\]}>]+$/, '');

            // Split if there's another protocol inside (shouldn't happen after our split, but safety check)
            const nestedSplit = url.split(/(https?:\/\/)/i);
            if (nestedSplit.length > 1) {
                for (let i = 0; i < nestedSplit.length; i++) {
                    if (nestedSplit[i] && (nestedSplit[i].toLowerCase() === 'http://' || nestedSplit[i].toLowerCase() === 'https://')) {
                        if (nestedSplit[i + 1]) {
                            urls.push(nestedSplit[i] + nestedSplit[i + 1]);
                            i++; // Skip next part as we combined it
                        }
                    }
                }
            } else {
                urls.push(url);
            }
        }

        // Pattern 2: URLs starting with www. (add https:// prefix)
        const wwwRegex = /(?:^|[\s,;])(www\.[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}[^\s"'<>]*)/gi;
        let match;
        while ((match = wwwRegex.exec(reconstructedText)) !== null) {
            let wwwUrl = match[1].trim();
            wwwUrl = wwwUrl.replace(/[.,;:!?)\]}>]+$/, '');
            if (wwwUrl && !urls.some(u => u.includes(wwwUrl))) {
                urls.push('https://' + wwwUrl);
            }
        }

        // Pattern 3: Plain domain URLs like example.com, subdomain.example.com
        // Only match if they look like valid domains (conservative approach)
        const domainRegex = /(?:^|[\s,;])([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?:\/[^\s"'<>]*)?/gi;
        while ((match = domainRegex.exec(reconstructedText)) !== null) {
            let potentialUrl = match[0].trim();
            potentialUrl = potentialUrl.replace(/[.,;:!?)\]}>]+$/, '');

            // Skip if it's already captured by http:// or www. patterns
            if (!potentialUrl.startsWith('http') && !potentialUrl.startsWith('www.')) {
                // Additional validation: must have at least one dot and valid TLD
                if (potentialUrl.includes('.') && /\.[a-zA-Z]{2,}/.test(potentialUrl)) {
                    const urlWithProtocol = 'https://' + potentialUrl;
                    if (!urls.some(u => u.includes(potentialUrl))) {
                        urls.push(urlWithProtocol);
                    }
                }
            }
        }

        // Validate all URLs and filter out invalid ones
        const validUrls = urls.map(url => {
            try {
                // Validate URL structure
                new URL(url);
                return url;
            } catch {
                return null;
            }
        }).filter(Boolean);

        return validUrls;
    }

    // --- "Clean & Copy" Button ---
    cleanAndCopyImportButton.addEventListener('click', async () => {
        const text = importUrlsTextarea.value;
        const urls = extractUrls(text);

        if (urls.length === 0) {
            showToast('No URLs found to copy.');
            return;
        }

        const cleanedUrls = urls.map(cleanUrl);
        const uniqueUrls = [...new Set(cleanedUrls)];
        const finalString = uniqueUrls.join('\n');

        try {
            await navigator.clipboard.writeText(finalString);
            showToast('Copied!');
            importUrlsTextarea.value = '';
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            showToast('Copy failed!');
        }
    });
    
    // --- "Open All" Button ---
    openAllImportButton.addEventListener('click', async () => {
        const text = importUrlsTextarea.value;
        const urls = extractUrls(text);

        if (urls.length === 0) {
            showToast('No URLs found to open.');
            return;
        }
        
        const uniqueUrls = [...new Set(urls)];
        const createdTabs = [];

        for (const url of uniqueUrls) {
            try {
                const tab = await chrome.tabs.create({ url, active: false });
                if (tab) createdTabs.push(tab);
            } catch (err) {
                console.error(`Failed to open URL: ${url}`, err);
            }
        }

        if (openInNewGroupCheckbox.checked && createdTabs.length > 0) {
            const tabIds = createdTabs.map(tab => tab.id);
            try {
                const group = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(group, { title: 'Imported Links' });
            } catch (err) {
                console.error('Failed to create tab group:', err);
            }
        }
        
        if (createdTabs.length > 0) {
            showToast(`Opened ${createdTabs.length} URLs.`);
            importUrlsTextarea.value = '';
        } else {
            showToast('Could not open any URLs.');
        }
    });

    // =================================================================
    // Helper Functions
    // =================================================================

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    }

    function updateCtaText() {
        const scope = (scopeRadios.find(r => r.checked) || { value: 'thisTab' }).value;
        const isClean = cleanUrlToggle.checked;
        const base = isClean ? 'Copy Clean' : 'Copy';
        const suffix = (scope === 'thisTab') ? 'Link' : 'Links';
        activateButton.textContent = `${base} ${suffix}`;
    }
});