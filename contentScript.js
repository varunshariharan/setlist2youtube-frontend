
(function(){
  console.log('Know The Show content script loaded on:', window.location.href);
  console.log('Page readyState:', document.readyState);
  console.log('Document element exists:', !!document.documentElement);
  
  // Listen for popup requests and respond with the current page HTML
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    console.log('Content script received message:', message);
    
    if (message && message.type === 'S2Y_PING'){
      // Respond to ping to verify content script is active
      console.log('Content script responding to ping');
      sendResponse({ type: 'S2Y_PONG', timestamp: Date.now() });
      return true;
    }
    
    if (message && message.type === 'S2Y_GET_HTML'){
      try {
        // Debug information
        console.log('Document readyState:', document.readyState);
        console.log('Document element exists:', !!document.documentElement);
        console.log('Body exists:', !!document.body);
        console.log('URL:', window.location.href);
        
        // Extract HTML with validation
        var html = '';
        if (document.documentElement && document.documentElement.outerHTML) {
          html = document.documentElement.outerHTML;
        } else if (document.body && document.body.outerHTML) {
          html = document.body.outerHTML;
        } else {
          console.error('No HTML found - document structure missing');
          sendResponse({ 
            error: 'No HTML content found - document structure missing',
            debug: {
              readyState: document.readyState,
              hasDocumentElement: !!document.documentElement,
              hasBody: !!document.body,
              url: window.location.href
            }
          });
          return true;
        }
        
        // Validate HTML content
        if (!html || html.trim().length === 0) {
          console.error('HTML content is empty');
          sendResponse({ 
            error: 'HTML content is empty',
            debug: {
              readyState: document.readyState,
              hasDocumentElement: !!document.documentElement,
              hasBody: !!document.body,
              url: window.location.href
            }
          });
          return true;
        }
        
        console.log('Sending HTML response, length:', html.length);
        console.log('First 100 chars:', html.substring(0, 100));
        sendResponse({ html: html });
      } catch(e){
        console.error('Content script error:', e);
        sendResponse({ 
          error: String(e),
          debug: {
            readyState: document.readyState,
            hasDocumentElement: !!document.documentElement,
            hasBody: !!document.body,
            url: window.location.href
          }
        });
      }
      return true;
    }
  });
})();
