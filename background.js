// MV3 background: re-inject content script on SPA navigations and loads
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  try {
    if (!details.tabId) return;
    chrome.scripting.executeScript({ target: { tabId: details.tabId }, files: ['contentScript.js'] });
  } catch (e) {
    // no-op
  }
}, { url: [{ hostEquals: 'www.setlist.fm' }] });

chrome.webNavigation.onCompleted.addListener((details) => {
  try {
    if (!details.tabId) return;
    chrome.scripting.executeScript({ target: { tabId: details.tabId }, files: ['contentScript.js'] });
  } catch (e) {
    // no-op
  }
}, { url: [{ hostEquals: 'www.setlist.fm' }] });
