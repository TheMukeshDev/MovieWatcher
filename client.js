// Socket.IO connection
// Use config for server URL (supports both local and production). Default to current origin so the
// app works when deployed behind a platform-provided URL.
const socket = io(window.APP_CONFIG?.SOCKET_SERVER_URL || window.location.origin, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});

// Connection status logging
socket.on('connect', () => {
    console.log('✅ Connected to server:', socket.id);
    updateConnectionStatus(true);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
    updateConnectionStatus(false);
});

socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected:', reason);
    updateConnectionStatus(false);
});

// DOM Elements
const roomSelection = document.getElementById('roomSelection');
const watchPartyRoom = document.getElementById('watchPartyRoom');
const usernameInput = document.getElementById('usernameInput');
const roomIdInput = document.getElementById('roomIdInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const currentRoomId = document.getElementById('currentRoomId');
const userCount = document.getElementById('userCount');
const videoPlayer = document.getElementById('videoPlayer');
const videoSource = document.getElementById('videoSource');
const videoOverlay = document.getElementById('videoOverlay');
const videoUpload = document.getElementById('videoUpload');
const videoFileName = document.getElementById('videoFileName');
const uploadProgress = document.getElementById('uploadProgress');
const uploadBtn = document.getElementById('uploadBtn');
const syncStatus = document.getElementById('syncStatus');
const usersList = document.getElementById('usersList');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const imageUpload = document.getElementById('imageUpload');
const libraryBtn = document.getElementById('libraryBtn');
const libraryModal = document.getElementById('libraryModal');
const closeLibrary = document.getElementById('closeLibrary');
const libraryVideos = document.getElementById('libraryVideos');
const libraryLoading = document.getElementById('libraryLoading');
const libraryEmpty = document.getElementById('libraryEmpty');
const shareScreenBtn = document.getElementById('shareScreenBtn');
const screenShareIndicator = document.getElementById('screenShareIndicator');
const screenShareUser = document.getElementById('screenShareUser');
const toggleUsersBtn = document.getElementById('toggleUsersBtn');
const usersDropdown = document.getElementById('usersDropdown');

// Application State
let currentUsername = '';
let currentRoom = '';
let isVideoLoaded = false;
let isSyncing = false;
let videoFile = null;
let isScreenSharing = false;
let screenStream = null;

// Check screen sharing support on page load
console.log('🔍 Screen Sharing Capability Check:');
console.log('- Secure Context:', window.isSecureContext);
console.log('- Protocol:', location.protocol);
console.log('- Hostname:', location.hostname);
console.log('- Has mediaDevices:', !!navigator.mediaDevices);
console.log('- Has getDisplayMedia:', !!(navigator.mediaDevices?.getDisplayMedia));
console.log('- Browser:', navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)/)?.[0] || 'Unknown');

// Warn user if screen sharing won't work due to security context
if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    console.warn('⚠️ Screen sharing may require a secure context (HTTPS) or localhost. Consider serving over HTTPS or using a secure origin for full functionality.');
}

// Join/Create Room
joinRoomBtn.addEventListener('click', () => {
    console.log('🔘 Join/Create Room button clicked');

    const username = usernameInput.value.trim();
    const roomId = roomIdInput.value.trim() || generateRoomId();

    console.log('Username:', username);
    console.log('Room ID:', roomId);
    console.log('Socket connected:', socket.connected);

    if (!username) {
        alert('Please enter a username');
        return;
    }

    if (!socket.connected) {
        alert(`Not connected to server! Ensure the front-end can reach the Socket server (checked ${window.location.origin}). If your Socket server is hosted at a different origin set window.APP_CONFIG.SOCKET_SERVER_URL before loading the client.`);
        return;
    }

    currentUsername = username;
    currentRoom = roomId;

    console.log('Emitting joinRoom event...');
    socket.emit('joinRoom', { username, roomId });
});

// Leave Room
leaveRoomBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the room?')) {
        socket.emit('leaveRoom', { roomId: currentRoom });
        resetApp();
    }
});

// Video Upload
videoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
        // Check file size (max 10GB)
        const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
        if (file.size > maxSize) {
            alert('Video size must be less than 10GB');
            return;
        }

        // Show upload progress
        const uploadProgressEl = document.getElementById('uploadProgress');
        const uploadBtn = document.getElementById('uploadBtn');
        uploadProgressEl.classList.remove('hidden');
        uploadProgressEl.textContent = 'Preparing upload...';
        uploadBtn.style.opacity = '0.5';
        uploadBtn.style.pointerEvents = 'none';

        videoFile = file;
        const videoUrl = URL.createObjectURL(file);
        videoSource.src = videoUrl;
        videoPlayer.load();
        videoFileName.textContent = file.name;
        videoOverlay.classList.add('hidden');
        isVideoLoaded = true;

        addSystemMessage(`Uploading video: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

        // Upload video in chunks
        await uploadVideoInChunks(file);

        // Hide upload progress
        uploadProgressEl.classList.add('hidden');
        uploadBtn.style.opacity = '1';
        uploadBtn.style.pointerEvents = 'auto';

        addSystemMessage(`Video uploaded successfully!`);
    }
});

// Upload video in chunks
async function uploadVideoInChunks(file) {
    const chunkSize = 2 * 1024 * 1024; // 2MB chunks for faster uploads
    const totalChunks = Math.ceil(file.size / chunkSize);
    const maxParallelUploads = 3; // Upload 3 chunks in parallel

    return new Promise((resolve, reject) => {
        // Start upload
        socket.emit('videoUploadStart', {
            roomId: currentRoom,
            fileName: file.name,
            fileSize: file.size,
            totalChunks: totalChunks
        });

        let uploadId = null;
        let currentChunk = 0;
        let activeUploads = 0;

        // Wait for upload ready
        socket.once('videoUploadReady', (data) => {
            uploadId = data.uploadId;
            // Start parallel uploads
            for (let i = 0; i < maxParallelUploads; i++) {
                sendNextChunk();
            }
        });

        // Send chunks
        function sendNextChunk() {
            if (currentChunk >= totalChunks) {
                // Check if all uploads complete
                if (activeUploads === 0) {
                    socket.emit('videoUploadComplete', { uploadId });
                }
                return;
            }

            const chunkToSend = currentChunk;
            currentChunk++;
            activeUploads++;

            const start = chunkToSend * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const reader = new FileReader();
            reader.onload = (e) => {
                // Extract base64 data from data URL by removing the prefix
                const base64Data = e.target.result.split(',')[1];
                socket.emit('videoUploadChunk', {
                    uploadId: uploadId,
                    chunkIndex: chunkToSend,
                    chunkData: base64Data
                });
                activeUploads--;
                sendNextChunk(); // Send next chunk
            };
            reader.onerror = reject;
            reader.readAsDataURL(chunk);
        }

        // Progress updates
        socket.on('videoUploadProgress', (data) => {
            if (data.uploadId === uploadId) {
                const uploadProgressEl = document.getElementById('uploadProgress');
                uploadProgressEl.textContent = `Uploading... ${data.progress}% (${data.received}/${data.total} chunks)`;
            }
        });

        socket.once('videoUploadAssembling', (data) => {
            if (data.uploadId === uploadId) {
                const uploadProgressEl = document.getElementById('uploadProgress');
                uploadProgressEl.textContent = 'Assembling video...';
            }
        });

        socket.once('videoUploadSuccess', (data) => {
            if (data.uploadId === uploadId) {
                resolve();
            }
        });
    });
}

// Video Library Functionality
libraryBtn.addEventListener('click', () => {
    openLibrary();
});

closeLibrary.addEventListener('click', () => {
    libraryModal.classList.add('hidden');
});

libraryModal.addEventListener('click', (e) => {
    if (e.target === libraryModal) {
        libraryModal.classList.add('hidden');
    }
});

async function openLibrary() {
    libraryModal.classList.remove('hidden');
    libraryLoading.classList.remove('hidden');
    libraryVideos.classList.add('hidden');
    libraryEmpty.classList.add('hidden');

    try {
        const response = await fetch('/api/videos');
        const data = await response.json();

        libraryLoading.classList.add('hidden');

        if (data.videos && data.videos.length > 0) {
            libraryVideos.classList.remove('hidden');
            libraryVideos.innerHTML = '';

            data.videos.forEach(video => {
                const videoItem = document.createElement('div');
                videoItem.className = 'library-video-item';
                videoItem.innerHTML = `
                    <div class="video-info">
                        <div class="video-name">${escapeHtml(video.name)}</div>
                        <div class="video-size">${formatFileSize(video.size)}</div>
                    </div>
                    <div class="video-icon">🎬</div>
                `;
                videoItem.addEventListener('click', () => {
                    loadLibraryVideo(video);
                });
                libraryVideos.appendChild(videoItem);
            });
        } else {
            libraryEmpty.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading library:', error);
        libraryLoading.classList.add('hidden');
        libraryEmpty.classList.remove('hidden');
    }
}

function loadLibraryVideo(video) {
    libraryModal.classList.add('hidden');

    // Load video locally
    videoSource.src = video.path;
    videoPlayer.load();
    videoFileName.textContent = video.name;
    videoOverlay.classList.add('hidden');
    isVideoLoaded = true;

    // Notify server and other users
    socket.emit('loadLibraryVideo', {
        roomId: currentRoom,
        videoPath: video.path,
        fileName: video.name
    });

    addSystemMessage(`You loaded from library: ${video.name}`);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Screen Sharing Functionality
shareScreenBtn.addEventListener('click', async () => {
    if (!isScreenSharing) {
        await startScreenShare();
    } else {
        stopScreenShare();
    }
});

async function startScreenShare() {
    try {
        // Check if we're on a secure context (required for screen sharing)
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            alert(`❌ Screen Sharing Requires Secure Connection\n\n⚠️ Screen sharing requires a secure origin (HTTPS) or localhost.\n\n✅ To use screen sharing:\n• Serve the app over HTTPS, or\n• Open the app on the machine running the browser using localhost (${window.location.origin.replace(/:\d+$/, '') || 'localhost'})\n\n💡 All other features work normally.`);
            return;
        }

        // Check if the API is available
        if (!navigator.mediaDevices) {
            alert('❌ Screen sharing is not available.\n\nPlease check:\n• You are using Chrome, Edge, or Firefox\n• The browser has permission to access media devices');
            return;
        }

        if (!navigator.mediaDevices.getDisplayMedia) {
            alert('❌ Screen Sharing Not Supported\n\n✅ Please use:\n• Google Chrome (latest version)\n• Microsoft Edge (latest version)\n• Mozilla Firefox (latest version)\n\n⚠️ Make sure your browser is up to date!');
            return;
        }

        // Show instruction
        addSystemMessage('📺 Browser will ask for screen sharing permission...');

        // Request screen sharing with proper error handling
        const constraints = {
            video: {
                cursor: "always"
            },
            audio: false
        };

        screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

        // Successfully got the stream
        videoPlayer.srcObject = screenStream;
        videoPlayer.muted = false;
        await videoPlayer.play();
        videoOverlay.classList.add('hidden');
        isVideoLoaded = true;

        isScreenSharing = true;
        shareScreenBtn.textContent = '🛑 Stop Sharing';
        shareScreenBtn.classList.add('active');

        // Notify other users
        socket.emit('startScreenShare', {
            roomId: currentRoom,
            username: currentUsername
        });

        addSystemMessage('✅ You started screen sharing successfully!');

        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
            stopScreenShare();
            addSystemMessage('Screen sharing stopped');
        });

    } catch (error) {
        console.error('Screen share error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            isSecureContext: window.isSecureContext,
            hasGetDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
            protocol: location.protocol,
            hostname: location.hostname
        });

        // Handle specific error cases with clear instructions
        if (error.name === 'NotAllowedError') {
            alert('❌ Permission Denied\n\n📌 To share your screen:\n\n1️⃣ Click "Share Screen" button again\n2️⃣ In the popup, select:\n   • Entire Screen, or\n   • Application Window, or\n   • Chrome Tab\n3️⃣ Click the blue "Share" button\n\n⚠️ Do NOT click "Cancel"');
        } else if (error.name === 'NotFoundError') {
            alert('❌ No Screen Found\n\nMake sure you have a display connected and try again.');
        } else if (error.name === 'NotReadableError') {
            alert('❌ Screen Already In Use\n\nAnother application might be using screen capture.\nClose other screen sharing apps and try again.');
        } else if (error.name === 'AbortError') {
            // User cancelled the dialog - this is normal
            addSystemMessage('Screen sharing cancelled');
        } else if (error.name === 'TypeError' || error.message.includes('getDisplayMedia')) {
            // API not available
            alert(`❌ Screen Sharing Not Available\n\n⚠️ Screen sharing may be blocked or unavailable on this origin (${window.location.origin}).\n\n✅ Try one of the following:\n• Open the app from localhost on this device, e.g. http://localhost:${location.port || '3000'}\n• Serve the site over HTTPS\n• Use a modern browser (Chrome, Edge, Firefox latest)\n\nNote: Video upload and library functionality should still work.`);
        } else if (error.name === 'NotSupportedError') {
            alert('❌ Screen Sharing Not Supported\n\nThis might be because you are on an insecure origin or the browser does not support getDisplayMedia. Try opening the app from localhost or enabling HTTPS.');
        } else {
            alert(`❌ Screen Sharing Failed\n\nError: ${error.message}\n\n🔧 Troubleshooting:\n✓ Use Chrome, Edge, or Firefox (latest)\n✓ Grant permission when prompted\n✓ Select a screen/window to share\n✓ Serve the app from a secure origin (HTTPS) or localhost for best results\n\n💡 If on another device, try uploading video instead!`);
        }
    }
}

function stopScreenShare() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }

    videoPlayer.srcObject = null;
    isScreenSharing = false;
    shareScreenBtn.textContent = '🖥️ Share Screen';
    shareScreenBtn.classList.remove('active');

    // Notify other users
    socket.emit('stopScreenShare', {
        roomId: currentRoom,
        username: currentUsername
    });

    addSystemMessage('You stopped screen sharing');
}

// Toggle Users Dropdown
toggleUsersBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    usersDropdown.classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!usersDropdown.classList.contains('hidden') &&
        !toggleUsersBtn.contains(e.target) &&
        !usersDropdown.contains(e.target)) {
        usersDropdown.classList.add('hidden');
    }
});

// Video Player Events
videoPlayer.addEventListener('play', () => {
    if (!isSyncing) {
        socket.emit('videoPlay', {
            roomId: currentRoom,
            currentTime: videoPlayer.currentTime
        });
    }
});

videoPlayer.addEventListener('pause', () => {
    if (!isSyncing) {
        socket.emit('videoPause', {
            roomId: currentRoom,
            currentTime: videoPlayer.currentTime
        });
    }
});

videoPlayer.addEventListener('seeked', () => {
    if (!isSyncing) {
        socket.emit('videoSeek', {
            roomId: currentRoom,
            currentTime: videoPlayer.currentTime
        });
    }
});

// Chat Functionality
sendMessageBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage(messageType = 'text', content = null) {
    const message = content || chatInput.value.trim();
    if (message) {
        socket.emit('chatMessage', {
            roomId: currentRoom,
            username: currentUsername,
            message: message,
            messageType: messageType, // 'text', 'image', 'sticker', 'emoji'
            timestamp: new Date().toISOString()
        });
        chatInput.value = '';
    }
}

// Emoji Picker Functionality
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
    emojiBtn.classList.toggle('active');
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.classList.add('hidden');
        emojiBtn.classList.remove('active');
    }
});

// Emoji Picker Tabs
const pickerTabs = document.querySelectorAll('.picker-tab');
pickerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        pickerTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.picker-tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        document.getElementById(tabName + 'Tab').classList.add('active');
    });
});

// Emoji Selection
const emojiItems = document.querySelectorAll('.emoji-item');
emojiItems.forEach(emoji => {
    emoji.addEventListener('click', () => {
        chatInput.value += emoji.textContent;
        chatInput.focus();
    });
});

// Sticker Selection
const stickerItems = document.querySelectorAll('.sticker-item');
stickerItems.forEach(sticker => {
    sticker.addEventListener('click', () => {
        const stickerEmoji = sticker.dataset.sticker;
        sendMessage('sticker', stickerEmoji);
        emojiPicker.classList.add('hidden');
        emojiBtn.classList.remove('active');
    });
});

// Image Upload
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            sendMessage('image', imageData);
        };
        reader.readAsDataURL(file);
    }
    // Reset input
    imageUpload.value = '';
});

// Socket Event Handlers
socket.on('roomJoined', (data) => {
    console.log('✅ Room joined successfully:', data);
    currentRoomId.textContent = data.roomId;
    roomSelection.classList.remove('active');
    watchPartyRoom.classList.add('active');
    addSystemMessage(`Welcome to room ${data.roomId}!`);
});

socket.on('userJoined', (data) => {
    updateUsersList(data.users);
    userCount.textContent = data.users.length;
    if (data.username !== currentUsername) {
        addSystemMessage(`${data.username} joined the room`);
    }
});

socket.on('userLeft', (data) => {
    updateUsersList(data.users);
    userCount.textContent = data.users.length;
    addSystemMessage(`${data.username} left the room`);
});

socket.on('loadRoomVideo', (data) => {
    console.log('📥 Receiving video from server...', data.fileName);

    // Load the video data from the server
    // If server sent a data URL, extract mime and set the <source> type so the player knows the codec
    if (typeof data.videoData === 'string' && data.videoData.startsWith('data:')) {
        const m = data.videoData.match(/^data:([^;]+);base64,/);
        if (m && m[1]) {
            videoSource.type = m[1];
        } else {
            videoSource.removeAttribute('type');
        }
        videoSource.src = data.videoData;
    } else {
        // Otherwise assume it's a URL path
        videoSource.removeAttribute('type');
        videoSource.src = data.videoData;
    }
    // Reload player to pick up new source
    try { videoPlayer.load(); } catch (e) { console.warn('Video load error:', e); }
    videoFileName.textContent = data.fileName;
    videoOverlay.classList.add('hidden');
    isVideoLoaded = true;

    addSystemMessage(`${data.uploader} shared video: ${data.fileName}`);
});

// Handle server-side upload assembly errors
socket.on('videoUploadError', (data) => {
    console.error('Video upload error from server:', data);
    addSystemMessage(`❌ Video upload failed: ${data?.message || 'Unknown error'}`);
});

socket.on('loadLibraryVideo', (data) => {
    console.log('📚 Loading library video...', data.fileName);

    // Load the video from server path
    videoSource.src = data.videoPath;
    videoPlayer.load();
    videoFileName.textContent = data.fileName;
    videoOverlay.classList.add('hidden');
    isVideoLoaded = true;

    if (data.uploader !== currentUsername) {
        addSystemMessage(`${data.uploader} loaded from library: ${data.fileName}`);
    }
});

socket.on('videoLoaded', (data) => {
    if (data.username !== currentUsername) {
        addSystemMessage(`${data.username} loaded a video: ${data.fileName}`);
    }
});

socket.on('userStartedScreenShare', (data) => {
    screenShareIndicator.classList.remove('hidden');
    screenShareUser.textContent = data.username;
    addSystemMessage(`${data.username} started screen sharing`);
});

socket.on('userStoppedScreenShare', (data) => {
    screenShareIndicator.classList.add('hidden');
    addSystemMessage(`${data.username} stopped screen sharing`);
});

socket.on('syncVideoPlay', (data) => {
    if (isVideoLoaded) {
        isSyncing = true;
        videoPlayer.currentTime = data.currentTime;
        videoPlayer.play().catch(err => console.log('Play error:', err));
        setTimeout(() => { isSyncing = false; }, 500);
        showSyncStatus();
    }
});

socket.on('syncVideoPause', (data) => {
    if (isVideoLoaded) {
        isSyncing = true;
        videoPlayer.currentTime = data.currentTime;
        videoPlayer.pause();
        setTimeout(() => { isSyncing = false; }, 500);
        showSyncStatus();
    }
});

socket.on('syncVideoSeek', (data) => {
    if (isVideoLoaded) {
        isSyncing = true;
        videoPlayer.currentTime = data.currentTime;
        setTimeout(() => { isSyncing = false; }, 500);
        showSyncStatus();
    }
});

socket.on('receiveMessage', (data) => {
    addChatMessage(data);
});

socket.on('roomError', (data) => {
    alert(data.message);
});

// Helper Functions
function generateRoomId() {
    return 'room-' + Math.random().toString(36).substr(2, 9);
}

function updateUsersList(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        if (user.username === currentUsername) {
            li.style.fontWeight = 'bold';
            li.textContent += ' (You)';
        }
        usersList.appendChild(li);
    });
}

function addChatMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';

    if (data.username === currentUsername) {
        messageDiv.classList.add('own');
    } else {
        messageDiv.classList.add('user');
    }

    const time = new Date(data.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    let messageContent = '';

    // Handle different message types
    switch (data.messageType) {
        case 'image':
            messageContent = `<img src="${data.message}" class="message-image" onclick="window.open('${data.message}', '_blank')" alt="Shared image">`;
            break;
        case 'sticker':
            messageContent = `<div class="message-sticker">${data.message}</div>`;
            break;
        case 'emoji':
        case 'text':
        default:
            messageContent = `<div class="message-text">${escapeHtml(data.message)}</div>`;
            break;
    }

    messageDiv.innerHTML = `
        <div class="message-sender">${escapeHtml(data.username)}</div>
        ${messageContent}
        <div class="message-time">${time}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system';
    messageDiv.innerHTML = `<div class="message-text">${escapeHtml(message)}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showSyncStatus() {
    syncStatus.textContent = '🔄 Syncing...';
    syncStatus.classList.add('syncing');
    setTimeout(() => {
        syncStatus.textContent = '⚡ Synced';
        syncStatus.classList.remove('syncing');
    }, 1000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetApp() {
    roomSelection.classList.add('active');
    watchPartyRoom.classList.remove('active');
    usernameInput.value = '';
    roomIdInput.value = '';
    chatMessages.innerHTML = '';
    usersList.innerHTML = '';
    videoSource.src = '';
    videoPlayer.load();
    videoFileName.textContent = 'No video selected';
    videoOverlay.classList.remove('hidden');
    isVideoLoaded = false;
    videoFile = null;
    currentUsername = '';
    currentRoom = '';
}

// Disconnect handling
socket.on('disconnect', () => {
    addSystemMessage('Disconnected from server. Please refresh the page.');
});

window.addEventListener('beforeunload', () => {
    if (currentRoom) {
        socket.emit('leaveRoom', { roomId: currentRoom });
    }
});

// Connection Status Indicator
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;

    if (isConnected) {
        statusElement.className = 'connection-status connected';
        statusElement.innerHTML = '✅ Connected to server - Ready to join!';
    } else {
        statusElement.className = 'connection-status disconnected';
        statusElement.innerHTML = `⚠️ Not connected to server - Make sure the client can reach the Socket server (same origin as the app: <strong>${location.origin}</strong>) or set <code>window.APP_CONFIG.SOCKET_SERVER_URL</code> to your server URL.`;
    }
}

// Check connection status on load
setTimeout(() => {
    updateConnectionStatus(socket.connected);
}, 500);
