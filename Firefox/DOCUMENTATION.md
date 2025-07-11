# Firefox Extension - Technical Documentation

## 📁 Project Structure

```
Firefox/
├── manifest.json          # Extension manifest (WebExtensions API)
├── background.js          # Background script with polyfill
├── browser-polyfill.js    # Cross-browser compatibility layer
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── screen-selector.js    # Screen capture area selection
├── crypto-utils.js       # Encryption/decryption utilities
├── sanitizer.js          # HTML sanitization
├── rate-limiter.js       # API rate limiting
├── Sortable.min.js       # Drag-and-drop library
└── images/               # Icons and screenshots
    ├── icon128.png
    ├── icon256.png
    ├── imagen.png
    ├── texto.png
    └── OpenAI.png
```

## 🏗️ Architecture Overview

### Firefox WebExtensions API
The extension uses Firefox's WebExtensions API with browser polyfill for compatibility:
- **Browser polyfill** ensures Chrome API compatibility
- **Promise-based APIs** instead of callbacks
- **Background scripts** instead of service workers
- **Same security model** as Chrome

### Key Differences from Chrome

| Feature | Chrome | Firefox |
|---------|--------|---------|
| API Namespace | `chrome.*` | `browser.*` (with polyfill) |
| Background | Service Worker | Persistent Background Script |
| Promises | Callback-based | Promise-based |
| Manifest | v3 only | v3 with `browser_specific_settings` |

## 📄 File Documentation

### manifest.json (Firefox-specific)
```json
{
  "manifest_version": 3,
  "browser_specific_settings": {
    "gecko": {
      "id": "search-engine-converter@686f6c61.github.io",
      "strict_min_version": "109.0"
    }
  },
  "background": {
    "scripts": [
      "browser-polyfill.js",   // Must be first
      "crypto-utils.js",
      "sanitizer.js",
      "rate-limiter.js",
      "background.js"
    ]
  }
}
```

### browser-polyfill.js
Mozilla's official WebExtension browser API polyfill.
- **Purpose**: Provides promise-based `browser.*` API
- **Usage**: Automatically wraps Chrome-style callbacks
- **Source**: https://github.com/mozilla/webextension-polyfill

### background.js (Firefox version)

#### Browser API Detection
```javascript
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
```

#### Firefox-specific Implementations

##### Promise-based Tab Capture
```javascript
function handleCapture(request, sendResponse) {
  const capturePromise = browserAPI.tabs.captureVisibleTab(null, { format: 'png' });
  
  if (capturePromise && capturePromise.then) {
    // Firefox - uses promises
    capturePromise
      .then(dataUrl => {
        sendResponse({ success: true, screenshot: dataUrl });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
  } else {
    // Fallback for older versions
    browserAPI.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ success: true, screenshot: dataUrl });
    });
  }
}
```

##### Script Injection
```javascript
browserAPI.tabs.executeScript(tab.id, {
  file: 'screen-selector.js'
}, () => {
  if (browserAPI.runtime.lastError) {
    console.error('Error:', browserAPI.runtime.lastError);
  }
});
```

### popup.js (Firefox version)

#### Browser API Usage
```javascript
// Storage access
browserAPI.storage.local.get('searchEngineConverterConfig', (data) => {
  // Handle configuration
});

// Tab queries
browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  // Process tabs
});

// Message sending
browserAPI.runtime.sendMessage({ action: 'captureVisibleTab' }, response => {
  // Handle response
});
```

### screen-selector.js (Firefox-compatible)

#### Cross-browser Message Handling
```javascript
// Detect and use appropriate API
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Send messages
browserAPI.runtime.sendMessage({
  action: 'captureVisibleTab'
}, response => {
  // Handle response
});
```

## 🔧 Firefox-Specific Features

### 1. Permissions
Firefox requires explicit permissions in manifest:
```json
"permissions": [
  "activeTab",
  "contextMenus",
  "storage",
  "scripting",
  "tabs",
  "clipboardWrite"  // Firefox-specific
]
```

### 2. Content Security Policy
Firefox CSP format:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'; connect-src 'self' https://api.openai.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;"
}
```

### 3. Background Script Loading
Scripts load in order (important for polyfill):
```json
"background": {
  "scripts": [
    "browser-polyfill.js",  // MUST be first
    "crypto-utils.js",
    "sanitizer.js",
    "rate-limiter.js",
    "background.js"
  ]
}
```

## 🐛 Firefox Compatibility Issues

### Common Problems and Solutions

#### 1. Promise vs Callback APIs
**Problem**: Chrome uses callbacks, Firefox uses promises
**Solution**: Browser polyfill handles conversion automatically

#### 2. Script Injection Timing
**Problem**: Content scripts may inject before page ready
**Solution**: Use `"run_at": "document_end"` in manifest

#### 3. Storage API Differences
**Problem**: Subtle differences in storage.local behavior
**Solution**: Always stringify objects before storing

#### 4. CORS and CSP
**Problem**: Firefox stricter about mixed content
**Solution**: Ensure all resources use HTTPS

## 🧪 Firefox-Specific Testing

### Testing Checklist
- [ ] Install via `about:debugging`
- [ ] Test in Firefox Developer Edition
- [ ] Verify polyfill loads correctly
- [ ] Check console for promise rejections
- [ ] Test on Firefox Android (if applicable)
- [ ] Verify all permissions work

### Debugging in Firefox

1. **Open debugging page**
   ```
   about:debugging#/runtime/this-firefox
   ```

2. **Enable extension debugging**
   - Click "Inspect" next to extension
   - Opens dedicated DevTools

3. **Common debugging commands**
   ```javascript
   // In extension console
   browser.runtime.getManifest()  // Check manifest
   browser.permissions.getAll()   // List permissions
   browser.storage.local.get()    // View all storage
   ```

## 📊 Performance Optimization

### Firefox-Specific Optimizations

1. **Lazy Loading with Polyfill**
   ```javascript
   // Only load polyfill if needed
   if (typeof browser === 'undefined') {
     importScripts('browser-polyfill.js');
   }
   ```

2. **Efficient Promise Handling**
   ```javascript
   // Use async/await for cleaner code
   async function captureTab() {
     try {
       const dataUrl = await browser.tabs.captureVisibleTab();
       return { success: true, screenshot: dataUrl };
     } catch (error) {
       return { success: false, error: error.message };
     }
   }
   ```

3. **Memory Management**
   - Clear large data after use
   - Remove event listeners properly
   - Use weak references where possible

## 🚀 Firefox Add-on Submission

### Preparation Steps

1. **Validate manifest**
   ```bash
   web-ext lint
   ```

2. **Build extension**
   ```bash
   web-ext build
   ```

3. **Test in Firefox**
   ```bash
   web-ext run
   ```

### Submission Requirements

1. **Source code** - May need to provide
2. **Privacy policy** - Required for data handling
3. **Version compatibility** - Set minimum Firefox version
4. **AMO guidelines** - Follow Mozilla's policies

### Firefox-Specific Metadata
```json
"browser_specific_settings": {
  "gecko": {
    "id": "your-extension@example.com",
    "strict_min_version": "109.0",
    "update_url": "https://example.com/updates.json"
  }
}
```

## 🔍 Troubleshooting

### Common Firefox Issues

#### Extension Not Loading
```bash
# Check for errors
web-ext lint

# Run with verbose logging
web-ext run --verbose
```

#### API Not Available
```javascript
// Check if API exists
if (typeof browser.tabs.captureVisibleTab === 'function') {
  // API available
} else {
  console.error('API not available');
}
```

#### Storage Issues
```javascript
// Always check for errors
browser.storage.local.set({ key: value }).catch(error => {
  console.error('Storage error:', error);
});
```

## 📚 Resources

### Official Documentation
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Browser Polyfill](https://github.com/mozilla/webextension-polyfill)

### Development Tools
- [web-ext](https://github.com/mozilla/web-ext) - Build and test tool
- [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/)
- [Extension Source Viewer](https://addons.mozilla.org/firefox/addon/crxviewer/)

## 🔄 Maintaining Compatibility

### Cross-Browser Code
```javascript
// Universal pattern for both Chrome and Firefox
(async () => {
  const browserAPI = window.browser || window.chrome;
  
  try {
    const tabs = await browserAPI.tabs.query({ active: true });
    // Works in both browsers
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

### Feature Detection
```javascript
// Check for API availability
const supportsPromises = typeof browser !== 'undefined' && 
                        browser.tabs && 
                        browser.tabs.query() instanceof Promise;

if (supportsPromises) {
  // Use promise-based API
} else {
  // Use callback-based API
}
```