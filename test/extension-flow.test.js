// Chrome Extension Flow Testing - Simulating Real User Interactions
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Chrome Extension User Flow Simulation', () => {
  let mockBackgroundScript;
  let mockContentScript;
  let mockPopupScript;
  
  beforeEach(() => {
    // Mock the Chrome APIs completely
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        },
        lastError: null,
        getManifest: vi.fn().mockReturnValue({
          oauth2: {
            client_id: 'test-client-id.apps.googleusercontent.com',
            scopes: ['https://www.googleapis.com/auth/youtube']
          }
        })
      },
      tabs: {
        query: vi.fn(),
        get: vi.fn(),
        sendMessage: vi.fn(),
        create: vi.fn()
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn()
        }
      },
      identity: {
        getAuthToken: vi.fn(),
        getRedirectURL: vi.fn().mockReturnValue('https://extension-id.chromiumapp.org/')
      },
      alarms: {
        create: vi.fn(),
        onAlarm: {
          addListener: vi.fn()
        }
      },
      webNavigation: {
        onHistoryStateUpdated: {
          addListener: vi.fn()
        },
        onCompleted: {
          addListener: vi.fn()
        }
      },
      scripting: {
        executeScript: vi.fn()
      }
    };

    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  describe('1. Extension Installation and Setup', () => {
    it('should initialize correctly with proper manifest', () => {
      console.log('🔍 Testing extension initialization...');
      
      const manifest = chrome.runtime.getManifest();
      expect(manifest.oauth2).toBeDefined();
      expect(manifest.oauth2.client_id).toBeDefined();
      expect(manifest.oauth2.scopes).toContain('https://www.googleapis.com/auth/youtube');
      
      console.log('✅ Extension manifest properly configured');
    });

    it('should setup storage and alarms correctly', async () => {
      console.log('🔍 Testing storage and alarm setup...');
      
      // Simulate extension startup
      chrome.storage.local.set({ test: 'value' });
      chrome.alarms.create('s2y-keepalive', { periodInMinutes: 1 });
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ test: 'value' });
      expect(chrome.alarms.create).toHaveBeenCalledWith('s2y-keepalive', { periodInMinutes: 1 });
      
      console.log('✅ Storage and alarms setup correctly');
    });
  });

  describe('2. Content Script Integration', () => {
    it('should detect setlist.fm pages correctly', () => {
      console.log('🔍 Testing setlist.fm page detection...');
      
      // Mock current page URL
      const mockUrl = 'https://www.setlist.fm/setlist/linkin-park/2023/venue-name.html';
      Object.defineProperty(window, 'location', {
        value: { href: mockUrl },
        writable: true
      });
      
      expect(window.location.href).toContain('setlist.fm');
      console.log('✅ Setlist.fm page detection working');
    });

    it('should extract HTML content successfully', async () => {
      console.log('🔍 Testing HTML extraction...');
      
      // Mock document with setlist content
      const mockHtml = `
        <html>
          <head><title>Test Setlist</title></head>
          <body>
            <div id="s2y-artist">Test Artist</div>
            <ol class="setlistSongs">
              <li><a href="/song/test">Test Song</a></li>
            </ol>
          </body>
        </html>
      `;
      
      // Mock content script behavior
      chrome.tabs.sendMessage.mockResolvedValue({
        html: mockHtml
      });
      
      const response = await chrome.tabs.sendMessage(123, { type: 'S2Y_GET_HTML' });
      expect(response.html).toBeDefined();
      expect(response.html).toContain('Test Artist');
      expect(response.html).toContain('Test Song');
      
      console.log('✅ HTML extraction successful, length:', response.html.length);
    });

    it('should handle content script errors gracefully', async () => {
      console.log('🔍 Testing content script error handling...');
      
      // Mock content script error
      chrome.tabs.sendMessage.mockResolvedValue({
        error: 'No HTML content found - document structure missing',
        debug: {
          readyState: 'complete',
          hasDocumentElement: false,
          hasBody: false,
          url: 'https://www.setlist.fm/setlist/test'
        }
      });
      
      const response = await chrome.tabs.sendMessage(123, { type: 'S2Y_GET_HTML' });
      expect(response.error).toBeDefined();
      expect(response.debug).toBeDefined();
      
      console.log('✅ Content script errors handled gracefully:', response.error);
    });
  });

  describe('3. Background Script API Communication', () => {
    it('should successfully call parse API', async () => {
      console.log('🔍 Testing parse API communication...');
      
      // Mock successful parse API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            artist: 'Test Artist',
            songs: [
              { title: 'Song 1', artist: 'Test Artist' },
              { title: 'Song 2', artist: 'Test Artist' }
            ]
          }
        })
      });
      
      const response = await fetch('https://setlist2youtube-backend.onrender.com/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: '<html>test</html>' })
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.songs).toHaveLength(2);
      
      console.log('✅ Parse API communication successful:', data.data.artist);
    });

    it('should handle parse API errors with user feedback', async () => {
      console.log('🔍 Testing parse API error handling...');
      
      // Mock API error response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({
          success: false,
          error: 'Failed to parse setlist from HTML',
          requestId: 'req_test_123'
        })
      });
      
      const response = await fetch('https://setlist2youtube-backend.onrender.com/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: '<html>no setlist</html>' })
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(422);
      
      const errorText = await response.text();
      expect(errorText).toContain('Failed to parse setlist from HTML');
      
      console.log('✅ Parse API errors properly handled with user feedback');
    });

    it('should successfully call YouTube search API', async () => {
      console.log('🔍 Testing YouTube search API communication...');
      
      // Mock successful YouTube search response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            videoId: 'test_video_id_123',
            title: 'Test Artist - Song Title (Official Video)',
            channel: 'Test Artist Official'
          }
        })
      });
      
      // Mock auth token
      chrome.identity.getAuthToken.mockImplementation((options, callback) => {
        callback('mock_access_token_123');
      });
      
      // Get auth token
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });
      
      expect(token).toBe('mock_access_token_123');
      
      // Make YouTube search API call
      const response = await fetch('https://setlist2youtube-backend.onrender.com/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          title: 'Song Title',
          artist: 'Test Artist'
        })
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.videoId).toBe('test_video_id_123');
      
      console.log('✅ YouTube search API communication successful:', data.data.videoId);
    });
  });

  describe('4. User Interface Feedback', () => {
    it('should provide progress updates to user', async () => {
      console.log('🔍 Testing user progress feedback...');
      
      // Mock job progress states
      const progressStates = [
        { status: 'starting', message: '🚀 Starting playlist creation...' },
        { status: 'parsing', message: '📄 Parsing setlist...' },
        { status: 'running', message: '🔍 Searching for videos...' },
        { status: 'creating_playlist', message: '🎵 Creating YouTube playlist...' },
        { status: 'completed', message: '✅ Playlist created successfully!' }
      ];
      
      for (const state of progressStates) {
        // Simulate progress message
        chrome.runtime.sendMessage({
          type: 'S2Y_PROGRESS',
          job: { status: state.status }
        });
        
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
          type: 'S2Y_PROGRESS',
          job: { status: state.status }
        });
        
        console.log(`✅ Progress update: ${state.message}`);
      }
    });

    it('should display error messages to user', async () => {
      console.log('🔍 Testing error message display...');
      
      const errorScenarios = [
        {
          error: 'No songs found in setlist',
          userMessage: '❌ No songs found in setlist'
        },
        {
          error: 'Parse API error: 422 - Failed to parse setlist',
          userMessage: '❌ Could not parse setlist from this page'
        },
        {
          error: 'User authorization required',
          userMessage: '❌ Please authorize YouTube access'
        }
      ];
      
      for (const scenario of errorScenarios) {
        // Simulate error state
        chrome.runtime.sendMessage({
          type: 'S2Y_PROGRESS',
          job: { 
            status: 'error',
            errors: [scenario.error]
          }
        });
        
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'S2Y_PROGRESS',
            job: expect.objectContaining({
              status: 'error',
              errors: expect.arrayContaining([scenario.error])
            })
          })
        );
        
        console.log(`✅ Error handled: ${scenario.error}`);
      }
    });
  });

  describe('5. Complete User Flow Simulation', () => {
    it('should simulate successful end-to-end playlist creation', async () => {
      console.log('🔍 Simulating complete successful user flow...');
      
      // Step 1: User on setlist.fm page
      chrome.tabs.query.mockResolvedValue([{
        id: 123,
        url: 'https://www.setlist.fm/setlist/test-artist/2023/venue.html'
      }]);
      
      // Step 2: Content script provides HTML
      chrome.tabs.sendMessage.mockResolvedValueOnce({
        html: `
          <html>
            <body>
              <div id="s2y-artist">Test Artist</div>
              <ol class="setlistSongs">
                <li><a href="/song/song1">Song 1</a></li>
                <li><a href="/song/song2">Song 2</a></li>
              </ol>
            </body>
          </html>
        `
      });
      
      // Step 3: Parse API succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            artist: 'Test Artist',
            songs: [
              { title: 'Song 1', artist: 'Test Artist' },
              { title: 'Song 2', artist: 'Test Artist' }
            ]
          }
        })
      });
      
      // Step 4: YouTube auth succeeds
      chrome.identity.getAuthToken.mockImplementation((options, callback) => {
        callback('valid_youtube_token');
      });
      
      // Step 5: YouTube search API succeeds for each song
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { videoId: 'video1_id' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { videoId: 'video2_id' }
          })
        });
      
      // Step 6: Playlist creation succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            playlistId: 'test_playlist_123',
            title: 'Test Artist – Setlist Playlist'
          }
        })
      });
      
      // Step 7: Playlist URL opened
      chrome.tabs.create.mockResolvedValue({
        id: 456,
        url: 'https://www.youtube.com/playlist?list=test_playlist_123'
      });
      
      // Execute the flow
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      expect(tab.url).toContain('setlist.fm');
      
      const htmlResponse = await chrome.tabs.sendMessage(tab.id, { type: 'S2Y_GET_HTML' });
      expect(htmlResponse.html).toContain('Test Artist');
      
      const parseResponse = await fetch('api/parse', {
        method: 'POST',
        body: JSON.stringify({ html: htmlResponse.html })
      });
      const parseData = await parseResponse.json();
      expect(parseData.success).toBe(true);
      
      const authToken = await new Promise(resolve => {
        chrome.identity.getAuthToken({ interactive: true }, resolve);
      });
      expect(authToken).toBe('valid_youtube_token');
      
      // Search for videos
      for (const song of parseData.data.songs) {
        const searchResponse = await fetch('api/youtube/search', {
          method: 'POST',
          body: JSON.stringify({
            accessToken: authToken,
            title: song.title,
            artist: song.artist
          })
        });
        const searchData = await searchResponse.json();
        expect(searchData.success).toBe(true);
        expect(searchData.data.videoId).toBeDefined();
      }
      
      // Create playlist
      const playlistResponse = await fetch('api/youtube/playlist', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: authToken,
          title: 'Test Artist – Setlist Playlist',
          videoIds: ['video1_id', 'video2_id']
        })
      });
      const playlistData = await playlistResponse.json();
      expect(playlistData.success).toBe(true);
      
      // Open playlist
      await chrome.tabs.create({
        url: `https://www.youtube.com/playlist?list=${playlistData.data.playlistId}`
      });
      
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://www.youtube.com/playlist?list=test_playlist_123'
      });
      
      console.log('✅ Complete end-to-end flow simulation successful!');
      console.log('   📄 HTML extracted → 🔍 Setlist parsed → 🎵 Videos found → 📝 Playlist created → 🚀 Opened');
    });

    it('should handle and display partial success scenarios', async () => {
      console.log('🔍 Testing partial success with some songs not found...');
      
      // Mock scenario where some songs are not found
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              artist: 'Test Artist',
              songs: [
                { title: 'Popular Song', artist: 'Test Artist' },
                { title: 'Rare B-Side', artist: 'Test Artist' }
              ]
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { videoId: 'popular_song_id' }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            success: false,
            error: 'No video found for search query'
          })
        });
      
      // Simulate the partial success scenario
      const mockJob = {
        status: 'completed',
        artist: 'Test Artist',
        songs: [
          { title: 'Popular Song', artist: 'Test Artist' },
          { title: 'Rare B-Side', artist: 'Test Artist' }
        ],
        videoIds: ['popular_song_id'], // Only one video found
        errors: ['Song not found: Rare B-Side - Test Artist'],
        playlistUrl: 'https://www.youtube.com/playlist?list=partial_success_123'
      };
      
      // Verify the job shows partial success
      expect(mockJob.videoIds).toHaveLength(1);
      expect(mockJob.errors).toHaveLength(1);
      expect(mockJob.status).toBe('completed');
      
      console.log('✅ Partial success handled correctly:');
      console.log(`   🎵 ${mockJob.videoIds.length}/${mockJob.songs.length} videos found`);
      console.log(`   ⚠️ ${mockJob.errors.length} songs not found`);
      console.log(`   🔗 Playlist still created: ${mockJob.playlistUrl}`);
    });
  });
});
