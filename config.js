// Configuration for deployment
// Updated to point to the deployed Render URL by default.
const config = {
    // Default Socket server URL for this deployment. You can override by editing this file
    // or by setting window.APP_CONFIG before loading client.js.
    SOCKET_SERVER_URL: 'https://moviewatcher-26b7.onrender.com',

    // Production mode check
    IS_PRODUCTION: true
};

// Make config available globally
window.APP_CONFIG = config;
