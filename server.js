const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

// CORS configuration for GitHub Pages and other frontends
// Configure Socket.IO. Make allowed origins configurable via ALLOWED_ORIGINS env var
// ALLOWED_ORIGINS can be a comma-separated list (e.g. "https://example.com,https://app.example.com").
// If not set, allow all origins which is convenient for generic hosting; set appropriately for production.
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : '*';

const io = new Server(server, {
    maxHttpBufferSize: 1024 * 1024 * 1024, // 1GB buffer for faster chunks
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'], // Prioritize websocket for speed
    upgradeTimeout: 30000,
    perMessageDeflate: false, // Disable compression for speed
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

// CORS middleware for REST API
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Increase payload limit for large uploads
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve videos folder with proper MIME types
app.use('/videos', (req, res, next) => {
    res.setHeader('Content-Type', 'video/mp4');
    express.static(path.join(__dirname, 'videos'))(req, res, next);
});

// Store active rooms and users
const rooms = new Map();
// Store video data for each room (using chunks)
const roomVideos = new Map();
// Store video chunks during upload
const videoChunks = new Map();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API to get list of videos in the videos folder
app.get('/api/videos', (req, res) => {
    const videosDir = path.join(__dirname, 'videos');

    fs.readdir(videosDir, (err, files) => {
        if (err) {
            return res.json({ videos: [] });
        }

        // Filter for video files
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v'];
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return videoExtensions.includes(ext);
        }).map(file => {
            const filePath = path.join(videosDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                path: `/videos/${file}`
            };
        });

        res.json({ videos: videoFiles });
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join Room
    socket.on('joinRoom', (data) => {
        console.log('📥 joinRoom event received:', data);
        const { username, roomId } = data;

        if (!username || !roomId) {
            console.error('❌ Invalid join room data:', data);
            socket.emit('roomError', { message: 'Invalid username or room ID' });
            return;
        }

        // Leave previous room if any
        const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        previousRooms.forEach(room => {
            socket.leave(room);
            updateRoomUsers(room, socket.id, username, 'left');
        });

        // Join new room
        socket.join(roomId);
        console.log(`✅ User ${username} joined room ${roomId}`);

        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                users: [],
                videoState: {
                    isPlaying: false,
                    currentTime: 0,
                    videoLoaded: false
                }
            });
            console.log(`🆕 Created new room: ${roomId}`);
        }

        // Add user to room
        const room = rooms.get(roomId);
        const userExists = room.users.find(u => u.id === socket.id);

        if (!userExists) {
            room.users.push({
                id: socket.id,
                username: username
            });
        }

        // Send confirmation to user
        socket.emit('roomJoined', {
            roomId: roomId,
            users: room.users
        });

        // If room has a video, send it to the new user
        if (roomVideos.has(roomId)) {
            const videoData = roomVideos.get(roomId);
            if (videoData.isLibrary) {
                // Send library video path
                socket.emit('loadLibraryVideo', {
                    videoPath: videoData.path,
                    fileName: videoData.fileName,
                    uploader: videoData.uploader
                });
            } else {
                // Send uploaded video data
                socket.emit('loadRoomVideo', {
                    videoData: videoData.data,
                    fileName: videoData.fileName,
                    uploader: videoData.uploader
                });
            }
        }

        // Notify others in room
        socket.to(roomId).emit('userJoined', {
            username: username,
            users: room.users
        });

        console.log(`${username} joined room ${roomId}`);
    });

    // Leave Room
    socket.on('leaveRoom', (data) => {
        const { roomId } = data;
        handleUserLeave(socket, roomId);
    });

    // Video Upload - Start chunked upload
    socket.on('videoUploadStart', (data) => {
        const { roomId, fileName, fileSize, totalChunks } = data;
        const uploadId = `${roomId}_${socket.id}_${Date.now()}`;

        videoChunks.set(uploadId, {
            roomId,
            fileName,
            fileSize,
            totalChunks,
            receivedChunks: [],
            uploaderId: socket.id
        });

        socket.emit('videoUploadReady', { uploadId });
        console.log(`📤 Starting upload: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB) in ${totalChunks} chunks`);
    });

    // Video Upload - Receive chunk
    socket.on('videoUploadChunk', (data) => {
        const { uploadId, chunkIndex, chunkData } = data;
        const upload = videoChunks.get(uploadId);

        if (upload) {
            upload.receivedChunks[chunkIndex] = chunkData;
            const progress = ((upload.receivedChunks.filter(c => c).length / upload.totalChunks) * 100).toFixed(1);

            // Send progress update
            socket.emit('videoUploadProgress', {
                uploadId,
                progress: parseFloat(progress),
                received: upload.receivedChunks.filter(c => c).length,
                total: upload.totalChunks
            });

            // Check if all chunks received
            if (upload.receivedChunks.filter(c => c).length === upload.totalChunks) {
                console.log(`✅ All chunks received for ${upload.fileName}, assembling...`);
                socket.emit('videoUploadAssembling', { uploadId });
            }
        }
    });

    // Video Upload - Complete
    socket.on('videoUploadComplete', (data) => {
        const { uploadId } = data;
        const upload = videoChunks.get(uploadId);

        if (upload) {
            const room = rooms.get(upload.roomId);
            if (room) {
                const user = room.users.find(u => u.id === socket.id);
                if (user) {
                    // Create videos directory if it doesn't exist
                    const videosDir = path.join(__dirname, 'videos');
                    if (!fs.existsSync(videosDir)) {
                        fs.mkdirSync(videosDir);
                    }

                    // Combine all chunks and convert to buffer
                    const base64Data = upload.receivedChunks.join('');
                    const buffer = Buffer.from(base64Data, 'base64');

                    // Save video to disk
                    const safeFileName = upload.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const filePath = path.join(videosDir, safeFileName);
                    fs.writeFileSync(filePath, buffer);
                    const videoPath = `/videos/${safeFileName}`;

                    // Store video data for this room
                    roomVideos.set(upload.roomId, {
                        path: videoPath,
                        fileName: upload.fileName,
                        fileSize: upload.fileSize,
                        uploader: user.username,
                        isLibrary: true
                    });

                    console.log(`✅ Video "${upload.fileName}" (${(upload.fileSize / (1024 * 1024)).toFixed(2)} MB) uploaded to room ${upload.roomId} by ${user.username} and saved to disk`);

                    // Clean up chunks
                    videoChunks.delete(uploadId);

                    // Notify all users in room to load this video
                    io.to(upload.roomId).emit('loadLibraryVideo', {
                        videoPath: videoPath,
                        fileName: upload.fileName,
                        uploader: user.username
                    });

                    socket.emit('videoUploadSuccess', { uploadId });
                }
            }
        }
    });

    // Legacy: Video Loaded (for backward compatibility)
    socket.on('videoLoaded', (data) => {
        const { roomId, fileName, videoData } = data;
        const room = rooms.get(roomId);

        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                // Store video data for this room
                roomVideos.set(roomId, {
                    data: videoData,
                    fileName: fileName,
                    uploader: user.username
                });

                console.log(`Video "${fileName}" uploaded to room ${roomId} by ${user.username}`);

                // Send video to all OTHER users in room (excluding uploader)
                socket.to(roomId).emit('loadRoomVideo', {
                    videoData: videoData,
                    fileName: fileName,
                    uploader: user.username
                });

                // Notify all users about the video load (including uploader)
                io.to(roomId).emit('videoLoaded', {
                    username: user.username,
                    fileName: fileName
                });
            }
        }
    });

    // Load video from server library
    socket.on('loadLibraryVideo', (data) => {
        const { roomId, videoPath, fileName } = data;
        console.log('🎥 Loading library video:', { roomId, videoPath, fileName });

        const room = rooms.get(roomId);
        if (!room) {
            console.error('❌ Room not found:', roomId);
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const user = room.users.find(u => u.id === socket.id);
        if (user) {
            // Verify video file exists
            const videosDir = path.join(__dirname, 'videos');
            const videoFile = path.join(videosDir, path.basename(videoPath));

            if (!fs.existsSync(videoFile)) {
                console.error('❌ Video file not found:', videoFile);
                socket.emit('error', { message: 'Video file not found' });
                return;
            }
            // Store video info for this room
            roomVideos.set(roomId, {
                path: videoPath,
                fileName: fileName,
                uploader: user.username,
                isLibrary: true
            });

            console.log(`📚 Library video "${fileName}" loaded in room ${roomId} by ${user.username}`);

            // Notify all users in room to load this video
            io.to(roomId).emit('loadLibraryVideo', {
                videoPath: videoPath,
                fileName: fileName,
                uploader: user.username
            });
        }
    }
    });

// Video Play
socket.on('videoPlay', (data) => {
    const { roomId, currentTime } = data;
    const room = rooms.get(roomId);

    if (room) {
        room.videoState.isPlaying = true;
        room.videoState.currentTime = currentTime;

        // Sync play with other users
        socket.to(roomId).emit('syncVideoPlay', {
            currentTime: currentTime
        });
    }
});

// Video Pause
socket.on('videoPause', (data) => {
    const { roomId, currentTime } = data;
    const room = rooms.get(roomId);

    if (room) {
        room.videoState.isPlaying = false;
        room.videoState.currentTime = currentTime;

        // Sync pause with other users
        socket.to(roomId).emit('syncVideoPause', {
            currentTime: currentTime
        });
    }
});

// Video Seek
socket.on('videoSeek', (data) => {
    const { roomId, currentTime } = data;
    const room = rooms.get(roomId);

    if (room) {
        room.videoState.currentTime = currentTime;

        // Sync seek with other users
        socket.to(roomId).emit('syncVideoSeek', {
            currentTime: currentTime
        });
    }
});

// Chat Message
socket.on('chatMessage', (data) => {
    const { roomId, username, message, messageType, timestamp } = data;

    // Validate message type
    const validTypes = ['text', 'image', 'sticker', 'emoji'];
    const type = validTypes.includes(messageType) ? messageType : 'text';

    // Broadcast message to all users in room (including sender)
    io.to(roomId).emit('receiveMessage', {
        username: username,
        message: message,
        messageType: type,
        timestamp: timestamp
    });

    // Log message (truncate images for readability)
    const logMessage = type === 'image' ? '[Image]' : message;
    console.log(`[${roomId}] ${username} (${type}): ${logMessage}`);
});

// Screen Sharing - Start
socket.on('startScreenShare', (data) => {
    const { roomId, username } = data;
    console.log(`🖥️ ${username} started screen sharing in room ${roomId}`);

    // Notify all users in room that screen sharing started
    socket.to(roomId).emit('userStartedScreenShare', {
        username: username,
        userId: socket.id
    });
});

// Screen Sharing - Stop
socket.on('stopScreenShare', (data) => {
    const { roomId, username } = data;
    console.log(`🖥️ ${username} stopped screen sharing in room ${roomId}`);

    // Notify all users in room that screen sharing stopped
    socket.to(roomId).emit('userStoppedScreenShare', {
        username: username,
        userId: socket.id
    });
});

// Screen Sharing - Stream data
socket.on('screenShareStream', (data) => {
    const { roomId, streamData } = data;

    // Broadcast screen share stream to other users
    socket.to(roomId).emit('receiveScreenShare', {
        streamData: streamData,
        userId: socket.id
    });
});

// Disconnect
socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Find and remove user from all rooms
    rooms.forEach((room, roomId) => {
        const userIndex = room.users.findIndex(u => u.id === socket.id);
        if (userIndex !== -1) {
            const username = room.users[userIndex].username;
            room.users.splice(userIndex, 1);

            // Notify remaining users
            io.to(roomId).emit('userLeft', {
                username: username,
                users: room.users
            });

            // Delete room if empty
            if (room.users.length === 0) {
                rooms.delete(roomId);
                roomVideos.delete(roomId); // Clean up video data
                console.log(`Room ${roomId} deleted (empty)`);
            }
        }
    });
});
});

// Helper function to handle user leaving
function handleUserLeave(socket, roomId) {
    const room = rooms.get(roomId);

    if (room) {
        const userIndex = room.users.findIndex(u => u.id === socket.id);
        if (userIndex !== -1) {
            const username = room.users[userIndex].username;
            room.users.splice(userIndex, 1);

            socket.leave(roomId);

            // Notify remaining users
            io.to(roomId).emit('userLeft', {
                username: username,
                users: room.users
            });

            // Delete room if empty
            if (room.users.length === 0) {
                rooms.delete(roomId);
                roomVideos.delete(roomId); // Clean up video data
                console.log(`Room ${roomId} deleted (empty)`);
            }

            console.log(`${username} left room ${roomId}`);
        }
    }
}

// Helper function to update room users
function updateRoomUsers(roomId, socketId, username, action) {
    const room = rooms.get(roomId);

    if (room) {
        if (action === 'left') {
            const userIndex = room.users.findIndex(u => u.id === socketId);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);

                io.to(roomId).emit('userLeft', {
                    username: username,
                    users: room.users
                });

                if (room.users.length === 0) {
                    rooms.delete(roomId);
                    roomVideos.delete(roomId); // Clean up video data
                }
            }
        }
    }
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 Watch Party server running on port ${PORT}`);
    // Helpful note for local development
    if (!process.env.CI && process.env.NODE_ENV !== 'production') {
        console.log(`🧪 Local dev: visit ${process.env.LOCAL_ORIGIN || `http://localhost:${PORT}`} in your browser`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
