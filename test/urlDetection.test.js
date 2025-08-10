import { describe, it, expect } from 'vitest';
import { matchesSetlistUrl } from '../src/lib/inject.js';

describe('matchesSetlistUrl', () => {
  it('matches setlist pages', () => {
    expect(matchesSetlistUrl('https://www.setlist.fm/setlist/artist/2024.html')).toBe(true);
  });
  it('matches stats pages', () => {
    expect(matchesSetlistUrl('https://www.setlist.fm/stats/some-artist.html')).toBe(true);
  });
  it('supports non-English locale pattern containing setlist', () => {
    expect(matchesSetlistUrl('https://www.setlist.fm/de/setlists/artist-abc.html')).toBe(true);
  });
  it('rejects unrelated pages', () => {
    expect(matchesSetlistUrl('https://www.setlist.fm/help')).toBe(false);
  });
});
