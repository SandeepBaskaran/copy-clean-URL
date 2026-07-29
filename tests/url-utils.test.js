const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { cleanUrl, isYouTubeWatchUrl } = require('../url-utils.js');

test('preserves the YouTube video id while removing tracking parameters', () => {
    assert.equal(
        cleanUrl('https://www.youtube.com/watch?v=abc123&utm_source=newsletter&t=42s#comments'),
        'https://www.youtube.com/watch?v=abc123'
    );
});

test('keeps five selected YouTube videos distinct after cleaning and deduplication', () => {
    const selectedTabs = Array.from({ length: 5 }, (_, index) =>
        `https://www.youtube.com/watch?v=video-${index + 1}&si=tracking-${index + 1}`
    );

    const copiedUrls = [...new Set(selectedTabs.map(cleanUrl))];

    assert.equal(copiedUrls.length, 5);
    assert.deepEqual(copiedUrls, [
        'https://www.youtube.com/watch?v=video-1',
        'https://www.youtube.com/watch?v=video-2',
        'https://www.youtube.com/watch?v=video-3',
        'https://www.youtube.com/watch?v=video-4',
        'https://www.youtube.com/watch?v=video-5'
    ]);
});

test('still deduplicates the same YouTube video with different tracking data', () => {
    const duplicateTabs = [
        'https://www.youtube.com/watch?v=abc123&si=one',
        'https://www.youtube.com/watch?si=two&v=abc123',
        'https://m.youtube.com/watch?v=abc123&utm_campaign=three'
    ];

    const copiedUrls = [...new Set(duplicateTabs.map(cleanUrl))];

    assert.deepEqual(copiedUrls, [
        'https://www.youtube.com/watch?v=abc123',
        'https://m.youtube.com/watch?v=abc123'
    ]);
});

test('supports YouTube and YouTube No-Cookie watch hosts', () => {
    assert.equal(isYouTubeWatchUrl(new URL('https://music.youtube.com/watch?v=track')), true);
    assert.equal(isYouTubeWatchUrl(new URL('https://www.youtube-nocookie.com/watch?v=video')), true);
    assert.equal(isYouTubeWatchUrl(new URL('https://youtu.be/video')), false);
});

test('retains existing cleaning behavior for ordinary URLs and short YouTube links', () => {
    assert.equal(
        cleanUrl('https://example.com/products/item?utm_source=test&color=blue#details'),
        'https://example.com/products/item'
    );
    assert.equal(
        cleanUrl('https://youtu.be/abc123?si=tracking'),
        'https://youtu.be/abc123'
    );
});

test('removes the earliest query or hash marker from malformed URL input', () => {
    assert.equal(cleanUrl('not a url#section?tracking=yes'), 'not a url');
    assert.equal(cleanUrl('not a url?tracking=yes#section'), 'not a url');
});

test('loads the shared cleaner before both browser entry points', () => {
    const root = path.resolve(__dirname, '..');
    const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
    const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');

    assert.match(background, /^importScripts\(['"]url-utils\.js['"]\);/);
    assert.ok(
        popupHtml.indexOf('src="url-utils.js"') < popupHtml.indexOf('src="popup.js"'),
        'url-utils.js must load before popup.js'
    );
});

test('background selected-tabs flow returns five distinct cleaned YouTube URLs', async () => {
    const root = path.resolve(__dirname, '..');
    const selectedTabs = Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        url: `https://www.youtube.com/watch?v=video-${index + 1}&si=tracking-${index + 1}`,
        windowId: 1,
        incognito: false
    }));

    const chrome = {
        commands: { onCommand: { addListener() {} } },
        contextMenus: {
            create() {},
            onClicked: { addListener() {} }
        },
        runtime: {
            onInstalled: { addListener() {} },
            onMessage: { addListener() {} }
        },
        scripting: { async executeScript() { return []; } },
        storage: {
            sync: { async get() { return {}; } }
        },
        tabGroups: { async update() {} },
        tabs: {
            TAB_ID_NONE: -1,
            async create() { return { id: 99 }; },
            async group() { return 1; },
            async query(options) {
                if (options.active) return [selectedTabs[0]];
                if (options.highlighted) return selectedTabs;
                return [];
            }
        }
    };

    const context = vm.createContext({ chrome, console, URL });
    context.importScripts = filename => {
        const source = fs.readFileSync(path.join(root, filename), 'utf8');
        vm.runInContext(source, context, { filename });
    };

    const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
    vm.runInContext(background, context, { filename: 'background.js' });

    const result = await context.getUrlsForScope('selectedTabs', true);

    assert.equal(result.error, null);
    assert.deepEqual(Array.from(result.urls), [
        'https://www.youtube.com/watch?v=video-1',
        'https://www.youtube.com/watch?v=video-2',
        'https://www.youtube.com/watch?v=video-3',
        'https://www.youtube.com/watch?v=video-4',
        'https://www.youtube.com/watch?v=video-5'
    ]);
});
