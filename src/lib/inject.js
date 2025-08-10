(function(global){
  function matchesSetlistUrl(urlString){
    try {
      var url = new URL(urlString);
      var path = (url.pathname || '').toLowerCase();
      return path.includes('setlist') || path.includes('stats');
    } catch (e) {
      return false;
    }
  }

  function createConvertButton(doc){
    var documentRef = doc || document;
    if (documentRef.getElementById('s2y-convert-btn')) return documentRef.getElementById('s2y-convert-btn');
    var btn = documentRef.createElement('button');
    btn.id = 's2y-convert-btn';
    btn.textContent = '🎵 Convert to YouTube Playlist';
    btn.style.position = 'fixed';
    btn.style.right = '16px';
    btn.style.bottom = '16px';
    btn.style.zIndex = '2147483647';
    btn.style.padding = '10px 14px';
    btn.style.fontSize = '14px';
    btn.style.borderRadius = '8px';
    btn.style.border = 'none';
    btn.style.background = '#FF0033';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    documentRef.body.appendChild(btn);
    return btn;
  }

  // Expose for browser and tests
  global.s2y = global.s2y || {};
  global.s2y.matchesSetlistUrl = matchesSetlistUrl;
  global.s2y.createConvertButton = createConvertButton;

  if (typeof module !== 'undefined' && module.exports){
    module.exports = { matchesSetlistUrl, createConvertButton };
  }
})(typeof window !== 'undefined' ? window : global);
