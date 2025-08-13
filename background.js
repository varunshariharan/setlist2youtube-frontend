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
    // Ensure all update values are defined before applying
    const cleanUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && updates[key] !== null) {
        cleanUpdates[key] = updates[key];
      }
    });
    
    Object.assign(currentJob, cleanUpdates);
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

async function ensureContentScriptInjected(tabId) {
  try {
    // Try to send a ping message to see if content script is already there
    const pingResponse = await chrome.tabs.sendMessage(tabId, { type: 'S2Y_PING' });
    if (pingResponse && pingResponse.type === 'S2Y_PONG') {
      console.log('[CONTENT_SCRIPT] Content script already active');
      return true;
    }
  } catch (e) {
    console.log('[CONTENT_SCRIPT] Content script not responding, injecting...');
  }
  
  // Inject content script if not present
  try {
    const results = await chrome.scripting.executeScript({ 
      target: { tabId }, 
      files: ['contentScript.js'] 
    });
    
    if (results && results.length > 0) {
      console.log('[CONTENT_SCRIPT] Successfully injected content script');
      
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify injection worked
      try {
        const verifyResponse = await chrome.tabs.sendMessage(tabId, { type: 'S2Y_PING' });
        if (verifyResponse && verifyResponse.type === 'S2Y_PONG') {
          console.log('[CONTENT_SCRIPT] Content script verified and ready');
          return true;
        }
      } catch (e) {
        console.error('[CONTENT_SCRIPT] Content script still not responding after injection');
        throw new Error('Content script injection failed');
      }
    }
  } catch (e) {
    console.error('[CONTENT_SCRIPT] Failed to inject content script:', e);
    throw new Error('Could not inject content script');
  }
  
  return false;
}

async function startPlaylistCreation(tabId) {
  console.log('🚀 [START] startPlaylistCreation called with tabId:', tabId);
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
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || !tab.url.includes('setlist.fm')) {
      throw new Error('Please open a setlist.fm page first');
    }

    // Ensure content script is injected and ready
    try {
      await ensureContentScriptInjected(tabId);
    } catch (injectionError) {
      console.error('[CONTENT_SCRIPT] Injection failed:', injectionError);
      throw new Error(`Content script injection failed: ${injectionError.message}. Please refresh the page and try again.`);
    }

    updateJobProgress({ status: 'parsing' });
    
    // Request HTML from content script
    let response;
    try {
      response = await chrome.tabs.sendMessage(tabId, { type: 'S2Y_GET_HTML' });
    } catch (messageError) {
      console.error('[CONTENT_SCRIPT] Message failed:', messageError);
      throw new Error(`Could not communicate with content script: ${messageError.message}. Please refresh the page and try again.`);
    }
    
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
    console.log('🔍 [PARSE] Calling parse API...');
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
    console.log('📊 [PARSE] Parse response:', data);
    // Backend returns { success, data: { artist, songs }, stats }
    const parsed = data && data.data ? data.data : {};
    const songs = Array.isArray(parsed.songs) ? parsed.songs : [];
    
    console.log('🎵 [PARSE] Found songs:', songs.length, songs.map(s => s.title));
    
    if (songs.length === 0) {
      throw new Error('No songs found in setlist');
    }

    updateJobProgress({
      status: 'running',
      artist: parsed.artist,
      songs: songs
    });

    // Start searching for videos
    console.log('🎯 [SEARCH] Starting video search for', songs.length, 'songs');
    console.log('🎯 [SEARCH] Current job status:', currentJob.status);
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
  console.log('[DEBUG] searchVideos called with status:', currentJob?.status);
  if (!currentJob || (currentJob.status !== 'running' && currentJob.status !== 'searching')) {
    console.log('[DEBUG] searchVideos returning early - invalid status or no job');
    return;
  }

  try {
    console.log('[DEBUG] Getting access token...');
    const token = await getAccessToken();
    console.log('[DEBUG] Access token received, length:', token?.length);
    updateJobProgress({ status: 'running' });

    // Create a map to maintain song order
    const songVideoMap = new Map();
    const songErrors = [];
    
    for (let i = currentJob.progressIndex; i < currentJob.songs.length; i++) {
      const song = currentJob.songs[i];
      
      updateJobProgress({ 
        progressIndex: i,
        status: `searching_${i + 1}_${currentJob.songs.length}`
      });

      try {
        console.log('[DEBUG] Searching for song:', song.title, 'by', song.artist);
        const res = await fetch(API_BASE + '/api/youtube/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            accessToken: token, 
            title: song.title, 
            artist: song.artist,
            album: song.album // Pass album if available
          })
        });

        if (res.ok) {
          const js = await res.json();
          console.log('[DEBUG] YouTube search response:', js);
          
          if (js && js.success && js.data && js.data.videoId) {
            console.log('[DEBUG] Found video ID:', js.data.videoId, 'for song:', song.title);
            // Store video ID with song index to maintain order
            songVideoMap.set(i, js.data.videoId);
          } else {
            console.log('[DEBUG] No video ID found in response:', js);
            songErrors.push(`Song not found: ${song.title} - ${song.artist}`);
          }
        } else {
          const errorText = await res.text();
          console.log('[DEBUG] Search failed with status:', res.status, 'error:', errorText);
          songErrors.push(`Search failed for ${song.title}: ${res.status}`);
        }
      } catch (searchError) {
        songErrors.push(`Search error for ${song.title}: ${searchError.message}`);
      }
    }
    
    // Build videoIds array in correct song order
    currentJob.videoIds = [];
    for (let i = 0; i < currentJob.songs.length; i++) {
      if (songVideoMap.has(i)) {
        currentJob.videoIds.push(songVideoMap.get(i));
      }
    }
    
    // Update errors
    if (songErrors.length > 0) {
      currentJob.errors = [...(currentJob.errors || []), ...songErrors];
    }
    
    updateJobProgress({ 
      videoIds: [...currentJob.videoIds],
      errors: [...(currentJob.errors || [])]
    });

    // All songs processed, create playlist
    console.log('[DEBUG] Search complete. Found videos:', currentJob.videoIds.length, 'Errors:', currentJob.errors.length);
    
    if (currentJob.videoIds.length > 0) {
      console.log('[DEBUG] Creating playlist with', currentJob.videoIds.length, 'videos');
      await createPlaylist(token);
    } else {
      console.log('[DEBUG] No videos found, updating status to error');
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
      console.log('[DEBUG] Playlist creation response:', playlistJson);
      
      if (playlistJson && playlistJson.success && playlistJson.data && playlistJson.data.playlistId) {
        const url = 'https://www.youtube.com/playlist?list=' + playlistJson.data.playlistId;
        console.log('[DEBUG] Playlist created successfully, URL:', url);
        
        updateJobProgress({
          status: 'completed',
          playlistUrl: url,
          completedTime: Date.now()
        });
        
        // Open playlist in new tab
        chrome.tabs.create({ url });
      } else {
        console.log('[DEBUG] Invalid playlist response structure:', playlistJson);
        throw new Error('Invalid playlist response structure');
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
  console.log('📨 [MESSAGE] Received message:', message.type, 'from tab:', sender.tab?.id);
  
  if (message.type === 'S2Y_START') {
    console.log('🚀 [MESSAGE] Starting playlist creation for tab:', message.tabId);
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
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  try {
    if (!details.tabId) return;
    console.log('[CONTENT_SCRIPT] Injecting on history state update for tab:', details.tabId);
    
    const results = await chrome.scripting.executeScript({ 
      target: { tabId: details.tabId }, 
      files: ['contentScript.js'] 
    });
    
    if (results && results.length > 0) {
      console.log('[CONTENT_SCRIPT] Successfully injected on history state update');
    }
  } catch (e) {
    console.error('[CONTENT_SCRIPT] Failed to inject on history state update:', e);
  }
}, { url: [{ hostEquals: 'www.setlist.fm' }] });

chrome.webNavigation.onCompleted.addListener(async (details) => {
  try {
    if (!details.tabId) return;
    console.log('[CONTENT_SCRIPT] Injecting on navigation completed for tab:', details.tabId);
    
    const results = await chrome.scripting.executeScript({ 
      target: { tabId: details.tabId }, 
      files: ['contentScript.js'] 
    });
    
    if (results && results.length > 0) {
      console.log('[CONTENT_SCRIPT] Successfully injected on navigation completed');
    }
  } catch (e) {
    console.error('[CONTENT_SCRIPT] Failed to inject on navigation completed:', e);
  }
}, { url: [{ hostEquals: 'www.setlist.fm' }] });

