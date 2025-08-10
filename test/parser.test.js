import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseSetlistFromDocument, normalizeTitle, extractCoverArtist, isNonSongEntry } from '../src/lib/parser.js';

describe('parser', () => {
  it('parses a basic setlist without covers', () => {
    const html = `
      <div id="s2y-artist">Radiohead</div>
      <div id="s2y-date">2024-07-10</div>
      <div id="s2y-venue">The Forum, Los Angeles, USA</div>
      <ol class="setlistSongs">
        <li>Daydreaming</li>
        <li>Decks Dark</li>
        <li>Burn the Witch</li>
      </ol>
    `;
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
    const doc = dom.window.document;
    const parsed = parseSetlistFromDocument(doc);
    expect(parsed.artist).toBe('Radiohead');
    expect(parsed.songs).toEqual([
      { title: 'Daydreaming', artist: 'Radiohead' },
      { title: 'Decks Dark', artist: 'Radiohead' },
      { title: 'Burn the Witch', artist: 'Radiohead' },
    ]);
  });

  it('handles covers and strips parentheses from titles', () => {
    const html = `
      <div id="s2y-artist">Pearl Jam</div>
      <ol class="setlistSongs">
        <li>Alive</li>
        <li>Baba O'Riley (The Who cover)</li>
        <li>Comfortably Numb (Live)</li>
      </ol>
    `;
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
    const doc = dom.window.document;
    const parsed = parseSetlistFromDocument(doc);
    expect(parsed.songs).toEqual([
      { title: 'Alive', artist: 'Pearl Jam' },
      { title: "Baba O'Riley", artist: 'The Who' },
      { title: 'Comfortably Numb', artist: 'Pearl Jam' },
    ]);
  });

  it('ignores non-song entries', () => {
    const html = `
      <div id="s2y-artist">Muse</div>
      <ul class="setlistSongs">
        <li>Intro</li>
        <li>Hysteria</li>
        <li>Jam</li>
        <li>Knights of Cydonia</li>
        <li>Outro</li>
      </ul>
    `;
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
    const doc = dom.window.document;
    const parsed = parseSetlistFromDocument(doc);
    expect(parsed.songs).toEqual([
      { title: 'Hysteria', artist: 'Muse' },
      { title: 'Knights of Cydonia', artist: 'Muse' },
    ]);
  });

  it('utilities behave as expected', () => {
    expect(normalizeTitle('Song (Live)')).toBe('Song');
    expect(extractCoverArtist('Hey Joe (Jimi Hendrix cover)')).toBe('Jimi Hendrix');
    expect(isNonSongEntry('Intro')).toBe(true);
  });
});
