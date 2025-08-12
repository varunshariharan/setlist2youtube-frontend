# 🐛 Chrome Extension Debugging Guide

## 🔍 **Where to Find Extension Logs**

### 1. **Background Script Logs**
The background script handles API calls and orchestrates the playlist creation:

**How to Access:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Find "Setlist2YouTube" extension
4. Click "Inspect views: background page" (or "service worker")
5. This opens DevTools for the background script

**What to Look For:**
```javascript
// API call logs
console.log('Parsing setlist HTML...');
console.error('Parse API error:', error);

// Job progress logs  
console.log('Job progress:', currentJob);

// Network request logs in Network tab
```

### 2. **Content Script Logs**
The content script runs on setlist.fm pages and extracts HTML:

**How to Access:**
1. Open the setlist.fm page where the error occurred
2. Right-click → "Inspect" (or F12)
3. Go to "Console" tab
4. Look for messages from content script

**What to Look For:**
```javascript
// Content script initialization
console.log('Setlist2YouTube content script loaded on:', window.location.href);

// HTML extraction logs
console.log('Sending HTML response, length:', html.length);
console.error('Content script error:', e);
```

### 3. **Popup Logs**
The popup interface shows user feedback and progress:

**How to Access:**
1. Click the extension icon (don't close the popup)
2. Right-click inside the popup → "Inspect"
3. This opens DevTools for the popup

**What to Look For:**
```javascript
// Button click logs
console.log('🚀 Starting playlist creation...');

// Error display logs
console.error('Failed to start playlist creation:', error);

// Progress updates
console.log('Progress update:', job.status);
```

### 4. **Network Requests**
All API calls to the backend are visible in Network tab:

**How to Access:**
1. In background script DevTools → "Network" tab
2. Or in main page DevTools → "Network" tab
3. Filter by "Fetch/XHR" to see API calls

**What to Look For:**
- `POST /api/parse` requests
- `POST /api/youtube/search` requests  
- `POST /api/youtube/playlist` requests
- Response status codes (200, 422, etc.)
- Response bodies with error messages

## 🚨 **For Your Specific Error**

**Error:** `Parse API error: 422 - {"success":false,"error":"Failed to parse setlist from HTML","requestId":"req_1754980330647_v8mvpzu44"}`

### **Debugging Steps:**

1. **Check Backend Logs (Render):**
   - Go to https://dashboard.render.com/
   - Find `setlist2youtube-backend` service
   - Click "Logs" tab
   - Search for request ID: `req_1754980330647_v8mvpzu44`
   - Look for specific error details

2. **Check Extension Logs:**
   ```javascript
   // In background script console, look for:
   console.log('Received HTML from content script, length:', response.html.length);
   
   // Check what HTML was actually sent:
   console.log('HTML preview:', response.html.substring(0, 500));
   ```

3. **Test the Parser Manually:**
   ```bash
   # Copy the actual HTML from extension logs
   curl -X POST https://setlist2youtube-backend.onrender.com/api/parse \
     -H "Content-Type: application/json" \
     -d '{"html": "paste-actual-html-here"}'
   ```

### **Common Issues:**

#### Issue 1: Content Script Not Injected
**Symptoms:** "No HTML content received from page"
**Check:** Content script logs for injection errors
**Fix:** Refresh the setlist.fm page

#### Issue 2: Wrong HTML Structure  
**Symptoms:** "No artist information found" or "No songs found"
**Check:** Backend logs for parsing details
**Fix:** Verify page structure matches parser expectations

#### Issue 3: Network/CORS Issues
**Symptoms:** Network errors in extension
**Check:** Network tab for failed requests
**Fix:** Check backend CORS configuration

## 🛠 **Debug Mode Setup**

### Enable Verbose Logging:
Add this to localStorage in extension context:
```javascript
// In background script console:
localStorage.setItem('s2y_debug', 'true');

// This enables additional logging throughout the extension
```

### Test Mode:
```javascript
// In background script console:
chrome.storage.local.set({s2y_test_mode: true});

// This can enable test-specific behavior
```

## 📱 **Real-Time Debugging**

### Monitor Extension Activity:
1. Keep background script DevTools open
2. Keep main page DevTools open  
3. Watch Console and Network tabs simultaneously
4. Try the extension action
5. Follow the log trail through all components

### Extension State Inspection:
```javascript
// In background script console:
chrome.storage.local.get(null, console.log); // See all stored data
console.log('Current job:', currentJob); // Check job state
```

## ✅ **Quick Debug Checklist**

- [ ] Background script DevTools open
- [ ] Content script logs visible on setlist.fm page
- [ ] Network tab monitoring API calls
- [ ] Backend logs accessible via Render dashboard
- [ ] HTML content verified in extension logs
- [ ] Parser tested manually with actual HTML
- [ ] Request ID tracked in backend logs

**With these tools, you can trace the exact flow and identify where the parsing is failing!**
