
(function(){
  const API_BASE = 'https://setlist2youtube-backend.onrender.com';
  let s2yLogs = [];
  let s2yUnfound = [];
  
  var logEl = document.getElementById('log');
  function log(msg){ logEl.textContent += (msg + "\n"); s2yLogs.push(msg); logEl.scrollTop = logEl.scrollHeight; }
  function clearLog(){ logEl.textContent = ''; s2yLogs = []; s2yUnfound = []; }

  async function getAccessToken(){
    return new Promise((resolve, reject) => {
      const redirectUrl = chrome.identity.getRedirectURL();
      const clientId = '945658462648-56p9aknbjm8omo6crqer91dftr4rcejk.apps.googleusercontent.com';
      const scopes = 'https://www.googleapis.com/auth/youtube';
      const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${encodeURIComponent(scopes)}`;
      
      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!responseUrl) {
          reject(new Error('No response URL'));
          return;
        }
        // Extract access_token from URL hash
        const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
        const accessToken = urlParams.get('access_token');
        if (accessToken) {
          resolve(accessToken);
        } else {
          reject(new Error('No access token in response'));
        }
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
        if (!payload || !payload.html){ log('❌ Failed to read page HTML'); return; }
        try {
          log('📄 Parsing setlist...');
          const parseRes = await fetch(API_BASE + '/api/parse', { 
            method:'POST', 
            headers:{'Content-Type':'application/json'}, 
            body: JSON.stringify({ html: payload.html }) 
          });
          if (!parseRes.ok){ throw new Error('Parse failed: ' + parseRes.status); }
          const data = await parseRes.json();
          const songs = Array.isArray(data.songs) ? data.songs : [];
          log('✓ Found ' + songs.length + ' songs for ' + (data.artist || 'Unknown Artist'));

          if (songs.length === 0) {
            log('❌ No songs found in setlist');
            return;
          }

          const videoIds = [];
          let idx = 0;
          for (const song of songs){
            idx += 1;
            log('🔍 [' + idx + '/' + songs.length + '] ' + song.title + ' – ' + song.artist);
            const res = await fetch(API_BASE + '/api/youtube/search', { 
              method:'POST', 
              headers:{'Content-Type':'application/json'}, 
              body: JSON.stringify({ accessToken: token, title: song.title, artist: song.artist }) 
            });
            const js = await res.json();
            if (js && js.videoId){ 
              videoIds.push(js.videoId); 
              log('  ✓ Found video');
            } else { 
              log('  ❌ Not found'); 
              s2yUnfound.push(song);
            }
          }

          if (videoIds.length === 0) {
            log('❌ No videos found for any songs');
            return;
          }

          const playlistTitle = `${data.artist || 'Artist'} – Setlist at ${data.venue || 'Venue'}, ${data.date || ''}`.trim();
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
          const playlistJson = await playlistRes.json();
          if (playlistJson && playlistJson.playlistId){
            const url = 'https://www.youtube.com/playlist?list=' + playlistJson.playlistId;
            log('✅ Success! Opening playlist...');
            if (s2yUnfound.length > 0) {
              log('⚠️  ' + s2yUnfound.length + ' songs not found');
            }
            chrome.tabs.create({ url });
          } else {
            log('❌ Failed to create playlist');
          }
        } catch (e) {
          log('❌ Error: ' + (e && e.message || e));
        }
      });
    });
  });
})();
