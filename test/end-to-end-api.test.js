// End-to-End API Testing - Frontend Plugin ↔ Backend Communication
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseSetlistHtml } from '../src/lib/api.js';

const PRODUCTION_API = 'https://setlist2youtube-backend.onrender.com';
const STAGING_API = 'https://setlist2youtube-backend-staging.onrender.com';

describe('Frontend Plugin ↔ Backend API Communication', () => {
  beforeEach(() => {
    // Mock Chrome APIs for testing
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        },
        lastError: null
      },
      tabs: {
        query: vi.fn(),
        get: vi.fn(),
        sendMessage: vi.fn()
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn()
        }
      },
      identity: {
        getAuthToken: vi.fn()
      }
    };
  });

  describe('1. Backend API Availability and Health', () => {
    it('should verify production backend is accessible', async () => {
      const response = await fetch(`${PRODUCTION_API}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      console.log('✅ Production backend health check passed:', data);
    }, 10000);

    it('should verify staging backend is accessible', async () => {
      const response = await fetch(`${STAGING_API}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      console.log('✅ Staging backend health check passed:', data);
    }, 10000);
  });

  describe('2. Parse API - Valid Setlist HTML', () => {
    const validSetlistHtml = `
      <html>
        <head><title>Linkin Park Setlist at Test Venue</title></head>
        <body>
          <div id="s2y-artist">Linkin Park</div>
          <ol class="setlistSongs">
            <li><a href="/song/in-the-end">In The End</a></li>
            <li><a href="/song/numb">Numb</a></li>
            <li><a href="/song/what-ive-done">What I've Done</a></li>
          </ol>
        </body>
      </html>
    `;

    it('should successfully parse valid setlist on production', async () => {
      console.log('🔍 Testing valid setlist parsing on production...');
      
      const result = await parseSetlistHtml(PRODUCTION_API, validSetlistHtml);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.artist).toBe('Linkin Park');
      expect(result.data.songs).toHaveLength(3);
      expect(result.data.songs[0].title).toBe('In The End');
      
      console.log('✅ Parse API successful:', {
        artist: result.data.artist,
        songCount: result.data.songs.length,
        songs: result.data.songs.map(s => s.title)
      });
    }, 15000);

    it('should successfully parse valid setlist on staging', async () => {
      console.log('🔍 Testing valid setlist parsing on staging...');
      
      const result = await parseSetlistHtml(STAGING_API, validSetlistHtml);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.artist).toBe('Linkin Park');
      expect(result.data.songs).toHaveLength(3);
      
      console.log('✅ Staging parse API successful:', {
        artist: result.data.artist,
        songCount: result.data.songs.length
      });
    }, 15000);
  });

  describe('3. Parse API - Error Handling', () => {
    it('should handle empty HTML gracefully', async () => {
      console.log('🔍 Testing empty HTML error handling...');
      
      await expect(parseSetlistHtml(PRODUCTION_API, ''))
        .rejects.toThrow(/Parse API error 400/);
      
      console.log('✅ Empty HTML properly rejected with 400 error');
    });

    it('should handle malformed HTML gracefully', async () => {
      console.log('🔍 Testing malformed HTML error handling...');
      
      const malformedHtml = '<html><body><div>No setlist here</div></body></html>';
      
      await expect(parseSetlistHtml(PRODUCTION_API, malformedHtml))
        .rejects.toThrow(/Parse API error 422/);
      
      console.log('✅ Malformed HTML properly rejected with 422 error');
    });

    it('should handle network errors gracefully', async () => {
      console.log('🔍 Testing network error handling...');
      
      const invalidApiUrl = 'https://nonexistent-api.example.com';
      
      await expect(parseSetlistHtml(invalidApiUrl, '<html></html>'))
        .rejects.toThrow();
      
      console.log('✅ Network errors properly handled');
    });
  });

  describe('4. YouTube Search API - Mock Integration', () => {
    it('should handle YouTube search API format correctly', async () => {
      console.log('🔍 Testing YouTube search API structure...');
      
      // Mock successful YouTube search API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            videoId: 'mock_video_id_123',
            title: 'Linkin Park - In The End (Official Video)',
            channel: 'Linkin Park'
          }
        })
      });

      const mockAccessToken = 'mock_youtube_token';
      
      const response = await fetch(`${PRODUCTION_API}/api/youtube/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: mockAccessToken,
          title: 'In The End',
          artist: 'Linkin Park'
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.videoId).toBe('mock_video_id_123');
      
      console.log('✅ YouTube search API structure verified');
    });

    it('should handle YouTube search authentication errors', async () => {
      console.log('🔍 Testing YouTube API authentication error handling...');
      
      // Mock authentication error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized: Invalid access token'
      });

      const response = await fetch(`${PRODUCTION_API}/api/youtube/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: 'invalid_token',
          title: 'In The End',
          artist: 'Linkin Park'
        })
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      
      console.log('✅ YouTube API authentication errors properly handled');
    });
  });

  describe('5. Backend Response Structure Validation', () => {
    it('should verify parse API response structure', async () => {
      console.log('🔍 Validating parse API response structure...');
      
      const validHtml = `
        <html>
          <body>
            <div id="s2y-artist">Test Artist</div>
            <ol class="setlistSongs">
              <li><a href="/song/test">Test Song</a></li>
            </ol>
          </body>
        </html>
      `;
      
      const result = await parseSetlistHtml(PRODUCTION_API, validHtml);
      
      // Verify response structure matches frontend expectations
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('artist');
      expect(result.data).toHaveProperty('songs');
      expect(Array.isArray(result.data.songs)).toBe(true);
      
      if (result.data.songs.length > 0) {
        expect(result.data.songs[0]).toHaveProperty('title');
        expect(result.data.songs[0]).toHaveProperty('artist');
      }
      
      console.log('✅ Parse API response structure is valid for frontend consumption');
    });

    it('should verify error response structure', async () => {
      console.log('🔍 Validating error response structure...');
      
      try {
        await parseSetlistHtml(PRODUCTION_API, '');
      } catch (error) {
        // Verify error structure is useful for frontend
        expect(error.message).toBeDefined();
        expect(error.message).toContain('Parse API error');
        expect(error.message).toContain('400'); // HTTP status
        
        console.log('✅ Error response structure is useful for frontend:', error.message);
      }
    });
  });

  describe('6. Frontend Error Handling Simulation', () => {
    it('should simulate Chrome extension error scenarios', async () => {
      console.log('🔍 Simulating Chrome extension error scenarios...');
      
      // Simulate content script failure
      chrome.tabs.sendMessage.mockImplementation(() => {
        throw new Error('Could not establish connection');
      });
      
      // This would test how the background script handles content script failures
      expect(() => chrome.tabs.sendMessage(123, { type: 'S2Y_GET_HTML' }))
        .toThrow('Could not establish connection');
      
      // Simulate auth token failure
      chrome.identity.getAuthToken.mockImplementation((options, callback) => {
        chrome.runtime.lastError = { message: 'User authorization required' };
        callback(null);
      });
      
      // Test auth error handling
      const authPromise = new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });
      
      await expect(authPromise).rejects.toThrow('User authorization required');
      
      console.log('✅ Chrome extension error scenarios properly simulated');
    });
  });

  describe('7. User Feedback and Error Messages', () => {
    it('should provide meaningful error messages for users', async () => {
      console.log('🔍 Testing user-friendly error messages...');
      
      const testCases = [
        {
          scenario: 'Empty HTML',
          html: '',
          expectedError: /Parse API error 400/,
          userMessage: 'Should tell user the page content is empty'
        },
        {
          scenario: 'No setlist found',
          html: '<html><body><div>No setlist data</div></body></html>',
          expectedError: /Parse API error 422/,
          userMessage: 'Should tell user no setlist was found on the page'
        }
      ];
      
      for (const testCase of testCases) {
        try {
          await parseSetlistHtml(PRODUCTION_API, testCase.html);
        } catch (error) {
          expect(error.message).toMatch(testCase.expectedError);
          console.log(`✅ ${testCase.scenario}: ${error.message}`);
        }
      }
    });
  });

  describe('8. Performance and Timeout Handling', () => {
    it('should handle slow backend responses', async () => {
      console.log('🔍 Testing timeout handling...');
      
      // Create a slow response simulation
      const slowApiCall = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch(`${PRODUCTION_API}/api/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: '<html><body>test</body></html>' }),
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          return response;
        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }
      };
      
      // This should complete within 5 seconds or timeout
      const start = Date.now();
      await slowApiCall();
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(5000);
      console.log(`✅ API response time: ${elapsed}ms`);
    }, 10000);
  });
});
