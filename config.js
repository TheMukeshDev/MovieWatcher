// Configuration for deployment
const config = {
    // Use the current hostname for backend connection (works for any IP)
    SOCKET_SERVER_URL: `http://${window.location.hostname}:3000`,

    // Production mode check
    IS_PRODUCTION: false
};

// Make config available globally
window.APP_CONFIG = config;
