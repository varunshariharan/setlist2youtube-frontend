
(function(){
  const API_BASE = 'https://setlist2youtube-backend.onrender.com';
  let s2yLogs = [];
  let s2yUnfound = [];
  
  var logEl = document.getElementById('log');
  function log(msg){ logEl.textContent += (msg + "\n"); s2yLogs.push(msg); logEl.scrollTop = logEl.scrollHeight; }
  function clearLog(){ logEl.textContent = ''; s2yLogs = []; s2yUnfound = []; }

  async function getAccessToken(){
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!token) {
          reject(new Error('No access token received'));
          return;
        }
        resolve(token);
      });
    });
  }

  function withActiveTab(cb){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){ cb(tabs && tabs[0]); });
  }

  document.getElementById('createBtn').addEventListener('click', async function(){
    clearLog();
    log('Starting playlist creation...');
    let token;
    try {
      token = await getAccessToken();
      log('✓ Authenticated with Google');
    } catch (e) {
      log('❌ Auth failed: ' + (e && e.message || e));
      return;
    }

    withActiveTab(function(tab){
      if (!tab) { log('❌ No active tab'); return; }
      if (!tab.url || !tab.url.includes('setlist.fm')) {
        log('❌ Please open a setlist.fm page first');
        return;
      }
      
      chrome.tabs.sendMessage(tab.id, { type: 'S2Y_GET_HTML' }, async function(payload){
        if (!payload || !payload.html){ 
          log('❌ Failed to read page HTML');
          log('Debug: Make sure you are on a setlist.fm page and the extension is loaded properly');
          return; 
        }
        
        try {
          log('📄 Parsing setlist...');
          const parseRes = await fetch(API_BASE + '/api/parse', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ html: payload.html }) 
          });
          
          if (!parseRes.ok){ 
            const errorText = await parseRes.text();
            log('❌ Parse API error: ' + parseRes.status);
            log('Error details: ' + errorText);
            return;
          }
          
          const data = await parseRes.json();
          const songs = Array.isArray(data.songs) ? data.songs : [];
          log('✓ Found ' + songs.length + ' songs for ' + (data.artist || 'Unknown Artist'));

          if (songs.length === 0) {
            log('❌ No songs found in setlist');
            log('This might be a page layout we do not support yet');
            return;
          }

          const videoIds = [];
          let idx = 0;
          for (const song of songs){
            idx += 1;
            log('🔍 [' + idx + '/' + songs.length + '] ' + song.title + ' – ' + song.artist);
            
            try {
              const res = await fetch(API_BASE + '/api/youtube/search', { 
                method:'POST', 
                headers:{'Content-Type':'application/json'}, 
                body: JSON.stringify({ accessToken: token, title: song.title, artist: song.artist }) 
              });
              
              if (res.ok) {
                const js = await res.json();
                if (js && js.videoId){ 
                  videoIds.push(js.videoId); 
                  log('  ✓ Found video');
                } else { 
                  log('  ❌ Not found'); 
                  s2yUnfound.push(song);
                }
              } else {
                log('  ❌ Search failed: ' + res.status);
                s2yUnfound.push(song);
              }
            } catch (searchError) {
              log('  ❌ Search error: ' + (searchError && searchError.message || searchError));
              s2yUnfound.push(song);
            }
          }

          if (videoIds.length === 0) {
            log('❌ No videos found for any songs');
            return;
          }

          const playlistTitle = `${data.artist || 'Artist'} – Setlist Playlist`;
          log('🎵 Creating playlist: ' + playlistTitle);
          const playlistRes = await fetch(API_BASE + '/api/youtube/playlist', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ 
              accessToken: token, 
              title: playlistTitle, 
              privacyStatus: 'unlisted', 
              videoIds 
            }) 
          });
          
          if (playlistRes.ok) {
            const playlistJson = await playlistRes.json();
            if (playlistJson && playlistJson.playlistId){
              const url = 'https://www.youtube.com/playlist?list=' + playlistJson.playlistId;
              log('✅ Success! Opening playlist...');
              if (s2yUnfound.length > 0) {
                log('⚠️  ' + s2yUnfound.length + ' songs not found');
              }
              chrome.tabs.create({ url });
            } else {
              log('❌ Failed to create playlist - invalid response');
            }
          } else {
            const errorText = await playlistRes.text();
            log('❌ Failed to create playlist: ' + playlistRes.status);
            log('Error: ' + errorText);
          }
        } catch (e) {
          log('❌ Error: ' + (e && e.message || e));
          console.error('Full error:', e);
        }
      });
    });
  });
})();
