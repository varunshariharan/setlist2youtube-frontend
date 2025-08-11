# 🔧 Debug Chrome Extension Connection Issues

## Error: "Could not establish connection. Receiving end does not exist"

This error happens when the Chrome extension components can't communicate with each other.

### Step 1: Check Extension Status
1. Go to `chrome://extensions/`
2. Find "Setlist2YouTube" 
3. Make sure it's **enabled** ✅
4. Click **"Reload"** 🔄 to restart the extension

### Step 2: Check Background Script
1. In `chrome://extensions/`, click **"Inspect views: background page"** 
2. Check console for errors in background script
3. Expected: No errors, background script should be running

### Step 3: Check Content Script Injection
1. Open a setlist.fm page: https://www.setlist.fm/setlist/linkin-park/2025/scotiabank-arena-toronto-on-canada-135ef1bd.html
2. Open DevTools (F12)
3. Check console for: `"Setlist2YouTube content script loaded on: ..."`
4. If missing, the content script isn't injected

### Step 4: Manual Content Script Test
In the setlist.fm page console, run:
```javascript
// Test if content script is listening
chrome.runtime.sendMessage({type: 'S2Y_STATUS'}, (response) => {
  console.log('Background response:', response);
});
```

### Step 5: Force Content Script Injection
If content script is missing, manually inject it:
1. Go to `chrome://extensions/`
2. Click "Inspect views: background page"
3. In background console, run:
```javascript
// Get the current tab and inject content script
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  if (tabs[0] && tabs[0].url.includes('setlist.fm')) {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['contentScript.js']
    });
    console.log('Content script injected manually');
  }
});
```

### Step 6: Fresh Start
If still having issues:
1. **Disable** the extension
2. **Enable** the extension  
3. **Refresh** the setlist.fm page
4. **Try again**

### Expected Working Flow:
1. ✅ Background script loads and shows no errors
2. ✅ Content script logs "loaded on: ..." when page loads
3. ✅ Popup can communicate with background (S2Y_STATUS works)
4. ✅ Background can communicate with content script (S2Y_GET_HTML works)

If any step fails, that's where the communication breaks down!
