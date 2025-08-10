(function(){
  function ensureButton(){
    if (window.s2y && typeof window.s2y.createConvertButton === 'function'){
      var btn = window.s2y.createConvertButton(document);
      btn.addEventListener('click', function(){
        try {
          var html = (document.documentElement && document.documentElement.outerHTML) || (document.body && document.body.outerHTML) || '';
          var apiBase = (typeof window !== 'undefined' && window.S2Y_API_BASE) || 'http://localhost:4000';
          fetch(apiBase + '/api/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: html })
          })
          .then(function(r){ return r.json(); })
          .then(function(data){
            console.log('Parsed setlist:', data);
          })
          .catch(function(err){ console.error('Parse error', err); });
        } catch (e) {
          console.error('Failed to serialize page HTML', e);
        }
      });
    }
  }

  var shouldActivate = window.s2y && typeof window.s2y.matchesSetlistUrl === 'function' && window.s2y.matchesSetlistUrl(window.location.href);
  if (shouldActivate){
    ensureButton();
  }

  // Allow manual activation via popup
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    if (message && message.type === 'S2Y_ACTIVATE'){
      ensureButton();
      sendResponse({ ok: true });
      return true;
    }
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
