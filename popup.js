document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const cleanUrlToggle = document.getElementById('cleanUrlToggle');
    const activateButton = document.getElementById('activateButton');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const scopeRadios = Array.from(document.querySelectorAll('input[name="applyScope"]'));

    // Load saved settings
    chrome.storage.sync.get(['cleanUrlEnabled', 'applyScope'], function(result) {
        cleanUrlToggle.checked = result.cleanUrlEnabled !== false; // Default to true
        const scope = result.applyScope || 'thisTab';
        const radioToCheck = scopeRadios.find(r => r.value === scope);
        if (radioToCheck) radioToCheck.checked = true;
        
        // Ensure DOM is ready before updating CTA text
        setTimeout(() => updateCtaText(), 0);
    });

    // Clean URL toggle change handler
    cleanUrlToggle.addEventListener('change', function() {
        chrome.storage.sync.set({ cleanUrlEnabled: cleanUrlToggle.checked });
        updateCtaText();
    });

    // Scope radio change handler
    scopeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                chrome.storage.sync.set({ applyScope: this.value });
                updateCtaText();
            }
        });
    });

    // Activate button click handler
    activateButton.addEventListener('click', function() {
        executeExtension();
    });

    // Execute the extension functionality
    async function executeExtension() {
        try {
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showToast('No active tab found');
                return;
            }

            // Ask background to handle copying per scope
            const res = await chrome.runtime.sendMessage({ type: 'copy_clean_link' });
            if (res && res.ok) {
                showToast('Copied');
            } else if (res && res.error) {
                showToast(res.error);
            } else {
                showToast('Error occurred');
            }

        } catch (error) {
            console.error('Extension error:', error);
            showToast('Error occurred');
        }
    }

    // Removed local clean/copy helpers; background handles it now

    // Show toast notification
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        
        // Auto-dismiss after 2 seconds
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }

    // No local keyboard shortcut; use extension command instead

    function updateCtaText() {
        try {
            const scope = (scopeRadios.find(r => r.checked) || { value: 'thisTab' }).value;
            const isClean = !!cleanUrlToggle.checked;
            const base = isClean ? 'Copy Clean' : 'Copy';
            const plural = scope === 'thisTab' ? ' Link' : ' Links';
            const newText = base + plural;
            
            if (activateButton) {
                activateButton.textContent = newText;
            }
        } catch (error) {
            // Fallback to default text if update fails
            if (activateButton) {
                activateButton.textContent = 'Copy Clean Link';
            }
        }
    }
});
