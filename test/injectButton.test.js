import { describe, it, expect } from 'vitest';
import { createConvertButton } from '../src/lib/inject.js';
import { JSDOM } from 'jsdom';

describe('createConvertButton', () => {
  it('injects a single floating button', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const { document } = dom.window;
    const btn1 = createConvertButton(document);
    const btn2 = createConvertButton(document);
    expect(btn1).toBe(btn2);
    expect(document.getElementById('s2y-convert-btn')).not.toBeNull();
    expect(btn1.textContent).toContain('Convert to YouTube Playlist');
  });
});
