
(function(){
  let currentJob = null;
  let progressListener = null;
  
  const logEl = document.getElementById('log');
  const createBtn = document.getElementById('createBtn');
  const clearBtn = document.getElementById('clearBtn');
  
  function log(msg){ 
    logEl.textContent += (msg + "\n"); 
    logEl.scrollTop = logEl.scrollHeight; 
  }
  
  function clearLog(){ 
    logEl.textContent = ''; 
  }

  function updateButtonState() {
    if (currentJob && (currentJob.status === 'starting' || currentJob.status === 'parsing' || 
                       currentJob.status === 'running' || currentJob.status === 'creating_playlist')) {
      createBtn.disabled = true;
      createBtn.textContent = 'Creating Playlist...';
    } else {
      createBtn.disabled = false;
      createBtn.textContent = 'Create Playlist';
    }
    
    if (currentJob) {
      clearBtn.style.display = 'inline-block';
    } else {
      clearBtn.style.display = 'none';
    }
  }

  function displayJobStatus() {
    if (!currentJob) {
      clearLog();
      log('No active playlist creation job.');
      return;
    }

    clearLog();
    
    // Display current status
    switch (currentJob.status) {
      case 'starting':
        log('🚀 Starting playlist creation...');
        break;
      case 'parsing':
        log('📄 Parsing setlist...');
        break;
      case 'running':
        log('🔍 Searching for videos...');
        if (currentJob.songs && currentJob.songs.length > 0) {
          log(`✓ Found ${currentJob.songs.length} songs for ${currentJob.artist || 'Unknown Artist'}`);
        }
        break;
      case 'creating_playlist':
        log('🎵 Creating YouTube playlist...');
        break;
      case 'completed':
        log('✅ Playlist created successfully!');
        if (currentJob.playlistUrl) {
          log(`🔗 Playlist URL: ${currentJob.playlistUrl}`);
        }
        if (currentJob.videoIds && currentJob.videoIds.length > 0) {
          log(`📹 ${currentJob.videoIds.length} videos added to playlist`);
        }
        break;
      case 'error':
        log('❌ Playlist creation failed');
        break;
    }

    // Display progress if searching
    if (currentJob.status && currentJob.status.startsWith('searching_')) {
      const match = currentJob.status.match(/searching_(\d+)_(\d+)/);
      if (match) {
        const current = parseInt(match[1]);
        const total = parseInt(match[2]);
        log(`🔍 Progress: ${current}/${total} songs processed`);
      }
    }

    // Display found videos
    if (currentJob.videoIds && currentJob.videoIds.length > 0) {
      log(`\n📹 Videos found: ${currentJob.videoIds.length}`);
    }

    // Display errors if any
    if (currentJob.errors && currentJob.errors.length > 0) {
      log(`\n⚠️ Errors encountered:`);
      currentJob.errors.forEach(error => log(`  • ${error}`));
    }

    // Display timing info
    if (currentJob.startTime) {
      const elapsed = Math.round((Date.now() - currentJob.startTime) / 1000);
      log(`\n⏱️ Elapsed time: ${elapsed}s`);
    }

    updateButtonState();
  }

  async function getJobStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'S2Y_STATUS' });
      currentJob = response.job;
      displayJobStatus();
    } catch (e) {
      console.error('Failed to get job status:', e);
      if (e.message && e.message.includes('Receiving end does not exist')) {
        log('⚠️ Extension connection error. Try reloading the extension.');
        log('💡 Go to chrome://extensions/ and click reload for Setlist2YouTube');
      }
    }
  }

  function setupProgressListener() {
    // Remove existing listener
    if (progressListener) {
      chrome.runtime.onMessage.removeListener(progressListener);
    }

    // Set up new listener for progress updates
    progressListener = (message) => {
      if (message.type === 'S2Y_PROGRESS') {
        currentJob = message.job;
        displayJobStatus();
      }
    };

    chrome.runtime.onMessage.addListener(progressListener);
  }

  async function startPlaylistCreation() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        log('❌ No active tab');
        return;
      }

      if (!tab.url || !tab.url.includes('setlist.fm')) {
        log('❌ Please open a setlist.fm page first');
        return;
      }

      // Send start command to background
      const response = await chrome.runtime.sendMessage({ 
        type: 'S2Y_START', 
        tabId: tab.id 
      });

      if (response.success) {
        log('🚀 Playlist creation started in background');
        log('You can now navigate to other tabs - the job will continue running');
        // Get updated status
        await getJobStatus();
      } else {
        log('❌ Failed to start playlist creation: ' + (response.error || 'Unknown error'));
      }

    } catch (e) {
      log('❌ Error starting playlist creation: ' + (e && e.message || e));
      if (e.message && e.message.includes('Receiving end does not exist')) {
        log('');
        log('🔧 Connection Error Detected:');
        log('1. Go to chrome://extensions/');
        log('2. Find "Setlist2YouTube" extension');
        log('3. Click the "Reload" button 🔄');
        log('4. Refresh this setlist.fm page');
        log('5. Try again');
      }
    }
  }

  async function clearJob() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'S2Y_CLEAR' });
      if (response.success) {
        currentJob = null;
        displayJobStatus();
      }
    } catch (e) {
      console.error('Failed to clear job:', e);
    }
  }

  // Event listeners
  createBtn.addEventListener('click', startPlaylistCreation);
  clearBtn.addEventListener('click', clearJob);

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    // Set up progress listener
    setupProgressListener();
    
    // Get current job status
    await getJobStatus();
    
    // Set up periodic status check (fallback)
    setInterval(getJobStatus, 2000);
  });

  // Clean up listener when popup closes
  window.addEventListener('unload', () => {
    if (progressListener) {
      chrome.runtime.onMessage.removeListener(progressListener);
    }
  });
})();
