
(function(){
  console.log('Setlist2YouTube content script loaded on:', window.location.href);
  
  // Listen for popup requests and respond with the current page HTML
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    console.log('Content script received message:', message);
    
    if (message && message.type === 'S2Y_GET_HTML'){
      try {
        var html = (document.documentElement && document.documentElement.outerHTML) || (document.body && document.body.outerHTML) || '';
        console.log('Sending HTML response, length:', html.length);
        sendResponse({ html: html });
      } catch(e){
        console.error('Content script error:', e);
        sendResponse({ error: String(e) });
      }
      return true;
    }
  });
})();
