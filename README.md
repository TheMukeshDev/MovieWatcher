# 🎬 Watch Party

A real-time watch party application where you can watch videos together with friends, featuring synchronized video playback, real-time chat, and room management.

## ✨ Features

- 🎥 **Synchronized Video Playback** - Watch videos together in perfect sync
- 💬 **Real-time Chat** - Chat with friends while watching
- 🏠 **Room Management** - Create or join rooms with custom IDs
- 📁 **Local Video Upload** - Upload any video file from your computer
- 👥 **User Presence** - See who's online in your room
- 🔄 **Auto-Sync** - Automatic synchronization of play, pause, and seek actions
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation

1. **Navigate to the project directory:**
   ```powershell
   cd "c:\Users\mukes\OneDrive\Desktop\MovieWatcher"
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

### Running the Application

1. **Start the server:**
   ```powershell
   npm start
   ```

   Or for development with auto-restart:
   ```powershell
   npm run dev
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3000`

3. **Invite friends:**
   Share the same URL and room ID with your friends!

## 📖 How to Use

### Creating or Joining a Room

1. Enter your username
2. (Optional) Enter a Room ID to join an existing room
3. Leave Room ID blank to create a new random room
4. Click "Join/Create Room"

### Uploading a Video

1. Click the "📁 Upload Video" button
2. Select a video file from your computer (MP4, WebM, etc.)
3. The video will load for all users in the room

### Watching Together

- **Play/Pause**: Use the video controls - all users will be synced
- **Seek**: Jump to any part of the video - others will follow
- **Chat**: Type messages in the chat box to communicate

### Video Synchronization

- When you play, pause, or seek the video, everyone in the room sees the same action
- The sync status indicator shows when synchronization is happening
- All users stay in perfect sync automatically

## 🎯 Technical Details

### Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.IO
- **Video**: HTML5 Video API

### Project Structure

```
MovieWatcher/
├── index.html          # Main HTML file
├── style.css           # Styling and responsive design
├── client.js           # Client-side JavaScript
├── server.js           # Node.js server with Socket.IO
├── package.json        # Dependencies and scripts
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

### How It Works

1. **Server**: Express server serves static files and handles Socket.IO connections
2. **Rooms**: Users can create or join rooms identified by unique IDs
3. **Video Sync**: When a user performs an action (play/pause/seek), it's broadcast to all users in the room
4. **Chat**: Messages are broadcast in real-time to all room participants
5. **State Management**: Server maintains room state and user lists

## 🎮 Features Explained

### Room Management
- Rooms are created automatically when the first user joins
- Rooms are deleted when the last user leaves
- Each room has its own isolated chat and video state

### Video Synchronization
- Uses Socket.IO events to broadcast video actions
- Includes debouncing to prevent sync loops
- Maintains current time and play state on the server

### Chat System
- Real-time message delivery
- System messages for user join/leave events
- Timestamps on all messages
- XSS protection with HTML escaping

## 🛠️ Customization

### Change Port
Edit `server.js` and modify the PORT constant:
```javascript
const PORT = 3000; // Change to your preferred port
```

### Styling
All styles are in `style.css` - customize colors, fonts, and layout as needed.

### Video Formats
The application supports all HTML5 video formats:
- MP4 (H.264)
- WebM
- Ogg
- And more (browser-dependent)

## 📝 Tips

1. **Video Files**: Works best with locally stored video files
2. **Network**: For best sync, all users should have good internet connections
3. **Room IDs**: Share the exact Room ID with friends to join the same room
4. **Browser**: Use modern browsers (Chrome, Firefox, Edge, Safari) for best compatibility

## 🐛 Troubleshooting

### Video Won't Play
- Check if the video format is supported by your browser
- Ensure the file size isn't too large
- Try a different video file

### Sync Issues
- Refresh the page to reconnect
- Check your internet connection
- Make sure all users are in the same room

### Can't Join Room
- Verify the Room ID is correct
- Check if the server is running
- Look at browser console for errors

## 🔒 Security Notes

- This is a development/local application
- For production use, add authentication
- Consider implementing user permissions
- Add rate limiting for chat messages
- Validate all user inputs on the server

## 📄 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Feel free to fork, modify, and submit pull requests!

## 💡 Future Enhancements

- Video streaming from URLs
- User authentication
- Persistent room history
- Voice chat integration
- Video playlists
- Screen sharing
- Emojis and reactions
- File size limits and validation

---

**Enjoy watching together! 🍿**
