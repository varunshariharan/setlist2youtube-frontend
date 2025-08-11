// MV3 background: handles playlist creation orchestration and state persistence
const API_BASE = 'https://setlist2youtube-backend.onrender.com';

// Job state management
let currentJob = null;
let keepAliveAlarm = null;

// Initialize keepalive alarm
chrome.alarms.create('s2y-keepalive', { periodInMinutes: 1 });

// Listen for alarm to keep service worker alive during jobs
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 's2y-keepalive' && currentJob && currentJob.status === 'running') {
    // Extend the alarm to keep the worker alive
    chrome.alarms.create('s2y-keepalive', { periodInMinutes: 1 });
  }
});

// Load job state from storage on startup
chrome.runtime.onStartup.addListener(loadJobState);
chrome.runtime.onInstalled.addListener(loadJobState);

async function loadJobState() {
  try {
    const result = await chrome.storage.local.get(['s2y_job']);
    if (result.s2y_job && result.s2y_job.status === 'running') {
      currentJob = result.s2y_job;
      console.log('Resuming job from storage:', currentJob);
      // Resume the job if it was running
      if (currentJob.progressIndex < currentJob.songs.length) {
        continueJob();
      }
    }
  } catch (e) {
    console.error('Failed to load job state:', e);
  }
}

async function saveJobState() {
  if (currentJob) {
    try {
      await chrome.storage.local.set({ s2y_job: currentJob });
    } catch (e) {
      console.error('Failed to save job state:', e);
    }
  }
}

function updateJobProgress(updates) {
  if (currentJob) {
    Object.assign(currentJob, updates);
    saveJobState();
    // Notify popup of progress
    chrome.runtime.sendMessage({ type: 'S2Y_PROGRESS', job: currentJob }).catch(() => {});
  }
}

async function getAccessToken() {
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

async function startPlaylistCreation(tabId) {
  if (currentJob && currentJob.status === 'running') {
    throw new Error('Another playlist creation is already in progress');
  }

  // Initialize new job
  currentJob = {
    status: 'starting',
    tabId: tabId,
    artist: null,
    songs: [],
    videoIds: [],
    progressIndex: 0,
    errors: [],
    startTime: Date.now()
  };
  saveJobState();

  try {
    // Get HTML from content script
    const [tab] = await chrome.tabs.query({ tabId });
    if (!tab || !tab.url || !tab.url.includes('setlist.fm')) {
      throw new Error('Please open a setlist.fm page first');
    }

    updateJobProgress({ status: 'parsing' });
    
    // Request HTML from content script
    const response = await chrome.tabs.sendMessage(tabId, { type: 'S2Y_GET_HTML' });
    
    // Handle error responses from content script
    if (!response) {
      throw new Error('No response from content script - script may not be injected');
    }
    
    if (response.error) {
      console.error('Content script error:', response.error, response.debug);
      throw new Error(`Content script error: ${response.error}`);
    }
    
    if (!response.html) {
      console.error('No HTML in response:', response);
      throw new Error('No HTML content received from page');
    }
    
    if (typeof response.html !== 'string' || response.html.trim().length === 0) {
      console.error('Invalid HTML response:', { type: typeof response.html, length: response.html?.length });
      throw new Error('Received empty or invalid HTML content');
    }
    
    console.log('Received HTML from content script, length:', response.html.length);

    // Parse setlist
    const parseRes = await fetch(API_BASE + '/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: response.html })
    });

    if (!parseRes.ok) {
      const errorText = await parseRes.text();
      throw new Error(`Parse API error: ${parseRes.status} - ${errorText}`);
    }

    const data = await parseRes.json();
    const songs = Array.isArray(data.songs) ? data.songs : [];
    
    if (songs.length === 0) {
      throw new Error('No songs found in setlist');
    }

    updateJobProgress({
      status: 'running',
      artist: data.artist,
      songs: songs
    });

    // Start searching for videos
    await searchVideos();

  } catch (error) {
    console.error('Failed to start playlist creation:', error);
    updateJobProgress({
      status: 'error',
      errors: [...(currentJob?.errors || []), error.message]
    });
  }
}

async function searchVideos() {
  if (!currentJob || currentJob.status !== 'searching') return;

  try {
    const token = await getAccessToken();
    updateJobProgress({ status: 'running' });

    for (let i = currentJob.progressIndex; i < currentJob.songs.length; i++) {
      const song = currentJob.songs[i];
      
      updateJobProgress({ 
        progressIndex: i,
        status: `searching_${i + 1}_${currentJob.songs.length}`
      });

      try {
        const res = await fetch(API_BASE + '/api/youtube/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            accessToken: token, 
            title: song.title, 
            artist: song.artist 
          })
        });

        if (res.ok) {
          const js = await res.json();
          if (js && js.videoId) {
            currentJob.videoIds.push(js.videoId);
            updateJobProgress({ videoIds: [...currentJob.videoIds] });
          } else {
            currentJob.errors.push(`Song not found: ${song.title} - ${song.artist}`);
            updateJobProgress({ errors: [...currentJob.errors] });
          }
        } else {
          currentJob.errors.push(`Search failed for ${song.title}: ${res.status}`);
          updateJobProgress({ errors: [...currentJob.errors] });
        }
      } catch (searchError) {
        currentJob.errors.push(`Search error for ${song.title}: ${searchError.message}`);
        updateJobProgress({ errors: [...currentJob.errors] });
      }
    }

    // All songs processed, create playlist
    if (currentJob.videoIds.length > 0) {
      await createPlaylist(token);
    } else {
      updateJobProgress({ 
        status: 'error',
        errors: [...currentJob.errors, 'No videos found for any songs']
      });
    }

  } catch (error) {
    console.error('Failed to search videos:', error);
    updateJobProgress({
      status: 'error',
      errors: [...(currentJob.errors || []), error.message]
    });
  }
}

async function createPlaylist(token) {
  if (!currentJob) return;

  try {
    updateJobProgress({ status: 'creating_playlist' });

    const playlistTitle = `${currentJob.artist || 'Artist'} – Setlist Playlist`;
    const playlistRes = await fetch(API_BASE + '/api/youtube/playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: token,
        title: playlistTitle,
        privacyStatus: 'unlisted',
        videoIds: currentJob.videoIds
      })
    });

    if (playlistRes.ok) {
      const playlistJson = await playlistRes.json();
      if (playlistJson && playlistJson.playlistId) {
        const url = 'https://www.youtube.com/playlist?list=' + playlistJson.playlistId;
        updateJobProgress({
          status: 'completed',
          playlistUrl: url,
          completedTime: Date.now()
        });
        
        // Open playlist in new tab
        chrome.tabs.create({ url });
      } else {
        throw new Error('Invalid playlist response');
      }
    } else {
      const errorText = await playlistRes.text();
      throw new Error(`Failed to create playlist: ${playlistRes.status} - ${errorText}`);
    }

  } catch (error) {
    console.error('Failed to create playlist:', error);
    updateJobProgress({
      status: 'error',
      errors: [...(currentJob.errors || []), error.message]
    });
  }
}

async function continueJob() {
  if (!currentJob || currentJob.status !== 'running') return;
  
  if (currentJob.progressIndex < currentJob.songs.length) {
    await searchVideos();
  }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'S2Y_START') {
    startPlaylistCreation(message.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'S2Y_STATUS') {
    sendResponse({ job: currentJob });
    return false;
  }
  
  if (message.type === 'S2Y_CLEAR') {
    currentJob = null;
    chrome.storage.local.remove(['s2y_job']);
    sendResponse({ success: true });
    return false;
  }
});

// Re-inject content script on SPA navigations
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  try {
    if (!details.tabId) return;
    chrome.scripting.executeScript({ target: { tabId: details.tabId }, files: ['contentScript.js'] });
  } catch (e) {
    // no-op
  }
}, { url: [{ hostEquals: 'www.setlist.fm' }] });

chrome.webNavigation.onCompleted.addListener((details) => {
  try {
    if (!details.tabId) return;
    chrome.scripting.executeScript({ target: { tabId: details.tabId }, files: ['contentScript.js'] });
  } catch (e) {
    // no-op
  }
}, { url: [{ hostEquals: 'www.setlist.fm' }] });
