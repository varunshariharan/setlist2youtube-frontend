# Test Mode Setup for OAuth Demo Video

**Purpose**: Get the extension working immediately so you can create the required demo video  
**Status**: Ready to implement  
**Timeline**: 15-30 minutes  

---

## 🚨 **The Problem**

You need a **demo video** showing the extension working to get OAuth verification, but the extension needs **OAuth verification** to work. This creates a circular dependency.

## ✅ **The Solution: Test Mode**

Google allows you to add **test users** to your OAuth client who can use the extension while it's unverified. This lets you create the demo video immediately.

---

## 🔧 **Step-by-Step Setup**

### **Step 1: Add Yourself as Test User**

1. **Go to**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Select your project**: `setlist2youtube-backend` (or the project with your OAuth client)
3. **Navigate to**: APIs & Services → OAuth consent screen
4. **Scroll down** to "Test users" section
5. **Click "Add Users"**
6. **Add your Google account email** (the one you want to test with)
7. **Click "Save"**

### **Step 2: Verify Test User Status**

- **Status should show**: "Test user added successfully"
- **Your email should appear** in the test users list
- **Publishing status**: Should remain "Testing"

### **Step 3: Test the Extension**

1. **Load the extension** in Chrome (if not already loaded)
2. **Go to**: [https://www.setlist.fm/setlist/steven-wilson/2025/la-riviera-madrid-spain-357059f.html](https://www.setlist.fm/setlist/steven-wilson/2025/la-riviera-madrid-spain-357059f.html)
3. **Click the extension icon**
4. **Click "Convert to YouTube Playlist"**
5. **OAuth flow should work** (since you're a test user)

---

## 🎬 **Creating the Demo Video**

### **Pre-Recording Checklist**

- ✅ **Extension loaded** and working
- ✅ **Test setlist.fm page** ready (Steven Wilson page)
- ✅ **YouTube account** logged in (same as test user)
- ✅ **Screen recording software** ready (OBS, Camtasia, Loom)
- ✅ **Microphone** working and clear

### **Recording Script**

#### **Opening (0:00 - 0:30)**
```
"Hi, I'm demonstrating Setlist2YouTube, a Chrome extension that converts 
setlist.fm pages into YouTube playlists. I'm currently in test mode, which 
allows me to show you exactly how the extension works while we wait for 
full OAuth verification."
```

#### **Setup (0:30 - 1:00)**
```
"I'm on a setlist.fm page for Steven Wilson's recent concert. This page 
contains a setlist with 14 songs. The extension has detected this page 
and is ready to convert it to a YouTube playlist."
```

#### **Extension Activation (1:00 - 1:30)**
```
"I'll click the Setlist2YouTube extension icon. Notice how it shows the 
current setlist information - artist name, song count, and individual songs. 
At this point, no YouTube access is required yet."
```

#### **OAuth Flow (1:30 - 2:00)**
```
"Now I'll click 'Convert to YouTube Playlist'. This initiates the OAuth 
flow. Since I'm a test user, I can demonstrate the complete functionality. 
The extension requests permission to access my YouTube account for playlist 
creation."
```

#### **API Usage (2:00 - 3:30)**
```
"Once I grant permission, the extension uses the YouTube Data API to:
1. Search for each song in the setlist
2. Find the best matching videos using our album-enhanced search
3. Create a new playlist on my YouTube account
4. Add all the videos in the correct order

Watch as it processes each song and creates the playlist."
```

#### **Results (3:30 - 4:00)**
```
"Perfect! The extension has created a playlist called 'Steven Wilson – 
Setlist at La Riviera, Madrid, Spain' with all 14 songs. Let me open 
this playlist to show you the final result."
```

#### **Privacy & Security (4:00 - 4:30)**
```
"Important to note: The extension only accesses what's necessary for 
playlist creation. It doesn't read my viewing history, personal information, 
or other playlists. All data is stored locally on my device."
```

#### **Closing (4:30 - 5:00)**
```
"That's Setlist2YouTube in action! It uses YouTube OAuth scopes responsibly 
to transform setlist information into personalized playlists. This demo 
shows the complete functionality that will be available to all users 
once OAuth verification is complete."
```

---

## 🎯 **Key Points to Emphasize**

### **Scope Usage:**
- **Search API**: Finding videos for each song
- **Playlist API**: Creating playlists on user's account
- **PlaylistItems API**: Adding videos in correct order

### **User Value:**
- **Time saved**: Hours of manual work automated
- **Accuracy**: Album-enhanced search for better matches
- **Convenience**: One-click playlist creation

### **Privacy Protection:**
- **Local data storage**: No cloud collection
- **Minimal access**: Only necessary YouTube permissions
- **User control**: Easy permission revocation

---

## 🚨 **Common Issues & Solutions**

### **Issue: "This app isn't verified"**
**Solution**: You're not added as a test user yet. Go back to Step 1.

### **Issue: Extension not detecting setlist.fm pages**
**Solution**: Check if the extension is loaded and enabled in Chrome.

### **Issue: OAuth flow fails**
**Solution**: Ensure you're using the same Google account that's added as a test user.

### **Issue: YouTube API errors**
**Solution**: Check if you have a valid YouTube account and are logged in.

---

## 📤 **After Creating the Video**

### **Upload Options:**
1. **Google Drive**: Upload and share with "Anyone with link can view"
2. **YouTube**: Upload as unlisted video
3. **Loom**: Create and share via Loom link

### **Submit for Verification:**
1. **Go to**: Google Cloud Console → OAuth consent screen
2. **Click**: "Submit for verification"
3. **Upload**: Your demo video
4. **Provide**: Video link and description
5. **Submit**: Wait for review (1-2 weeks)

---

## 🎉 **Success Metrics**

### **Video Should Show:**
- ✅ **Complete user flow** from start to finish
- ✅ **OAuth permission request** and consent
- ✅ **API usage** for search and playlist creation
- ✅ **Final result** (created YouTube playlist)
- ✅ **Privacy protection** measures

### **Extension Should Work:**
- ✅ **Detect setlist.fm pages** automatically
- ✅ **Parse setlist information** correctly
- ✅ **Request OAuth permissions** smoothly
- ✅ **Create playlists** successfully
- ✅ **Add videos** in correct order

---

## ⏰ **Timeline**

- **Setup test mode**: 15-30 minutes
- **Create demo video**: 1-2 hours (including practice)
- **Submit for verification**: 15 minutes
- **Wait for review**: 1-2 weeks
- **Full access**: After verification approval

---

**Next Action**: Follow Step 1 to add yourself as a test user, then test the extension functionality. Once it's working, create the demo video following the script above.

**Status**: Ready to implement test mode  
**Goal**: Create working demo video for OAuth verification
