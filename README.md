# Copy Clean URL - Chrome Extension

A clean, minimal Chrome extension that cleans URLs by stripping query parameters and copies them to the clipboard.

## Features

- **Clean URL Toggle**: Strip everything from '?' onwards from the URL(s)
- **Apply For (Scope)**: Choose this tab, all tabs in group, window, or all windows
- **Keyboard Shortcut**: Use `Ctrl+Shift+L` (or `Cmd+Shift+L` on Mac) to copy link(s)
- **Toast Notifications**: Visual feedback for actions performed
- **Settings Persistence**: Your toggle preferences are saved across sessions

## Installation

1. **Download or Clone** this repository to your local machine

2. **Create Icon Files** (Required):
   - Create `icons/icon16.png` (16x16 pixels)
   - Create `icons/icon48.png` (48x48 pixels) 
   - Create `icons/icon128.png` (128x128 pixels)
   
   You can use any image editor or online icon generator to create simple icons.

3. **Load Extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the folder containing these extension files

## Usage

### Popup Interface
1. Click the extension icon in your Chrome toolbar
2. Use the toggle and radios to configure:
   - **Clean URL**: Enable/disable URL cleaning
   - **Apply For**: Select scope of tabs to copy
3. Click "Copy Clean Link" to perform the action

### Keyboard Shortcut
- Press `Ctrl+Shift+L` (Windows/Linux) or `Cmd+Shift+L` (Mac) to copy link(s)
- The extension will use your saved toggle settings (Clean URL + Apply For)

### Behavior Examples

**Example 1**: Both toggles enabled
- Input URL: `https://example.com/page?utm_source=google&ref=123`
- Result: URL cleaned to `https://example.com/page` and copied to clipboard
- Toast: "URL copied"

**Example 2**: Only Clean URL enabled
- Input URL: `https://example.com/page?utm_source=google&ref=123`
- Result: URL cleaned to `https://example.com/page` (not copied)
- Toast: "URL cleaned"

**Example 3**: Both toggles disabled
- Input URL: `https://example.com/page?utm_source=google&ref=123`
- Result: No action performed
- Toast: "No action performed"

## File Structure

```
copy-clean-url/
├── manifest.json      # Extension configuration
├── popup.html         # Popup interface
├── popup.js           # Popup functionality
├── background.js      # Background service worker
├── styles.css         # UI styling
├── package.json       # Project metadata
├── icons/             # Icon assets
│   ├── icon16.png     # 16x16 icon (create this)
│   ├── icon48.png     # 48x48 icon (create this)
│   └── icon128.png    # 128x128 icon (create this)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: 
  - `activeTab`: Access current tab
  - `clipboardWrite`: Copy to clipboard
  - `storage`: Save user preferences
  - `scripting`: Execute scripts for clipboard fallback
- **Background Script**: Service worker for keyboard shortcuts
- **Storage**: Chrome sync storage for cross-device settings

## Customization

### Changing the LinkedIn URL
Edit the `popup.html` file and update the href attribute in the footer:
```html
<a href="https://www.linkedin.com/in/sandeepbaskaran" target="_blank" class="attribution">
```

### Modifying Keyboard Shortcut
Edit the `manifest.json` file and update the `suggested_key` values in the commands section.

## Troubleshooting

1. **Extension not working**: Check that all files are present and icons are created
2. **Clipboard not working**: Ensure the extension has clipboard permissions
3. **Keyboard shortcut not working**: Check Chrome's keyboard shortcuts settings at `chrome://extensions/shortcuts`

## Credits

Vibe coded by Sandeep Baskaran
