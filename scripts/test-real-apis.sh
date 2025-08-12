#!/bin/bash

# Real YouTube API Testing Script
# This script helps run tests against real YouTube APIs with proper setup

echo "🧪 Real YouTube API Testing"
echo "=========================="
echo

# Check if access token is provided
if [ -z "$YOUTUBE_ACCESS_TOKEN" ]; then
    echo "❌ No YouTube access token found"
    echo
    echo "📋 To get an access token:"
    echo "1. See: scripts/get-youtube-token.md"
    echo "2. Or run: cat scripts/get-youtube-token.md"
    echo
    echo "💡 Quick start:"
    echo "1. Go to: https://developers.google.com/oauthplayground/"
    echo "2. Select 'YouTube Data API v3' scopes"
    echo "3. Authorize and get access token"
    echo "4. Run: YOUTUBE_ACCESS_TOKEN=\"your_token\" $0"
    echo
    exit 1
fi

echo "✅ YouTube access token found"
echo "🔍 Token preview: ${YOUTUBE_ACCESS_TOKEN:0:20}..."
echo

# Check token format
if [[ ! $YOUTUBE_ACCESS_TOKEN =~ ^ya29\. ]]; then
    echo "⚠️  Warning: Access token doesn't start with 'ya29.' - this might not be a valid Google access token"
    echo "   📝 Google access tokens should start with 'ya29.'"
    echo "   💡 Make sure you copied the 'Access token' not the 'Authorization code'"
    echo
fi

# Check token length (Google access tokens are typically 200+ characters)
token_length=${#YOUTUBE_ACCESS_TOKEN}
if [ $token_length -lt 100 ]; then
    echo "⚠️  Warning: Access token seems too short ($token_length characters)"
    echo "   📝 Google access tokens are typically 200+ characters long"
    echo "   💡 Make sure you copied the complete token"
    echo
fi

# Confirm before running tests
echo "🧪 About to run real YouTube API tests:"
echo "   - Will search for real songs on YouTube"
echo "   - Will create private test playlists"
echo "   - Will automatically clean up created playlists"
echo "   - All operations are safe and reversible"
echo

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Tests cancelled"
    exit 0
fi

echo
echo "🚀 Running real YouTube API tests..."
echo "   (This may take 2-3 minutes)"
echo

# Set environment and run tests
export GOOGLE_CLIENT_ID=945658462648-lek4ftihtmdnqlago7m7vrjvpnlg4spj.apps.googleusercontent.com
export NODE_ENV=test

# Run the real API tests
npm test test/real-youtube-api.test.js

# Check exit code
if [ $? -eq 0 ]; then
    echo
    echo "✅ All real YouTube API tests passed!"
    echo "🧹 Test playlists should have been automatically cleaned up"
    echo "🎯 YouTube API integration is working correctly!"
    echo
else
    echo
    echo "❌ Some tests failed or had issues"
    echo
    echo "🔍 Common issues and solutions:"
    echo "   • 503 Service Unavailable: Backend starting up, wait 30s and retry"
    echo "   • 401 Unauthorized: Access token expired, get a fresh token"
    echo "   • 429 Rate Limited: YouTube API quota exceeded, try tomorrow"
    echo "   • Network errors: Check internet connection"
    echo
    echo "💡 If access token issues:"
    echo "   1. Get fresh token: https://developers.google.com/oauthplayground/"
    echo "   2. Make sure you selected YouTube Data API v3 scopes"
    echo "   3. Copy the complete 'Access token' (not authorization code)"
    echo
    echo "🧹 Any created playlists should still be cleaned up automatically"
    echo
    exit 1
fi
