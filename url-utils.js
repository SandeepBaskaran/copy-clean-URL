// Shared URL-cleaning rules for the popup and background service worker.
function isYouTubeWatchUrl(url) {
    const hostname = url.hostname.toLowerCase();
    const isYouTubeHost =
        hostname === 'youtube.com' ||
        hostname.endsWith('.youtube.com') ||
        hostname === 'youtube-nocookie.com' ||
        hostname.endsWith('.youtube-nocookie.com');

    return isYouTubeHost && url.pathname === '/watch';
}

function cleanUrl(url) {
    try {
        const urlObj = new URL(url);
        const cleanedUrl = new URL(urlObj.origin + urlObj.pathname);

        // The `v` parameter identifies the video; removing it turns every
        // YouTube watch page into the same unusable /watch URL.
        if (isYouTubeWatchUrl(urlObj)) {
            const videoId = urlObj.searchParams.get('v');
            if (videoId) {
                cleanedUrl.searchParams.set('v', videoId);
            }
        }

        return cleanedUrl.toString();
    } catch {
        const queryIndex = url.indexOf('?');
        const hashIndex = url.indexOf('#');
        const cutIndexes = [queryIndex, hashIndex].filter(index => index !== -1);
        const cutIndex = cutIndexes.length > 0 ? Math.min(...cutIndexes) : -1;

        return cutIndex === -1 ? url : url.substring(0, cutIndex);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { cleanUrl, isYouTubeWatchUrl };
}
