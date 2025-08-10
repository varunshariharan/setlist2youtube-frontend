(function(){
  function ensureButton(){
    if (window.s2y && typeof window.s2y.createConvertButton === 'function'){
      var btn = window.s2y.createConvertButton(document);
      btn.addEventListener('click', function(){
        // Placeholder: parsing and messaging to background/popup will be added later
        console.log('Setlist2YouTube: Convert clicked');
      });
    }
  }

  var shouldActivate = window.s2y && typeof window.s2y.matchesSetlistUrl === 'function' && window.s2y.matchesSetlistUrl(window.location.href);
  if (shouldActivate){
    ensureButton();
  }

  // Allow manual activation via popup
  chrome.runtime.onMessage.addListener(function(message){
    if (message && message.type === 'S2Y_ACTIVATE'){
      ensureButton();
    }
  });
})();
