# Copy Clean URL - Chrome Extension

A powerful Chrome extension for managing browser tab URLs with advanced export and import capabilities. Clean URLs by removing tracking parameters, copy multiple tab links at once, and import bulk URLs efficiently.

## ✨ Features

### 📤 Export Tab
Export and copy URLs from your browser tabs in various scopes:

- **Clean URL Toggle**: Strip query parameters and tracking codes from URLs
- **Multiple Scopes**:
  - 📄 This tab - Copy current tab URL
  - ✅ Selected tabs - Copy all highlighted tabs
  - 📁 This group - Copy all tabs in the current tab group
  - 🪟 This window - Copy all tabs in the current window
  - 🌐 All windows - Copy all tabs across all browser windows
  - 🔗 All links in page - Extract and copy all links from the current webpage
- **Preview URLs**: Preview all URLs before copying
- **Keyboard Shortcut**: Use `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac) to copy links quickly
- **Context Menu**: Right-click on any link/image/video to copy its clean URL

### 📥 Import Tab
Bulk import and manage URLs with intelligent extraction:

- **Smart URL Extraction**: Automatically detects and extracts URLs from messy text
  - Supports `https://` and `http://` URLs
  - Detects URLs starting with `www.` (auto-adds https://)
  - Recognizes plain domain URLs like `example.com` (auto-adds https://)
  - Handles concatenated URLs without spaces
  - Extracts URLs from paragraphs, comma-separated lists, and mixed content
- **Clean & Copy**: Extract URLs, remove tracking parameters, and copy as a formatted list
- **Open Tabs**: Open all extracted URLs in separate browser tabs
- **Tab Grouping**: Option to open imported URLs in a new tab group for better organization
- **Automatic Deduplication**: Removes duplicate URLs automatically

### 🎨 User Interface
- **Tabbed Interface**: Clean separation between Export and Import functionality
- **Toast Notifications**: Visual feedback for all actions
- **Settings Persistence**: Your preferences are saved across sessions
- **Responsive Design**: Modern, intuitive UI

## 📦 Installation

### Option 1: Load Unpacked (Development)

1. **Download or Clone** this repository:
   ```bash
   git clone https://github.com/yourusername/copy-clean-url.git
   cd copy-clean-url
   ```

2. **Create Icon Files** (Required):
   - Create `icons/icon16.png` (16x16 pixels)
   - Create `icons/icon48.png` (48x48 pixels)
   - Create `icons/icon128.png` (128x128 pixels)

   You can use any image editor or online icon generator to create simple icons.

3. **Load Extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `copy-clean-url` folder

### Option 2: Chrome Web Store (Coming Soon)
https://chromewebstore.google.com/detail/copy-clean-url/akfbdjbkancpbebcofcfibmfoaoigmbn

## 🚀 Usage

### Export Tab

#### Using the Popup:
1. Click the extension icon in your Chrome toolbar
2. Navigate to the **Export** tab (default)
3. Configure your settings:
   - Toggle **Clean URL** on/off to remove tracking parameters
   - Select **Apply For** scope (this tab, selected tabs, group, window, etc.)
4. Click **Preview URLs** to see what will be copied
5. Click **Copy Clean Link(s)** to copy to clipboard

#### Using Keyboard Shortcut:
- Press `Ctrl+Shift+L` (Windows/Linux) or `Cmd+Shift+L` (Mac)
- URLs are copied using your saved settings

#### Using Context Menu:
- Right-click on any link, image, video, or audio element
- Select "Copy Clean Link" from the context menu

### Import Tab

#### Bulk Import URLs:
1. Click the extension icon and switch to the **Import** tab
2. Paste your URLs in the textarea (any format):
   ```
   Check out https://google.com and www.github.com also visit stackoverflow.com
   ```
3. Choose your action:
   - **Clean & Copy**: Cleans and copies URLs as a list (one per line)
   - **Open Tabs**: Opens each URL in a separate browser tab

4. Optional: Check **Open in new Group** to group imported tabs together

#### Supported URL Formats:
The Import feature intelligently extracts URLs from:
- ✅ Standard URLs: `https://example.com/path`
- ✅ URLs with www: `www.example.com`
- ✅ Plain domains: `example.com`
- ✅ Concatenated URLs: `searchhttps://example.comhttps://another.com`
- ✅ Comma-separated lists: `google.com, github.com, stackoverflow.com`
- ✅ URLs in paragraphs and mixed text

## 📋 Examples

### Export Examples

**Example 1: Copy Current Tab (Cleaned)**
- Settings: Clean URL ✓, Scope: "this tab"
- Input: `https://example.com/page?utm_source=google&ref=123`
- Copied: `https://example.com/page`

**Example 2: Copy All Tabs in Window**
- Settings: Clean URL ✗, Scope: "all tabs in this window"
- Result: All tab URLs copied as list (with query parameters)

**Example 3: Extract All Links from Page**
- Settings: Clean URL ✓, Scope: "all links in this page"
- Result: All `<a>` tag URLs extracted, cleaned, and copied

### Import Examples

**Example 1: Paste Mixed Text**
```
Input:
Visit google.com, www.github.com and https://stackoverflow.com/questions
also check reddit.com

After Clean & Copy:
https://google.com
https://www.github.com
https://stackoverflow.com/questions
https://reddit.com
```

**Example 2: Concatenated URLs**
```
Input:
https://example.com/searchhttps://github.comhttps://stackoverflow.com

After Clean & Copy:
https://example.com/search
https://github.com
https://stackoverflow.com
```

## 🗂️ File Structure

```
copy-clean-url/
├── manifest.json      # Extension configuration (Manifest V3)
├── popup.html         # Popup UI with Export/Import tabs
├── popup.js           # Frontend logic and URL extraction
├── background.js      # Service worker for commands and clipboard
├── styles.css         # Modern UI styling
├── icons/             # Extension icons
│   ├── icon16.png     # 16x16 icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
└── README.md          # This file
```

## 🔧 Technical Details

### Manifest V3
This extension uses the latest Chrome Extension Manifest V3 standard.

### Permissions
- `tabs`: Query and manage browser tabs
- `tabGroups`: Create and manage tab groups
- `clipboardWrite`: Copy to clipboard
- `storage`: Save user preferences (synced across devices)
- `scripting`: Execute scripts for clipboard and link scraping
- `commands`: Support keyboard shortcuts
- `contextMenus`: Add right-click context menu items
- `<all_urls>`: Access any website for link extraction

### Browser Support
- Chrome 88+ (Manifest V3 support)
- Microsoft Edge 88+ (Chromium-based)

### Architecture
- **popup.js**: Handles all Import tab logic (client-side), Export tab UI
- **background.js**: Service worker for Export scope logic, clipboard operations, keyboard shortcuts, context menu
- **Chrome Storage Sync**: User preferences synchronized across devices

## ⚙️ Customization

### Keyboard Shortcut
To change the default keyboard shortcut:
1. Go to `chrome://extensions/shortcuts`
2. Find "Copy Clean URL"
3. Click the edit icon and set your preferred shortcut

Or edit `manifest.json`:
```json
"commands": {
  "copy_clean_link": {
    "suggested_key": {
      "default": "Ctrl+Shift+L",
      "mac": "Command+Shift+L"
    }
  }
}
```

### Clean URL Logic
By default, the extension removes query parameters and hash fragments. For YouTube watch
URLs, it preserves the essential `v` parameter so different videos remain valid and distinct
after cleaning while tracking parameters are removed.

To modify this behavior, edit the shared `cleanUrl()` function in `url-utils.js`.

## 🐛 Troubleshooting

### Extension not loading
- Ensure all files are present in the directory
- Check that icon files exist in the `icons/` folder
- Reload the extension from `chrome://extensions/`

### Clipboard not working (Export tab)
- The extension injects a script into the page to copy - some protected pages (like `chrome://` URLs) don't allow this
- Make sure you're copying from a regular webpage, not a Chrome internal page

### URLs not extracting (Import tab)
- Ensure URLs are in supported formats (see "Supported URL Formats" above)
- Check browser console for error messages
- Try reloading the extension

### Keyboard shortcut not working
- Check if another extension is using the same shortcut
- Verify shortcut is enabled at `chrome://extensions/shortcuts`
- Try reassigning a different key combination

### Tab groups not creating
- Ensure your Chrome version supports Tab Groups (Chrome 88+)
- Check that `tabGroups` permission is granted

## 🛣️ Roadmap

- [ ] Export to CSV/JSON formats
- [ ] Import from CSV/JSON files
- [ ] Custom URL cleaning rules
- [ ] Bookmark integration
- [ ] History of copied URLs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

MIT License - feel free to use and modify as needed.

## 👤 Credits

**Developed by:** Sandeep Baskaran
**GitHub:** [github.com/sandeepbaskaran](https://github.com/sandeepbaskaran)
**LinkedIn:** [linkedin.com/in/sandeepbaskaran](https://www.linkedin.com/in/sandeepbaskaran)

---

⭐ If you find this extension useful, please star the repository!
