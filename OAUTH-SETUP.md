# 🔐 OAuth Setup Guide for Setlist2YouTube

## Why OAuth is Required

The Chrome extension needs to authenticate with Google's YouTube API to:
- Search for videos
- Create playlists  
- Add videos to playlists

Without proper OAuth setup, the extension **cannot function**.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select existing project
3. Name: `Setlist2YouTube Extension`
4. Click **"Create"**

## Step 2: Enable YouTube Data API

1. In Cloud Console, go to **"APIs & Services" > "Library"**
2. Search for **"YouTube Data API v3"**
3. Click on it and press **"Enable"**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS" > "OAuth 2.0 Client ID"**
3. If prompted, configure OAuth consent screen:
   - User Type: **External**
   - App name: `Setlist2YouTube`
   - User support email: `your-email@gmail.com`
   - Developer contact: `your-email@gmail.com`
   - Scopes: Add `https://www.googleapis.com/auth/youtube`
   - Test users: Add your email

4. Create OAuth Client ID:
   - Application type: **Chrome Extension**
   - Name: `Setlist2YouTube Extension`
   - Copy the **Application ID** from Chrome Web Store (once published)

## Step 4: Configure Extension

1. Copy your **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

2. Set environment variable:
   ```bash
   export GOOGLE_CLIENT_ID="your-client-id-here"
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. The manifest.json will be generated with your Client ID

## Step 5: Test OAuth Flow

1. Load the extension in Chrome
2. Visit a setlist.fm page
3. Click the extension button
4. You should see OAuth consent screen
5. After consent, extension can access YouTube API

## For Development Testing

Create a test client ID for development:

```bash
# For testing only - replace with real client ID
export GOOGLE_CLIENT_ID="123456789-test.apps.googleusercontent.com"
npm run build:test
```

## Security Notes

- **Never commit Client ID to git** - use environment variables
- **Use different Client IDs** for development vs production
- **Enable only required scopes**: `https://www.googleapis.com/auth/youtube`
- **Set proper redirect URIs** in Google Console

## Troubleshooting

### Error: "OAuth client not found"
- Check Client ID is correct
- Ensure it's for Chrome Extension type
- Verify extension ID matches Google Console

### Error: "Access denied"
- Check OAuth consent screen is configured
- Add your email as test user
- Ensure YouTube Data API is enabled

### Error: "Invalid scope"
- Verify scope is exactly: `https://www.googleapis.com/auth/youtube`
- Check manifest.json has correct scopes

## Production Deployment

For Chrome Web Store:
1. Publish extension to get official Extension ID
2. Update OAuth Client ID with real Extension ID
3. Request OAuth consent screen verification
4. Update environment variables in CI/CD
