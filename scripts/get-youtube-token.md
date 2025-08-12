# 🔑 Get YouTube Access Token for Testing

## Quick Setup (5 minutes)

### Step 1: Go to OAuth Playground
1. Open: https://developers.google.com/oauthplayground/
2. This is Google's official tool for getting access tokens

### Step 2: Select YouTube Scopes
1. In the left sidebar, find **"YouTube Data API v3"**
2. Check these scopes:
   - ✅ `https://www.googleapis.com/auth/youtube`
   - ✅ `https://www.googleapis.com/auth/youtube.force-ssl`

### Step 3: Authorize
1. Click **"Authorize APIs"** button
2. Sign in with your Google account
3. Click **"Allow"** to grant permissions

### Step 4: Get Access Token
1. You'll be redirected back to the playground
2. Click **"Exchange authorization code for tokens"**
3. Copy the **"Access token"** value (starts with `ya29.`)

### Step 5: Run Tests
```bash
# Set the token and run real API tests
YOUTUBE_ACCESS_TOKEN="ya29.a0AS3H6NxiYcXKTv1ikSepzPZd3w3SiCCR0fespNvehVB8JKoVsroY6-XgKPs5rRaHC8NdaUIBy85PazmeLpzKjB4wCF0NmvCC-cPZ097XMxcmR5_Dl9QIaJrNw6Jn_TW7ZUdIgCqYHWh4Fm54oegS8LhiF6ZoTzq0YPjMN4N2aCgYKAWkSARMSFQHGX2Mir8uFvE11VH4XCYnje0Gj9Q0175" npm test test/real-youtube-api.test.js

# Or export it for multiple test runs
export YOUTUBE_ACCESS_TOKEN="ya29.a0AS3H6NxiYcXKTv1ikSepzPZd3w3SiCCR0fespNvehVB8JKoVsroY6-XgKPs5rRaHC8NdaUIBy85PazmeLpzKjB4wCF0NmvCC-cPZ097XMxcmR5_Dl9QIaJrNw6Jn_TW7ZUdIgCqYHWh4Fm54oegS8LhiF6ZoTzq0YPjMN4N2aCgYKAWkSARMSFQHGX2Mir8uFvE11VH4XCYnje0Gj9Q0175"
npm test test/real-youtube-api.test.js
```

## What the Tests Will Do

### ✅ Safe Operations:
- **Search for videos** (read-only, no quota impact)
- **Create private test playlists** (not visible to others)
- **Automatically delete** created playlists after testing

### 🎵 Test Playlists Created:
- **Title**: `🧪 TEST PLAYLIST - [timestamp] - DELETE ME`
- **Privacy**: Private (only you can see them)
- **Content**: Popular songs like "Bohemian Rhapsody", "Hotel California"
- **Cleanup**: Automatically deleted when tests finish

### 📊 What Gets Tested:
1. **YouTube Search API**: Find videos for real songs
2. **YouTube Playlist API**: Create actual playlists
3. **Error Handling**: Invalid songs, bad data
4. **Full Flow**: Parse → Search → Create → Cleanup

## Sample Test Output

```
🔑 Getting real YouTube access token...
✅ Access token available for testing
✅ Backend health check passed

🔍 Searching for real songs on YouTube...
   Searching: "Bohemian Rhapsody" by Queen
   ✅ Found: dQw4w9WgXcQ - Queen - Bohemian Rhapsody (Official Video)
   Searching: "Hotel California" by Eagles
   ✅ Found: BciS5krYL80 - Eagles - Hotel California (Official Video)
✅ Successfully found 3/3 songs

🎵 Creating real YouTube playlist...
   Adding 3 videos to playlist
   ✅ Created playlist: PLrE8lBf5bJ9k2L3m1N8x7
   🔗 URL: https://www.youtube.com/playlist?list=PLrE8lBf5bJ9k2L3m1N8x7
   ✅ Playlist verified to exist on YouTube
   ✅ Playlist contains 3 videos

🧹 Cleaning up test playlists...
   ✅ Deleted playlist: PLrE8lBf5bJ9k2L3m1N8x7
```

## Troubleshooting

### "Token expired" Error
- Access tokens expire after ~1 hour
- Get a fresh token from the OAuth playground
- For longer testing, get a refresh token

### "Quota exceeded" Error  
- YouTube API has daily quotas
- Test creates minimal quota usage
- Try again the next day if needed

### "Access denied" Error
- Make sure you selected the right scopes
- Make sure you're signed in with the right Google account
- Check that your account has YouTube access

## Security Notes

⚠️ **Access Token Security**:
- Access tokens are temporary (1 hour)
- Don't commit tokens to git
- Don't share tokens with others
- Tokens only work for your YouTube account

✅ **Safe for Testing**:
- All operations are on your own account
- Playlists are private
- Auto-cleanup removes test data
- No permanent changes to your YouTube

## Alternative: Use Your Own OAuth Client

If you want to use your own OAuth setup:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Use the client ID in your own OAuth flow

But for testing, the OAuth playground is much simpler!
