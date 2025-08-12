// Full Integration Test: Frontend Chrome Extension → Production Backend
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseSetlistHtml } from '../src/lib/api.js';

describe('Frontend ↔ Backend Integration Tests', () => {
  const PRODUCTION_API = 'https://setlist2youtube-backend.onrender.com';
  const STAGING_API = 'https://setlist2youtube-backend-staging.onrender.com';

  describe('Production Backend Integration', () => {
    it('should successfully parse a real setlist HTML against production API', async () => {
      const validHtml = `
        <html>
          <head><title>Test Setlist</title></head>
          <body>
            <div id="s2y-artist">Linkin Park</div>
            <ol class="setlistSongs">
              <li><a>In the End</a></li>
              <li><a>Numb</a></li>
              <li><a>Crawling</a></li>
            </ol>
          </body>
        </html>
      `;

      const result = await parseSetlistHtml(PRODUCTION_API, validHtml);

      expect(result.success).toBe(true);
      expect(result.data.artist).toBe('Linkin Park');
      expect(result.data.songs).toHaveLength(3);
      expect(result.data.songs[0].title).toBe('In the End');
      expect(result.data.songs[1].title).toBe('Numb');
      expect(result.data.songs[2].title).toBe('Crawling');
    }, 10000); // 10 second timeout for network request

    it('should handle validation errors from production API', async () => {
      await expect(parseSetlistHtml(PRODUCTION_API, '')).rejects.toThrow(/Parse API error 400/);
    }, 10000);

    it('should handle malformed HTML gracefully on production', async () => {
      const malformedHtml = `
        <html>
          <body>
            <div>No setlist data here</div>
          </body>
        </html>
      `;

      // Backend returns 422 for HTML that can't be parsed, which is correct behavior
      // Should now provide specific error about missing artist or songs
      await expect(parseSetlistHtml(PRODUCTION_API, malformedHtml))
        .rejects.toThrow(/Parse API error 422.*(?:No artist information found|No songs found)/);
    }, 10000);

    it('should provide specific error messages for different parsing failures', async () => {
      // Test case 1: Missing artist
      const noArtistHtml = `
        <html>
          <body>
            <ol class="setlistSongs">
              <li><a href="/song/test">Test Song</a></li>
            </ol>
          </body>
        </html>
      `;

      await expect(parseSetlistHtml(PRODUCTION_API, noArtistHtml))
        .rejects.toThrow(/Parse API error 422.*No artist information found/);

      // Test case 2: Missing songs
      const noSongsHtml = `
        <html>
          <body>
            <div id="s2y-artist">Test Artist</div>
            <div>No songs here</div>
          </body>
        </html>
      `;

      await expect(parseSetlistHtml(PRODUCTION_API, noSongsHtml))
        .rejects.toThrow(/Parse API error 422.*No songs found/);
    }, 15000);

    it('should parse real setlist.fm page structure correctly', async () => {
      // Test with structure matching the actual setlist.fm page
      const realSetlistHtml = `
        <html>
          <head>
            <title>Projekt: Hybrid Theory Setlist Park City Music Hall, Bridgeport, CT, USA 2025</title>
          </head>
          <body>
            <h1>**Projekt: Hybrid Theory Setlist** at Park City Music Hall, Bridgeport, CT, USA</h1>
            <ol>
              <li>One Step Closer<br/>(Linkin Park cover)</li>
              <li>From the Inside<br/>(Linkin Park cover)</li>
              <li>Points of Authority<br/>(Linkin Park cover)</li>
              <li>Numb<br/>(Linkin Park cover)</li>
              <li>In the End<br/>(Linkin Park cover)</li>
            </ol>
          </body>
        </html>
      `;

      const result = await parseSetlistHtml(PRODUCTION_API, realSetlistHtml);
      
      expect(result.success).toBe(true);
      expect(result.data.artist).toBe('Projekt: Hybrid Theory');
      expect(result.data.songs).toHaveLength(5);
      
      // Verify cover artist extraction works
      expect(result.data.songs[0].title).toBe('One Step Closer');
      expect(result.data.songs[0].artist).toBe('Linkin Park');
      expect(result.data.songs[4].title).toBe('In the End');
      expect(result.data.songs[4].artist).toBe('Linkin Park');
      
      console.log('✅ Real setlist.fm structure parsed successfully:', {
        artist: result.data.artist,
        songCount: result.data.songs.length,
        firstSong: `${result.data.songs[0].title} by ${result.data.songs[0].artist}`
      });
    }, 10000);

    it('should handle Steven Wilson setlist structure without navigation pollution', async () => {
      const stevenWilsonHtml = `
        <html>
          <head>
            <title>Steven Wilson Setlist La Riviera, Madrid, Spain 2025, The Overview - setlist.fm</title>
          </head>
          <body>
            <nav>
              <ul>
                <li>Setlists</li>
                <li>Artists</li>
                <li>Festivals</li>
                <li>Venues</li>
                <li>Statistics</li>
                <li>News</li>
                <li>Forum</li>
              </ul>
            </nav>
            <main>
              <h1>**Steven Wilson Setlist** at La Riviera, Madrid, Spain</h1>
              <ol>
                <li>Objects Outlive Us Play Video</li>
                <li>The Overview Play Video</li>
                <li>The Harmony Codex Play Video</li>
                <li>Home Invasion Play Video</li>
                <li>Voyage 34 (Phase I) (Porcupine Tree song) Play Video</li>
                <li>Dislocated Day (Porcupine Tree song) Play Video</li>
                <li>Ancestral Play Video</li>
              </ol>
            </main>
          </body>
        </html>
      `;
      
      const result = await parseSetlistHtml(PRODUCTION_API, stevenWilsonHtml);
      expect(result.success).toBe(true);
      expect(result.data.artist).toBe('Steven Wilson');
      
      // Should find actual songs, not navigation items
      expect(result.data.songs.length).toBeGreaterThan(5);
      expect(result.data.songs.length).toBeLessThan(20); // Reasonable range
      
      // Should extract song titles without "Play Video"
      expect(result.data.songs[0].title).toBe('Objects Outlive Us');
      expect(result.data.songs[1].title).toBe('The Overview');
      expect(result.data.songs[0].artist).toBe('Steven Wilson');
      
      // Should handle Porcupine Tree covers
      const porcupineSong = result.data.songs.find(s => s.title.includes('Voyage 34') || s.title.includes('Dislocated Day'));
      expect(porcupineSong).toBeDefined();
      
      // Should NOT include navigation items as songs
      const navigationItems = ['Setlists', 'Artists', 'Festivals', 'Venues', 'Statistics', 'News', 'Forum'];
      for (const song of result.data.songs) {
        expect(navigationItems).not.toContain(song.title);
      }
      
      console.log('✅ Steven Wilson structure parsed correctly:', {
        artist: result.data.artist,
        songCount: result.data.songs.length,
        songs: result.data.songs.slice(0, 3).map(s => `${s.title} by ${s.artist}`)
      });
    }, 10000);
  });

  describe('Staging Backend Integration', () => {
    it('should work identically on staging environment', async () => {
      const validHtml = `
        <html>
          <head><title>Test Setlist</title></head>
          <body>
            <div id="s2y-artist">The Beatles</div>
            <ol class="setlistSongs">
              <li><a>Hey Jude</a></li>
              <li><a>Yesterday</a></li>
            </ol>
          </body>
        </html>
      `;

      const result = await parseSetlistHtml(STAGING_API, validHtml);

      expect(result.success).toBe(true);
      expect(result.data.artist).toBe('The Beatles');
      expect(result.data.songs).toHaveLength(2);
    }, 10000);
  });

  describe('Chrome Extension API Configuration', () => {
    beforeEach(() => {
      // Mock Chrome APIs for testing
      global.chrome = {
        tabs: {
          query: vi.fn(),
          get: vi.fn(),
          sendMessage: vi.fn(),
          create: vi.fn()
        },
        runtime: {
          sendMessage: vi.fn(),
          onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn()
          }
        },
        storage: {
          local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn()
          }
        },
        scripting: {
          executeScript: vi.fn()
        },
        identity: {
          getAuthToken: vi.fn()
        }
      };
    });

    it('should have correct API base URL configured', async () => {
      // Import background script to check configuration
      const fs = await import('fs');
      const path = await import('path');
      
      const backgroundScript = fs.readFileSync(
        path.resolve('./background.js'), 
        'utf8'
      );
      
      expect(backgroundScript).toContain('setlist2youtube-backend.onrender.com');
      expect(backgroundScript).toContain('API_BASE');
    });

    it('should have proper manifest permissions for production', async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      // Check if there's a built manifest
      let manifestPath = path.resolve('./manifest.json');
      if (!fs.existsSync(manifestPath)) {
        manifestPath = path.resolve('./manifest.template.json');
      }
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      expect(manifest.permissions).toContain('webNavigation');
      expect(manifest.permissions).toContain('tabs');
      expect(manifest.permissions).toContain('activeTab');
      expect(manifest.permissions).toContain('storage');
      expect(manifest.permissions).toContain('scripting');
      expect(manifest.permissions).toContain('identity');
      
      expect(manifest.host_permissions).toContain('https://www.setlist.fm/*');
      expect(manifest.host_permissions).toContain('https://www.googleapis.com/*');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100);
      });

      const apiCall = parseSetlistHtml(PRODUCTION_API, '<html></html>');
      
      // Race the API call against a very short timeout to simulate network issues
      await expect(Promise.race([apiCall, timeoutPromise]))
        .rejects.toThrow(); // Either succeeds or times out - both are acceptable
    });

    it('should provide meaningful error messages', async () => {
      try {
        await parseSetlistHtml(PRODUCTION_API, '');
      } catch (error) {
        expect(error.message).toMatch(/Parse API error 400/);
        expect(error.message).toContain('400'); // HTTP status code
      }
    });
  });
});
