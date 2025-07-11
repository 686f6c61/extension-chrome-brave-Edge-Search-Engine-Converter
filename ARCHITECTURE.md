# Architecture Documentation - Search Engine Converter

## Overview

Search Engine Converter is a browser extension that provides two main features:
1. **Search Engine Conversion** - Convert searches between 30 different search engines
2. **AI-Powered Screenshot Analysis** - Capture and analyze screen areas using OpenAI

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           User Interface                             │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐    │
│  │  Popup UI   │  │  Context Menu   │  │  Content Script     │    │
│  │ (popup.html)│  │ (Right-click)   │  │(screen-selector.js) │    │
│  └──────┬──────┘  └────────┬────────┘  └──────────┬──────────┘    │
└─────────┼──────────────────┼───────────────────────┼───────────────┘
          │                  │                       │
          ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Message Bus (Runtime API)                       │
└─────────────────────────────────────────────────────────────────────┘
          │                  │                       │
          ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Background Script / Service Worker                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │Context Menu  │  │ Message      │  │ API Integration        │   │
│  │Handler       │  │ Router       │  │ (OpenAI)               │   │
│  └──────────────┘  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │                  │                       │
          ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Utility Modules                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │ CryptoUtils  │  │  Sanitizer   │  │   RateLimiter          │   │
│  │ (AES-GCM)    │  │ (XSS Guard)  │  │ (API Protection)       │   │
│  └──────────────┘  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │                  │                       │
          ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            Storage Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │Chrome Storage│  │ Encrypted    │  │  Rate Limit Data       │   │
│  │    API       │  │ API Keys     │  │                        │   │
│  └──────────────┘  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. User Interface Layer

#### Popup UI (`popup.html` + `popup.js`)
- **Purpose**: Main extension interface
- **Features**:
  - Search engine buttons (30 engines)
  - Configuration panel
  - Status indicators
  - Drag-and-drop button ordering
- **State Management**: In-memory `configState` object

#### Context Menu
- **Purpose**: Right-click functionality
- **Features**:
  - Search selected text
  - Capture screen areas
  - Quick search with default engine
- **Implementation**: Registered in background script

#### Content Script (`screen-selector.js`)
- **Purpose**: Screen capture interface
- **Features**:
  - Visual area selection
  - Inline results panel
  - No external dependencies
- **Injection**: On-demand via `executeScript`

### 2. Background Layer

#### Service Worker / Background Script
- **Chrome**: Service worker (ephemeral)
- **Firefox**: Persistent background script
- **Responsibilities**:
  - Message routing
  - API calls
  - Context menu management
  - Tab operations

#### Message Router
Routes messages between components:
```javascript
switch (request.action) {
  case 'captureVisibleTab':
  case 'analyzeScreenshot':
  case 'getConfig':
  // ...
}
```

### 3. Security Layer

#### Encryption (`crypto-utils.js`)
```
User Input → PBKDF2 → AES-GCM → Encrypted Storage
    ↑                              ↓
    └──────── Decryption ──────────┘
```

**Implementation**:
- Algorithm: AES-GCM (256-bit)
- Key Derivation: PBKDF2 (100,000 iterations)
- Unique salt per installation

#### Sanitization (`sanitizer.js`)
```
OpenAI Response → HTML Parser → Tag Whitelist → Safe Output
                       ↓              ↓
                  Remove Scripts  Escape Entities
```

**Protection Against**:
- XSS attacks
- HTML injection
- Malicious links

#### Rate Limiting (`rate-limiter.js`)
```
Request → Check Counter → Within Limit? → Allow
              ↓               ↓
         Update Counter    Block & Set Timer
```

**Configuration**:
- 10 requests per minute
- 5-minute cooldown on excess

### 4. Storage Architecture

#### Data Flow
```
User Config → Validation → Encryption → Chrome Storage API
                                ↓
                          JSON Serialization
```

#### Storage Schema
```javascript
{
  searchEngineConverterConfig: {
    amazonDomain: string,
    youtubeDomain: string,
    defaultEngine: string,
    openAIApiKey: EncryptedData,
    openAIModel: string,
    openAIMaxTokens: number,
    buttonOrder: string[],
    visibleEngines: object
  },
  rateLimiter_requests: number[],
  rateLimiter_blockUntil: number
}
```

## Data Flow Scenarios

### 1. Search Engine Conversion

```
User clicks search button → Popup.js
            ↓
Extract current search query
            ↓
Build new search URL
            ↓
Chrome.tabs.create() → New tab with search
```

### 2. Screenshot Analysis

```
User right-clicks → Context Menu
            ↓
Inject screen-selector.js
            ↓
User selects area → Capture request
            ↓
Background captures tab → Full screenshot
            ↓
Content script crops image → Selected area
            ↓
Send to OpenAI API → Analysis
            ↓
Sanitize response → Display result
```

### 3. Configuration Update

```
User changes settings → Popup UI
            ↓
Update configState object
            ↓
Encrypt sensitive data (API key)
            ↓
Save to Chrome Storage
            ↓
Broadcast update → All components
```

## Security Architecture

### Defense in Depth

1. **Input Layer**
   - Validate all user inputs
   - Sanitize search queries
   - Check API key format

2. **Storage Layer**
   - Encrypt sensitive data
   - Use secure key derivation
   - Unique encryption per install

3. **Network Layer**
   - HTTPS only for API calls
   - Rate limit API requests
   - No data to third parties

4. **Output Layer**
   - Sanitize all HTML
   - Escape special characters
   - Whitelist safe tags only

### Threat Model

| Threat | Mitigation |
|--------|------------|
| API key theft | AES-GCM encryption |
| XSS attacks | HTML sanitization |
| API abuse | Rate limiting |
| MITM attacks | HTTPS enforcement |
| Data leakage | Local processing |

## Performance Optimizations

### 1. Lazy Loading
- Content scripts injected on-demand
- Settings loaded when needed
- Large libraries cached

### 2. Efficient Messaging
```javascript
// Batch operations when possible
chrome.runtime.sendMessage({
  actions: ['getConfig', 'checkRateLimit']
});
```

### 3. Memory Management
- Clear large data after use
- Remove event listeners
- Garbage collection hints

### 4. Caching Strategy
- Configuration cached in memory
- Search patterns cached
- API responses not cached (privacy)

## Cross-Browser Compatibility

### Abstraction Layer
```javascript
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
```

### API Differences

| Feature | Chrome | Firefox |
|---------|--------|---------|
| Background | Service Worker | Background Script |
| Promises | Callbacks | Native Promises |
| Storage | chrome.storage | browser.storage |
| Tabs API | chrome.tabs | browser.tabs |

### Polyfill Usage (Firefox)
```
browser-polyfill.js → Wraps Chrome APIs → Promise-based APIs
```

## Extension Lifecycle

### Installation
```
1. User installs → onInstalled event
2. Create context menus
3. Initialize default config
4. Show welcome page (optional)
```

### Runtime
```
1. Background script starts
2. Register event listeners
3. Wait for user actions
4. Process requests
```

### Update
```
1. New version detected
2. Migrate storage if needed
3. Update context menus
4. Notify user (optional)
```

### Uninstall
```
1. Clean up storage
2. Remove context menus
3. Clear any timers
```

## Scalability Considerations

### Current Limits
- 30 search engines (can add more)
- 10 API calls/minute (configurable)
- 4000 token responses (adjustable)

### Future Enhancements
1. **Plugin Architecture**
   - Allow custom search engines
   - User-defined patterns

2. **Batch Operations**
   - Multiple captures
   - Bulk analysis

3. **Advanced Features**
   - History tracking
   - Search shortcuts
   - Custom prompts

## Development Workflow

### Local Development
```bash
# Chrome
1. chrome://extensions/
2. Enable Developer mode
3. Load unpacked
4. Select Chrome-Brave-Edge folder

# Firefox
1. about:debugging
2. This Firefox
3. Load Temporary Add-on
4. Select manifest.json in Firefox folder
```

### Testing Strategy
1. **Unit Tests** (planned)
   - Utility functions
   - URL parsing
   - Encryption/decryption

2. **Integration Tests**
   - Message passing
   - Storage operations
   - API interactions

3. **Manual Tests**
   - All search engines
   - Screenshot capture
   - Configuration persistence

### Build Process
```bash
# Current (manual)
1. Update version in manifest.json
2. Remove console.logs
3. Create ZIP file

# Future (automated)
npm run build
- Minify JS
- Optimize images
- Generate ZIP
```

## Monitoring and Analytics

### Error Tracking
```javascript
// Centralized error handler
function logError(error, context) {
  console.error(`[${context}]`, error);
  // Future: Send to analytics
}
```

### Performance Metrics
- Message response times
- API call duration
- Storage operation speed

### User Analytics (Privacy-Focused)
- Feature usage (local only)
- Error frequency
- No personal data

## Maintenance Guidelines

### Regular Tasks
1. **Monthly**
   - Check search engine URLs
   - Verify API compatibility
   - Review error logs

2. **Quarterly**
   - Update dependencies
   - Security audit
   - Performance review

3. **Yearly**
   - Major version planning
   - Architecture review
   - Documentation update

### Debugging Tips
1. **Background Script**
   ```javascript
   chrome.runtime.getManifest()  // Check version
   chrome.storage.local.get()    // View all data
   ```

2. **Content Scripts**
   ```javascript
   console.log('Injected into:', window.location.href);
   ```

3. **Message Debugging**
   ```javascript
   // Add to all handlers
   console.log('Message received:', request);
   console.log('Sending response:', response);
   ```