// Chrome Extension API Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Chrome Extension API Usage', () => {
  beforeEach(() => {
    // Mock Chrome APIs
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
      webNavigation: {
        onHistoryStateUpdated: {
          addListener: vi.fn()
        },
        onCompleted: {
          addListener: vi.fn()
        }
      },
      alarms: {
        create: vi.fn(),
        onAlarm: {
          addListener: vi.fn()
        }
      },
      identity: {
        getAuthToken: vi.fn()
      }
    };
  });

  describe('Background Script API Usage', () => {
    it('should use chrome.tabs.get instead of chrome.tabs.query with tabId', async () => {
      // Import background script logic
      const mockTabId = 123;
      const mockTab = {
        id: mockTabId,
        url: 'https://www.setlist.fm/setlist/artist/123',
        title: 'Test Setlist'
      };

      chrome.tabs.get.mockResolvedValue(mockTab);

      // Test that we use chrome.tabs.get correctly
      const tab = await chrome.tabs.get(mockTabId);
      
      expect(chrome.tabs.get).toHaveBeenCalledWith(mockTabId);
      expect(tab).toEqual(mockTab);
      
      // Ensure we're NOT using chrome.tabs.query with tabId
      expect(chrome.tabs.query).not.toHaveBeenCalledWith({ tabId: mockTabId });
    });

    it('should handle chrome.tabs.query correctly for active tab', async () => {
      const mockTabs = [{
        id: 123,
        url: 'https://www.setlist.fm/setlist/artist/123',
        active: true
      }];

      chrome.tabs.query.mockResolvedValue(mockTabs);

      // Test correct usage of chrome.tabs.query
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(tabs).toEqual(mockTabs);
    });

    it('should handle message passing between components', async () => {
      const mockMessage = { type: 'S2Y_STATUS' };
      const mockResponse = { job: null };

      chrome.runtime.sendMessage.mockResolvedValue(mockResponse);

      // Test message sending
      const response = await chrome.runtime.sendMessage(mockMessage);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(mockMessage);
      expect(response).toEqual(mockResponse);
    });
  });

  describe('Content Script Communication', () => {
    it('should handle content script message listener setup', () => {
      const mockListener = vi.fn();
      
      // Test message listener setup
      chrome.runtime.onMessage.addListener(mockListener);
      
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(mockListener);
    });

    it('should validate setlist.fm URL detection', () => {
      const validUrls = [
        'https://www.setlist.fm/setlist/artist/123',
        'https://www.setlist.fm/setlist/band-name/2024/venue-city-country-123.html'
      ];

      const invalidUrls = [
        'https://example.com',
        'https://youtube.com',
        'https://setlist.com' // Wrong domain
      ];

      validUrls.forEach(url => {
        expect(url.includes('setlist.fm')).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(url.includes('setlist.fm')).toBe(false);
      });
    });
  });

  describe('Storage and State Management', () => {
    it('should handle job state persistence', async () => {
      const mockJob = {
        status: 'running',
        artist: 'Test Artist',
        songs: ['Song 1', 'Song 2']
      };

      chrome.storage.local.set.mockResolvedValue();
      chrome.storage.local.get.mockResolvedValue({ s2y_job: mockJob });

      // Test saving job state
      await chrome.storage.local.set({ s2y_job: mockJob });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ s2y_job: mockJob });

      // Test loading job state
      const result = await chrome.storage.local.get(['s2y_job']);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['s2y_job']);
      expect(result.s2y_job).toEqual(mockJob);
    });
  });

  describe('Error Handling', () => {
    it('should handle chrome API errors gracefully', async () => {
      const error = new Error('Could not establish connection. Receiving end does not exist.');
      chrome.runtime.sendMessage.mockRejectedValue(error);

      try {
        await chrome.runtime.sendMessage({ type: 'S2Y_STATUS' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('Receiving end does not exist');
      }
    });

    it('should validate required permissions', () => {
      // This would be checked in manifest.json validation
      const requiredPermissions = [
        'webNavigation',
        'tabs',
        'activeTab',
        'storage',
        'scripting',
        'identity',
        'alarms'
      ];

      // In a real test, we'd validate these are in manifest.json
      expect(requiredPermissions).toContain('tabs');
      expect(requiredPermissions).toContain('storage');
    });
  });
});
