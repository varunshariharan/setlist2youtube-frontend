import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseSetlistHtml } from '../src/lib/api.js';

describe('api.parseSetlistHtml', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs HTML to backend and returns parsed result', async () => {
    const mockResult = { artist: 'A', date: 'D', venue: 'V', songs: [] };
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResult
    });
    const res = await parseSetlistHtml('http://localhost:4000', '<html></html>');
    expect(res).toEqual(mockResult);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/parse', expect.any(Object));
  });

  it('throws on non-OK response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, text: async () => 'err' });
    await expect(parseSetlistHtml('http://localhost:4000', '<html></html>')).rejects.toThrow(/Parse API error/);
  });
});
