(function(){
  // Listen for popup requests and respond with the current page HTML
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    if (message && message.type === 'S2Y_GET_HTML'){
      try {
        var html = (document.documentElement && document.documentElement.outerHTML) || (document.body && document.body.outerHTML) || '';
        sendResponse({ html: html });
      } catch(e){
        sendResponse({ error: String(e) });
      }
      return true;
    }
  });
})();
