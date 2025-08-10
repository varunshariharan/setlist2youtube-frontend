(function(){
  var logEl = document.getElementById('log');
  function log(msg){ logEl.textContent += (msg + '\n'); }

  document.getElementById('parseBtn').addEventListener('click', function(){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
      var tab = tabs && tabs[0];
      if (!tab) { log('No active tab.'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'S2Y_ACTIVATE' }, function(){
        log('Activated on current page.');
      });
    });
  });
})();
