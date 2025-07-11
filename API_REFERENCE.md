# API Reference - Search Engine Converter

## Table of Contents
- [Background Script APIs](#background-script-apis)
- [Popup APIs](#popup-apis)
- [Content Script APIs](#content-script-apis)
- [Utility Modules](#utility-modules)
- [Message Protocol](#message-protocol)
- [Storage Schema](#storage-schema)

## Background Script APIs

### Message Handlers

#### `captureVisibleTab`
Captures a screenshot of the visible area of the current tab.

**Request:**
```javascript
{
  action: 'captureVisibleTab'
}
```

**Response:**
```javascript
{
  success: boolean,
  screenshot?: string,  // Base64 data URL
  error?: string
}
```

**Example:**
```javascript
chrome.runtime.sendMessage({
  action: 'captureVisibleTab'
}, response => {
  if (response.success) {
    console.log('Screenshot captured:', response.screenshot);
  } else {
    console.error('Capture failed:', response.error);
  }
});
```

#### `analyzeScreenshot`
Analyzes a screenshot using OpenAI's Vision API.

**Request:**
```javascript
{
  action: 'analyzeScreenshot',
  screenshot: string,    // Base64 data URL
  prompt: string        // Analysis prompt
}
```

**Response:**
```javascript
{
  success: boolean,
  analysis?: string,    // Analysis result text
  error?: string
}
```

**Example:**
```javascript
chrome.runtime.sendMessage({
  action: 'analyzeScreenshot',
  screenshot: 'data:image/png;base64,...',
  prompt: 'What is shown in this image?'
}, response => {
  if (response.success) {
    console.log('Analysis:', response.analysis);
  }
});
```

#### `getConfig`
Retrieves the current extension configuration.

**Request:**
```javascript
{
  action: 'getConfig'
}
```

**Response:**
```javascript
{
  success: boolean,
  config?: ConfigObject,
  error?: string
}
```

### Context Menu APIs

#### Search Engine Conversion
Context menu IDs for search engine conversion:
- `googleSearch`
- `duckduckgoSearch`
- `bingSearch`
- `openaiSearch`
- `amazonSearch`
- `youtubeSearch`
- `braveSearch`
- `wikipediaSearch`
- `twitterSearch`
- `githubSearch`
- `gitlabSearch`
- `stackoverflowSearch`
- `redditSearch`
- `pinterestSearch`
- `startpageSearch`
- `ecosiaSearch`
- `qwantSearch`
- `yandexSearch`
- `baiduSearch`
- `ebaySearch`
- `aliexpressSearch`
- `etsySearch`
- `scholarSearch`
- `archiveSearch`
- `wolframalphaSearch`
- `spotifySearch`
- `soundcloudSearch`
- `vimeoSearch`
- `linkedinSearch`
- `tiktokSearch`

#### Screen Capture
- `captureScreen` - Initiates screen area capture

## Popup APIs

### Configuration Management

#### `initializeConfig()`
Loads configuration from storage and initializes the UI.

**Returns:** `Promise<void>`

**Example:**
```javascript
await initializeConfig();
console.log('Configuration loaded:', configState);
```

#### `saveConfig()`
Saves the current configuration to storage with encrypted API key.

**Returns:** `Promise<void>`

**Example:**
```javascript
configState.openAIApiKey = 'sk-...';
await saveConfig();
console.log('Configuration saved');
```

### Search Conversion

#### `convertSearch(engineId)`
Converts current search to specified engine.

**Parameters:**
- `engineId` (string): Target search engine ID

**Example:**
```javascript
convertSearch('googleSearch');  // Opens search in Google
```

#### `extractSearchQuery(url)`
Extracts search query from various search engine URLs.

**Parameters:**
- `url` (string): Search engine URL

**Returns:** `string | null`

**Example:**
```javascript
const query = extractSearchQuery('https://www.google.com/search?q=test');
console.log(query); // "test"
```

### UI State Management

#### `updateStatus(message, type)`
Updates the status message in the popup.

**Parameters:**
- `message` (string): Status message
- `type` (string): 'success' | 'error' | 'warning' | 'info'

**Example:**
```javascript
updateStatus('Search converted successfully', 'success');
```

#### `updateEngineVisibility()`
Updates button visibility based on configuration.

**Example:**
```javascript
configState.visibleEngines.github = true;
updateEngineVisibility();
```

## Content Script APIs

### Screen Selector Module

#### `createUI()`
Creates the selection overlay interface.

**Returns:**
```javascript
{
  container: HTMLElement,
  overlay: HTMLElement,
  selection: HTMLElement,
  instructions: HTMLElement,
  resultPanel: HTMLElement
}
```

#### `captureArea()`
Captures the selected screen area.

**Process:**
1. Calculates selection coordinates
2. Hides UI temporarily
3. Requests screenshot from background
4. Crops image to selection
5. Shows analysis panel

#### `analyzeImage()`
Sends captured image for OpenAI analysis.

**Uses:**
- Custom prompt from textarea
- Configured API settings
- Sanitized response display

#### `cleanup()`
Removes all UI elements and event listeners.

**Example:**
```javascript
// On ESC key or cancel
cleanup();
```

## Utility Modules

### CryptoUtils

#### `encrypt(text)`
Encrypts sensitive text using AES-GCM.

**Parameters:**
- `text` (string): Text to encrypt

**Returns:** `Promise<EncryptedData>`

```javascript
interface EncryptedData {
  encrypted: ArrayBuffer,
  iv: Uint8Array,
  salt: Uint8Array
}
```

**Example:**
```javascript
const encrypted = await CryptoUtils.encrypt('sk-api-key');
```

#### `decrypt(encryptedData)`
Decrypts previously encrypted data.

**Parameters:**
- `encryptedData` (EncryptedData | string): Encrypted data

**Returns:** `Promise<string>`

**Example:**
```javascript
const apiKey = await CryptoUtils.decrypt(encryptedData);
```

#### `isEncrypted(data)`
Checks if data is already encrypted.

**Parameters:**
- `data` (any): Data to check

**Returns:** `boolean`

### Sanitizer

#### `sanitizeHTML(html)`
Sanitizes HTML to prevent XSS attacks.

**Parameters:**
- `html` (string): HTML to sanitize

**Returns:** `string`

**Allowed Tags:**
- Text: `p`, `br`, `strong`, `em`, `code`, `pre`
- Lists: `ul`, `ol`, `li`
- Structure: `blockquote`, `h1`-`h6`
- Links: `a` (with href validation)

**Example:**
```javascript
const safe = sanitizeHTML('<script>alert("xss")</script><p>Safe text</p>');
// Returns: '<p>Safe text</p>'
```

#### `escapeHtml(text)`
Escapes HTML special characters.

**Parameters:**
- `text` (string): Text to escape

**Returns:** `string`

**Example:**
```javascript
const escaped = escapeHtml('<div>Text</div>');
// Returns: '&lt;div&gt;Text&lt;/div&gt;'
```

### RateLimiter

#### `checkRateLimit()`
Checks if request is within rate limits.

**Returns:** `Promise<boolean>`

**Throws:** `Error` if rate limit exceeded

**Configuration:**
```javascript
{
  maxRequests: 10,        // Per window
  windowMs: 60000,        // 1 minute
  blockDurationMs: 300000 // 5 minutes
}
```

**Example:**
```javascript
try {
  await RateLimiter.checkRateLimit();
  // Proceed with API call
} catch (error) {
  console.error('Rate limit exceeded');
}
```

## Message Protocol

### Message Format
All messages between components follow this structure:

```javascript
// Request
{
  action: string,      // Required action identifier
  ...params           // Action-specific parameters
}

// Response
{
  success: boolean,    // Required success indicator
  error?: string,      // Error message if success=false
  ...data             // Action-specific response data
}
```

### Message Flow Examples

#### Screenshot Capture Flow
```javascript
// 1. Content script → Background
{
  action: 'captureVisibleTab'
}

// 2. Background → Content script
{
  success: true,
  screenshot: 'data:image/png;base64,...'
}

// 3. Content script → Background
{
  action: 'analyzeScreenshot',
  screenshot: 'data:image/png;base64,...',
  prompt: 'Analyze this image'
}

// 4. Background → Content script
{
  success: true,
  analysis: 'The image shows...'
}
```

## Storage Schema

### Configuration Object
```typescript
interface SearchEngineConfig {
  // Domain settings
  amazonDomain: 'es' | 'com' | 'co.uk' | 'de' | 'fr' | 'it',
  youtubeDomain: 'com' | 'es',
  
  // Default search engine
  defaultEngine: string,  // Engine ID
  
  // OpenAI settings
  openAIApiKey: string | EncryptedData,  // Encrypted in storage
  openAIModel: 'gpt-4o-mini' | 'gpt-4o',
  openAIMaxTokens: number,  // 100-4000
  
  // UI settings
  buttonOrder: string[],   // Array of button IDs
  visibleEngines: {
    [engineId: string]: boolean
  }
}
```

### Storage Keys
- `searchEngineConverterConfig` - Main configuration (JSON string)
- `rateLimiter_requests` - Rate limit tracking (JSON array)
- `rateLimiter_blockUntil` - Rate limit block timestamp

### Storage Operations

#### Save Configuration
```javascript
await chrome.storage.local.set({
  searchEngineConverterConfig: JSON.stringify(config)
});
```

#### Load Configuration
```javascript
const data = await chrome.storage.local.get('searchEngineConverterConfig');
const config = JSON.parse(data.searchEngineConverterConfig || '{}');
```

#### Clear Storage
```javascript
await chrome.storage.local.clear();
```

## Error Handling

### Error Types

#### API Errors
```javascript
{
  success: false,
  error: 'API key not configured'
}
```

#### Rate Limit Errors
```javascript
{
  success: false,
  error: 'Rate limit exceeded. Please wait 5 minutes.'
}
```

#### Capture Errors
```javascript
{
  success: false,
  error: 'Failed to capture tab: Permission denied'
}
```

### Error Handling Pattern
```javascript
try {
  const result = await someAsyncOperation();
  if (!result.success) {
    throw new Error(result.error);
  }
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  updateStatus(error.message, 'error');
}
```

## Best Practices

### 1. Always Check Response Success
```javascript
chrome.runtime.sendMessage({ action: 'someAction' }, response => {
  if (!response || !response.success) {
    console.error('Action failed:', response?.error);
    return;
  }
  // Handle success
});
```

### 2. Validate User Input
```javascript
const apiKey = input.value.trim();
if (!apiKey.startsWith('sk-')) {
  updateStatus('Invalid API key format', 'error');
  return;
}
```

### 3. Handle Async Operations
```javascript
async function performAction() {
  try {
    updateStatus('Processing...', 'info');
    const result = await someAsyncAction();
    updateStatus('Success!', 'success');
  } catch (error) {
    updateStatus(error.message, 'error');
  }
}
```

### 4. Clean Up Resources
```javascript
// Remove event listeners
document.removeEventListener('keydown', handler);

// Clear large data
state.screenshot = null;

// Remove DOM elements
element.remove();
```