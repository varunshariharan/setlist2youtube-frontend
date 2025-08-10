function getTextBySelectors(documentRef, selectors) {
  for (const selector of selectors) {
    const el = documentRef.querySelector(selector);
    if (el && el.textContent) return el.textContent.trim();
  }
  return '';
}

function normalizeTitle(rawTitle) {
  if (!rawTitle) return '';
  let title = String(rawTitle).trim();
  // Remove parenthetical parts like (Live), (Remix), etc.
  title = title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return title;
}

function extractCoverArtist(text) {
  if (!text) return null;
  const match = text.match(/\(([^)]+)\s+cover\)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

function isNonSongEntry(title) {
  if (!title) return true;
  const lower = title.toLowerCase();
  return /(\bintro\b|\boutro\b|\bjam\b)/i.test(lower);
}

function parseSongs(documentRef, defaultArtist) {
  const songs = [];
  // Heuristic: search common containers then fall back broadly
  const candidateItems = Array.from(
    documentRef.querySelectorAll(
      [
        'ol.setlistSongs > li',
        'ol.setlist > li',
        'ul.setlistSongs > li',
        'li.setlist-song',
        'li.song',
        'div.setlist-song',
        '[data-song-title]',
      ].join(', ')
    )
  );

  const seen = new Set();
  for (const item of candidateItems) {
    let rawText = '';
    if (item.getAttribute && item.getAttribute('data-song-title')) {
      rawText = item.getAttribute('data-song-title');
    } else {
      rawText = (item.textContent || '').trim();
    }
    if (!rawText) continue;

    // Extract cover artist and normalized title
    const coverArtist = extractCoverArtist(rawText);
    let title = normalizeTitle(rawText);

    if (isNonSongEntry(title)) continue;

    const chosenArtist = coverArtist ? coverArtist : defaultArtist;
    const key = `${chosenArtist}::${title}`;
    if (seen.has(key)) continue; // avoid accidental dupes
    seen.add(key);

    songs.push({ title, artist: chosenArtist });
  }

  // If we found nothing with targeted selectors, try a broad fallback on all LIs
  if (songs.length === 0) {
    const fallbackLis = Array.from(documentRef.querySelectorAll('li'));
    for (const li of fallbackLis) {
      const rawText = (li.textContent || '').trim();
      if (!rawText) continue;
      const coverArtist = extractCoverArtist(rawText);
      let title = normalizeTitle(rawText);
      if (isNonSongEntry(title)) continue;
      const chosenArtist = coverArtist ? coverArtist : defaultArtist;
      const key = `${chosenArtist}::${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      songs.push({ title, artist: chosenArtist });
    }
  }

  return songs;
}

function parseSetlistFromDocument(documentRef) {
  // Use explicit IDs if present (useful for tests), then common page selectors
  const artist =
    getTextBySelectors(documentRef, ['#s2y-artist', '[data-artist-name]', 'h1', 'h2']) || '';
  const date =
    getTextBySelectors(documentRef, ['#s2y-date', '[data-show-date]', '.date', 'time']) || '';
  const venue =
    getTextBySelectors(documentRef, ['#s2y-venue', '[data-venue-name]', '.venue']) || '';

  const songs = parseSongs(documentRef, artist);

  return { artist, date, venue, songs };
}

module.exports = {
  parseSetlistFromDocument,
  normalizeTitle,
  extractCoverArtist,
  isNonSongEntry,
};
