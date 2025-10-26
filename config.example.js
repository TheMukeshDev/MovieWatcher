// EXAMPLE Configuration - Copy this to config.js and update with your backend URL
const config = {
    // ===========================================
    // UPDATE THIS BASED ON YOUR SETUP
    // ===========================================

    // Option 1: Local Network Access (All devices on same WiFi)
    // SOCKET_SERVER_URL: 'http://10.168.144.228:3000'

    // Option 2: Localhost (This computer only)
    // SOCKET_SERVER_URL: 'http://localhost:3000'

    // Option 3: Deployed to Render
    // SOCKET_SERVER_URL: 'https://watch-party-backend.onrender.com'

    // Option 4: Deployed to Railway  
    // SOCKET_SERVER_URL: 'https://watch-party-backend.up.railway.app'

    // Option 5: Deployed to Vercel
    // SOCKET_SERVER_URL: 'https://watch-party-backend.vercel.app'

    // Option 6: Custom domain
    // SOCKET_SERVER_URL: 'https://api.yourdomain.com'

    // Current: Auto-detect (works for local development)
    SOCKET_SERVER_URL: `http://${window.location.hostname}:3000`,

    IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
};

window.APP_CONFIG = config;
