
(function(){
  var logEl = document.getElementById('log');
  function log(msg){ logEl.textContent += (msg + '
'); }
  function val(id){ return document.getElementById(id).value; }

  function saveCfg(){
    localStorage.setItem('s2y_api_base', val('apiBase'));
    localStorage.setItem('s2y_access_token', val('accessToken'));
    localStorage.setItem('s2y_privacy', val('privacy'));
    log('Saved config.');
  }

  
  async function getAccessToken(){
    return new Promise((resolve, reject) => {
      try {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (!token) return reject(new Error('No token'));
          resolve(token);
        });
      } catch (e) { reject(e); }
    });
  }

  function loadCfg(){
    document.getElementById('apiBase').value = localStorage.getItem('s2y_api_base') || 'http://localhost:4000';
    document.getElementById('accessToken').value = localStorage.getItem('s2y_access_token') || '';
    document.getElementById('privacy').value = localStorage.getItem('s2y_privacy') || 'unlisted';
  }

  function withActiveTab(cb){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){ cb(tabs && tabs[0]); });
  }

  document.getElementById('saveCfg').addEventListener('click', saveCfg);

  /* removed signIn */
    try {
      const res = await signInWithGoogle(["https://www.googleapis.com/auth/youtube"]);
      
      
      log('Signed in successfully.');
    } catch (e) {
      log('Sign-in failed: ' + (e && e.message || e));
    }
  });


  document.getElementById('parseBtn').addEventListener('click', function(){
    withActiveTab(function(tab){
      if (!tab) { log('No active tab.'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'S2Y_ACTIVATE' }, function(){
        log('Activated on current page.');
      });
    });
  });

  document.getElementById('createBtn').addEventListener('click', function(){
    const apiBase = val('apiBase');
    const privacy = val('privacy');

    withActiveTab(function(tab){
      if (!tab) { log('No active tab.'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'S2Y_GET_HTML' }, function(payload){
        if (!payload || !payload.html){ log('Failed to read page HTML.'); return; }
        fetch(apiBase + '/api/parse', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ html: payload.html }) })
          .then(r => r.json())
          .then(async data => {
            log('Parsed setlist for ' + data.artist + ' with ' + (data.songs||[]).length + ' songs.');
            // Search videos sequentially
            const videoIds = [];
            for (const song of (data.songs||[])){
              const q = { accessToken: token, title: song.title, artist: song.artist };
              const token = await getAccessToken();
            const res = await fetch(apiBase + '/api/youtube/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(q) });
              const js = await res.json();
              if (js && js.videoId){ videoIds.push(js.videoId); }
              log('Search ' + song.title + ' -> ' + (js.videoId || 'not found'));
            }
            const title = `${data.artist} – Setlist at ${data.venue}, ${data.date}`;
            const playlistRes = await fetch(apiBase + '/api/youtube/playlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accessToken: token, title, privacyStatus: privacy, videoIds }) });
            const playlistJson = await playlistRes.json();
            if (playlistJson && playlistJson.playlistId){
              log('✅ Playlist created: ' + playlistJson.playlistId);
            } else {
              log('⚠ Failed to create playlist.');
            }
          })
          .catch(err => { log('Error: ' + err.message); });
      });
    });
  });

  loadCfg();
})();
