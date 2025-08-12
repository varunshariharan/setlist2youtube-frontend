# 🎯 Real YouTube API Testing Guide

## 🔍 Overview

This test suite validates the complete frontend-to-backend-to-YouTube API flow using **real YouTube data**. It creates actual playlists and automatically cleans them up.

## ⚡ Quick Start

### 1. Get YouTube Access Token (5 minutes)
```bash
# Read the detailed guide
cat scripts/get-youtube-token.md

# Quick steps:
# 1. Go to: https://developers.google.com/oauthplayground/
# 2. Select "YouTube Data API v3" scopes
# 3. Authorize and get access token
# 4. Copy the token (starts with "ya29.")
```

### 2. Run Real API Tests
```bash
# Option 1: Use the helper script (recommended)
YOUTUBE_ACCESS_TOKEN="ya29.your-token-here" ./scripts/test-real-apis.sh

# Option 2: Run tests directly
YOUTUBE_ACCESS_TOKEN="ya29.your-token-here" npm test test/real-youtube-api.test.js

# Option 3: Export token for multiple runs
export YOUTUBE_ACCESS_TOKEN="ya29.your-token-here"
npm test test/real-youtube-api.test.js
```

## 🧪 What Gets Tested

### ✅ YouTube Search API
- **Real Songs**: Searches for popular songs like "Bohemian Rhapsody", "Hotel California"
- **Invalid Songs**: Tests handling of non-existent songs
- **API Response**: Validates video ID format and response structure
- **Error Handling**: Verifies graceful handling of search failures

### ✅ YouTube Playlist Creation API
- **Real Playlists**: Creates actual private playlists on YouTube
- **Video Addition**: Adds found videos to the playlist
- **Metadata**: Sets proper title, description, and privacy settings
- **Verification**: Confirms playlist exists on YouTube
- **Error Handling**: Tests invalid data handling

### ✅ End-to-End Flow
- **Parse Setlist**: Real HTML → Song list
- **Search Videos**: Song list → Video IDs  
- **Create Playlist**: Video IDs → YouTube playlist
- **Cleanup**: Automatic deletion of test playlists

## 🛡️ Safety Measures

### Automatic Cleanup
- ✅ **All test playlists are automatically deleted**
- ✅ **Private playlists only** (not visible to others)
- ✅ **Clear test naming** (`🧪 TEST PLAYLIST - DELETE ME`)
- ✅ **Cleanup runs in afterAll()** hook

### Safe Operations
- ✅ **No permanent changes** to your YouTube account
- ✅ **Read-only searches** (no quota impact)
- ✅ **Temporary playlists** only
- ✅ **Your access token** (only affects your account)

## 📊 Expected Test Output

```
🧪 Real YouTube API Testing
==========================

✅ YouTube access token found
🔍 Token preview: ya29.a0AfH6SMC7Xk1...

🚀 Running real YouTube API tests...

🔑 Getting real YouTube access token...
✅ Access token available for testing
✅ Backend health check passed

🔍 Searching for real songs on YouTube...
   Searching: "Bohemian Rhapsody" by Queen
   ✅ Found: dQw4w9WgXcQ - Queen - Bohemian Rhapsody (Official Video)
   Searching: "Hotel California" by Eagles  
   ✅ Found: BciS5krYL80 - Eagles - Hotel California (Official Video)
   Searching: "Stairway to Heaven" by Led Zeppelin
   ✅ Found: QkF3oxziUI4 - Led Zeppelin - Stairway To Heaven (Official Video)
✅ Successfully found 3/3 songs

🎵 Creating real YouTube playlist...
   Adding 3 videos to playlist
   ✅ Created playlist: PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh8
   🔗 URL: https://www.youtube.com/playlist?list=PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh8
   📝 Title: 🧪 TEST PLAYLIST - 2024-01-15T10:30 - DELETE ME
   ✅ Playlist verified to exist on YouTube
   ✅ Playlist contains 3 videos
      1. Queen - Bohemian Rhapsody (Official Video) (Queen - Bohemian Rhapsody)
      2. Eagles - Hotel California (Official Video) (Eagles - Hotel California)  
      3. Led Zeppelin - Stairway To Heaven (Official Video) (Led Zeppelin - Stairway to Heaven)

🔄 Testing complete end-to-end flow...
   1. Parsing setlist HTML...
   ✅ Parsed 3 songs for Queen
   2. Searching for videos...
      Searching: Bohemian Rhapsody by Queen
      ✅ Found: dQw4w9WgXcQ
      Searching: Radio Ga Ga by Queen  
      ✅ Found: azdwsXLmrHE
      Searching: We Will Rock You by Queen
      ✅ Found: -tJYN-eG1zk
   ✅ Found 3/3 videos
   3. Creating playlist...
   ✅ Created playlist: PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh9
   🔗 https://www.youtube.com/playlist?list=PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh9
   📊 Success rate: 3/3 songs found
✅ End-to-end flow completed successfully!

🧹 Cleaning up test playlists...
   Deleting playlist: PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh8
   ✅ Deleted playlist: PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh8
   Deleting playlist: PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh9  
   ✅ Deleted playlist: PLrE8lBf5bJ9k2L3m1N8x7Q4pKj6Vh9

✅ All real YouTube API tests passed!
🧹 Test playlists should have been automatically cleaned up
```

## 🐛 Troubleshooting

### "No access token" Error
```bash
❌ No YouTube access token found

📋 To get an access token:
1. See: scripts/get-youtube-token.md
2. Go to: https://developers.google.com/oauthplayground/
```
**Solution**: Follow the token setup guide in `scripts/get-youtube-token.md`

### "Token expired" Error
```
❌ Error: Invalid credentials (401)
```
**Solution**: Access tokens expire after ~1 hour. Get a fresh token from OAuth playground.

### "Quota exceeded" Error  
```
❌ Error: YouTube API quota exceeded
```
**Solution**: YouTube API has daily quotas. Try again tomorrow or use a different Google account.

### "Playlist not found during cleanup"
```
⚠️ Failed to delete playlist: PLxxx (404)
```
**Solution**: This is OK - playlist might have been deleted manually or by YouTube.

## 🔧 Manual Verification

If you want to manually verify the tests:

### 1. Check Your YouTube Playlists
1. Go to https://www.youtube.com/
2. Click on "Library" → "Playlists"
3. Look for playlists named `🧪 TEST PLAYLIST - DELETE ME`
4. **These should NOT exist** (auto-deleted by tests)

### 2. Verify API Responses
```bash
# Test backend parse API
curl -X POST https://setlist2youtube-backend.onrender.com/api/parse \
  -H "Content-Type: application/json" \
  -d '{"html":"<html><div id=\"s2y-artist\">Test</div><ol class=\"setlistSongs\"><li><a>Song</a></li></ol></html>"}'

# Test YouTube search (with your token)
curl -X POST https://setlist2youtube-backend.onrender.com/api/youtube/search \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"ya29.your-token","title":"Bohemian Rhapsody","artist":"Queen"}'
```

## 📝 Test Configuration

### Environment Variables
- `YOUTUBE_ACCESS_TOKEN`: Required for real API tests
- `GOOGLE_CLIENT_ID`: Set to real OAuth client ID
- `NODE_ENV`: Set to `test` for test-specific behavior

### Test Data
- **Popular Songs**: Known to exist on YouTube with official videos
- **Fake Songs**: Non-existent songs for error testing
- **Queen Setlist**: Realistic setlist HTML for end-to-end testing

### Cleanup Policy
- **Automatic**: All test playlists deleted in `afterAll()` hook
- **Manual Fallback**: Clear naming makes manual cleanup easy
- **Private Only**: No public playlist pollution

## 🎯 Success Criteria

✅ **All tests pass** without errors  
✅ **Real videos found** for popular songs  
✅ **Playlists created** on YouTube successfully  
✅ **End-to-end flow** completes without issues  
✅ **All test playlists** automatically cleaned up  
✅ **Error handling** works for invalid data  

**If all criteria are met, the YouTube API integration is working correctly!** 🚀
