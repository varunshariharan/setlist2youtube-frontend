
(function(){
  let s2yLogs = [];
  let s2yUnfound = [];
  var logEl = document.getElementById('log');
  function log(msg){ logEl.textContent += (msg + '
'); }
  function clearLog(){ logEl.textContent = ''; }
  function val(id){ return document.getElementById(id).value; }

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

  function saveCfg(){
    localStorage.setItem('s2y_api_base', val('apiBase'));
    localStorage.setItem('s2y_privacy', val('privacy'));
    log('Saved config.');
  }

  function loadCfg(){
    document.getElementById('apiBase').value = localStorage.getItem('s2y_api_base') || 'http://localhost:4000';
    document.getElementById('privacy').value = localStorage.getItem('s2y_privacy') || 'unlisted';
  }

  function withActiveTab(cb){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){ cb(tabs && tabs[0]); });
  }

  document.getElementById('saveCfg').addEventListener('click', saveCfg);

  
  document.getElementById('viewLogs').addEventListener('click', async function(){
    try {
      await navigator.clipboard.writeText(s2yLogs.join('
'));
      log('Logs copied to clipboard.');
    } catch(e){ log('Failed to copy logs.'); }
  });

  document.getElementById('retryBtn').addEventListener('click', async function(){
    const apiBase = document.getElementById('apiBase').value;
    const privacy = document.getElementById('privacy').value;
    let token;
    try { token = await getAccessToken(); } catch(e){ log('Auth error: ' + (e && e.message || e)); return; }
    if (!Array.isArray(s2yUnfound) || s2yUnfound.length === 0){ log('No unfound songs to retry.'); return; }

    const videoIds = [];
    let idx = 0;
    for (const song of s2yUnfound){
      idx += 1;
      log('[Retry ' + idx + '/' + s2yUnfound.length + '] ' + song.title + ' – ' + song.artist);
      const res = await fetch(apiBase + '/api/youtube/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accessToken: token, title: song.title, artist: song.artist }) });
      const js = await res.json();
      if (js && js.videoId){ videoIds.push(js.videoId); log('  ✓ ' + js.videoId); } else { log('  ✗ not found'); s2yUnfound.push(song); }
    }
    if (videoIds.length === 0){ log('No matches found on retry.'); return; }
    const title = 'Supplemental Setlist Videos';
    const playlistRes = await fetch(apiBase + '/api/youtube/playlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accessToken: token, title, privacyStatus: privacy, videoIds }) });
    const playlistJson = await playlistRes.json();
    if (playlistJson && playlistJson.playlistId){
      const url = 'https://www.youtube.com/playlist?list=' + playlistJson.playlistId;
      log('✅ Supplemental playlist created: ' + url);
      chrome.tabs.create({ url });
    } else {
      log('⚠ Failed to create supplemental playlist.');
    }
  });

  document.getElementById('parseBtn').addEventListener('click', function(){
    withActiveTab(function(tab){
      if (!tab) { log('No active tab.'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'S2Y_GET_HTML' }, function(payload){
        if (!payload || !payload.html){ log('Failed to read page HTML.'); return; }
        log('HTML read OK (' + payload.html.length + ' chars).');
      });
    });
  });

  document.getElementById('createBtn').addEventListener('click', async function(){
    clearLog();
    const apiBase = val('apiBase');
    const privacy = val('privacy');
    log('Starting…');
    let token;
    try {
      token = await getAccessToken();
      log('Got access token.');
    } catch (e) {
      log('Auth error: ' + (e && e.message || e));
      return;
    }

    withActiveTab(function(tab){
      if (!tab) { log('No active tab.'); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'S2Y_GET_HTML' }, async function(payload){
        if (!payload || !payload.html){ log('Failed to read page HTML.'); return; }
        try {
          log('Parsing setlist…');
          const parseRes = await fetch(apiBase + '/api/parse', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ html: payload.html }) });
          if (!parseRes.ok){ throw new Error('Parse failed: ' + parseRes.status); }
          const data = await parseRes.json();
          const songs = Array.isArray(data.songs) ? data.songs : [];
          log('Parsed ' + songs.length + ' songs for ' + (data.artist || 'Unknown Artist'));

          const videoIds = [];
          let idx = 0;
          for (const song of songs){
            idx += 1;
            log('Searching [' + idx + '/' + songs.length + ']: ' + song.title + ' – ' + song.artist);
            const res = await fetch(apiBase + '/api/youtube/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accessToken: token, title: song.title, artist: song.artist }) });
            const js = await res.json();
            if (js && js.videoId){ videoIds.push(js.videoId); log('  ✓ ' + js.videoId); } else { log('  ✗ not found'); s2yUnfound.push(song); }
          }

          const playlistTitle = `${data.artist || 'Artist'} – Setlist at ${data.venue || 'Venue'}, ${data.date || ''}`.trim();
          log('Creating playlist: ' + playlistTitle);
          const playlistRes = await fetch(apiBase + '/api/youtube/playlist', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ accessToken: token, title: playlistTitle, privacyStatus: privacy, videoIds }) });
          const playlistJson = await playlistRes.json();
          if (playlistJson && playlistJson.playlistId){
            const url = 'https://www.youtube.com/playlist?list=' + playlistJson.playlistId;
            log('✅ Playlist created: ' + url);
            chrome.tabs.create({ url });
          } else {
            log('⚠ Failed to create playlist.');
          }
        } catch (e) {
          log('Error: ' + (e && e.message || e));
        }
      });
    });
  });

  loadCfg();
})();
