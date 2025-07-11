# Chrome/Brave/Edge Extension - Technical Documentation

## 📁 Project Structure

```
Chrome-Brave-Edge/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker - handles core logic
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality and event handlers
├── screen-selector.js    # Screen capture area selection
├── crypto-utils.js       # Encryption/decryption utilities
├── sanitizer.js          # HTML sanitization for security
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

### Service Worker Pattern
The extension uses Chrome's Manifest V3 service worker architecture:
- **Persistent state** managed through Chrome Storage API
- **Event-driven** architecture for efficiency
- **No DOM access** in background script
- **Message passing** between components

### Component Communication Flow
```
┌─────────────┐     Messages      ┌─────────────────┐
│   Popup UI  │ ←───────────────→ │ Service Worker  │
└─────────────┘                    │ (background.js) │
                                   └────────┬────────┘
                                            │
┌─────────────────┐                         │
│ Content Script  │ ←───────────────────────┘
│(screen-selector)│     Injected on demand
└─────────────────┘
```

## 📄 File Documentation

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Search Engine Converter",
  "version": "1.2",
  "permissions": [
    "activeTab",      // Access current tab
    "contextMenus",   // Right-click menu
    "storage",        // Store settings
    "scripting",      // Inject scripts
    "tabs"           // Tab management
  ],
  "host_permissions": [
    "https://api.openai.com/*",  // OpenAI API access
    "<all_urls>"                 // Search engine access
  ]
}
```

### background.js

#### Core Functions

##### `createContextMenu()`
Creates the right-click context menu with all options.
```javascript
function createContextMenu() {
  // Main capture menu
  chrome.contextMenus.create({
    id: 'captureScreen',
    title: 'Capturar área y analizar con OpenAI',
    contexts: ['all']
  });
  
  // Search engine submenus...
}
```

##### `handleCapture(request, sendResponse)`
Handles screenshot capture requests from content scripts.
```javascript
function handleCapture(request, sendResponse) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
      return;
    }
    sendResponse({ success: true, screenshot: dataUrl });
  });
}
```

##### `handleAnalyze(request, sendResponse)`
Processes screenshot analysis with OpenAI API.
```javascript
async function handleAnalyze(request, sendResponse) {
  // 1. Load and decrypt API key
  // 2. Apply rate limiting
  // 3. Call OpenAI Vision API
  // 4. Return sanitized results
}
```

##### `convertSearchUrl(query, engineId, config)`
Converts search queries between different search engines.
```javascript
function convertSearchUrl(query, engineId, config) {
  const urls = {
    'google': `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    'duckduckgo': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    // ... other engines
  };
  return urls[engineId] || urls.google;
}
```

#### Message Handlers
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'captureVisibleTab':    // Screenshot capture
    case 'analyzeScreenshot':    // OpenAI analysis
    case 'getConfig':           // Load settings
    // ...
  }
});
```

### popup.js

#### State Management
```javascript
const configState = {
  amazonDomain: 'es',
  youtubeDomain: 'com',
  defaultEngine: 'googleSearch',
  openAIApiKey: '',
  openAIModel: 'gpt-4o-mini',
  openAIMaxTokens: 1000,
  buttonOrder: [],
  visibleEngines: {}
};
```

#### Key Functions

##### `initializeConfig()`
Loads saved configuration from Chrome storage.
```javascript
async function initializeConfig() {
  const data = await chrome.storage.local.get('searchEngineConverterConfig');
  if (data.searchEngineConverterConfig) {
    Object.assign(configState, JSON.parse(data.searchEngineConverterConfig));
  }
}
```

##### `saveConfig()`
Saves configuration with encrypted API key.
```javascript
async function saveConfig() {
  const configToSave = { ...configState };
  if (configState.openAIApiKey) {
    configToSave.openAIApiKey = await CryptoUtils.encrypt(configState.openAIApiKey);
  }
  chrome.storage.local.set({
    searchEngineConverterConfig: JSON.stringify(configToSave)
  });
}
```

##### `convertSearch(engineId)`
Handles search engine conversion.
```javascript
function convertSearch(engineId) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0].url;
    const query = extractSearchQuery(currentUrl);
    if (query) {
      const newUrl = convertSearchUrl(query, engineId, configState);
      chrome.tabs.create({ url: newUrl });
    }
  });
}
```

### screen-selector.js

Self-contained content script for area selection and screenshot capture.

#### Key Features
- **No external dependencies** - Pure JavaScript
- **Visual feedback** - Blue selection rectangle
- **Inline UI** - Results panel without new tabs
- **Keyboard support** - ESC to cancel

#### Core Functions

##### `createUI()`
Creates the overlay and selection interface.
```javascript
function createUI() {
  // Creates:
  // - Full-screen overlay
  // - Selection rectangle
  // - Instructions panel
  // - Results panel
}
```

##### `captureArea()`
Captures selected area and initiates analysis.
```javascript
function captureArea() {
  const area = {
    x: Math.min(state.startX, state.endX),
    y: Math.min(state.startY, state.endY),
    width: Math.abs(state.endX - state.startX),
    height: Math.abs(state.endY - state.startY)
  };
  
  // Request screenshot from background
  chrome.runtime.sendMessage({
    action: 'captureVisibleTab'
  }, response => {
    // Crop and analyze
  });
}
```

### crypto-utils.js

Provides secure encryption for sensitive data (API keys).

#### Security Features
- **AES-GCM encryption** (256-bit)
- **PBKDF2 key derivation** (100,000 iterations)
- **Unique salt per installation**
- **Web Crypto API** usage

#### API

##### `encrypt(text)`
```javascript
async function encrypt(text) {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  return { encrypted, iv, salt };
}
```

##### `decrypt(encryptedData)`
```javascript
async function decrypt(encryptedData) {
  const key = await deriveKey(encryptedData.salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: encryptedData.iv },
    key,
    encryptedData.encrypted
  );
  return new TextDecoder().decode(decrypted);
}
```

### sanitizer.js

Sanitizes HTML content to prevent XSS attacks.

#### Features
- **Whitelist approach** - Only safe tags allowed
- **Attribute filtering** - Removes dangerous attributes
- **URL validation** - Ensures safe links

#### API

##### `sanitizeHTML(html)`
```javascript
function sanitizeHTML(html) {
  const allowedTags = ['p', 'br', 'strong', 'em', 'code', 'pre', 
                      'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 
                      'h3', 'h4', 'h5', 'h6', 'a'];
  // Parse and clean HTML
  return cleanHTML;
}
```

### rate-limiter.js

Implements rate limiting for API calls.

#### Configuration
```javascript
const RATE_LIMIT = {
  maxRequests: 10,      // Maximum requests
  windowMs: 60000,      // Per minute
  blockDurationMs: 300000  // 5-minute block
};
```

#### API

##### `checkRateLimit()`
```javascript
async function checkRateLimit() {
  const now = Date.now();
  const requests = await getRecentRequests();
  
  if (requests.length >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded');
  }
  
  await recordRequest(now);
  return true;
}
```

## 🔒 Security Measures

### 1. API Key Protection
- Encrypted with AES-GCM before storage
- Never exposed in logs or UI
- Unique encryption key per installation

### 2. Content Security Policy
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none';"
}
```

### 3. Input Sanitization
- All OpenAI responses sanitized
- HTML entities escaped
- Markdown safely converted

### 4. Rate Limiting
- 10 requests per minute limit
- 5-minute cooldown on excess
- Prevents API abuse

## 🔧 API Integration

### OpenAI Vision API
```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageDataUrl } }
      ]
    }],
    max_tokens: 1000
  })
});
```

## 📊 Performance Considerations

### 1. Lazy Loading
- Content scripts injected only when needed
- Settings loaded on demand

### 2. Efficient Storage
- Configuration cached in memory
- Minimal storage operations

### 3. Image Processing
- Client-side cropping reduces data transfer
- Canvas API for efficient manipulation

## 🧪 Testing

### Manual Testing Checklist
- [ ] All 30 search engines convert correctly
- [ ] Screenshot capture works on all sites
- [ ] API key encryption/decryption
- [ ] Rate limiting blocks excess requests
- [ ] Settings persist across sessions
- [ ] Context menu appears properly

### Common Issues
1. **CSP Violations** - Some sites block script injection
2. **CORS Errors** - Only api.openai.com is whitelisted
3. **Memory Leaks** - Ensure cleanup of event listeners

## 🚀 Deployment

### Building for Production
1. Remove console.log statements
2. Minify JavaScript files (except libraries)
3. Optimize images
4. Update version in manifest.json
5. Test in all supported browsers

### Chrome Web Store Submission
1. Create ZIP of extension folder
2. Ensure all permissions are justified
3. Provide clear description
4. Include screenshots
5. Set appropriate categories

## 📝 Maintenance

### Regular Updates
- Check OpenAI API changes
- Update search engine URLs
- Security patches for dependencies
- Browser API deprecations

### Monitoring
- User feedback for broken features
- API usage and costs
- Error reports from users
- Performance metrics