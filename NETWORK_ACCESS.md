# 🌐 Network Access Guide

## Access Watch Party from Any Device on Your Network

### 🖥️ Your Network IP: `10.168.144.228`

## 📋 Setup Instructions:

### 1. Start the Server
```powershell
npm start
```

The server will show you:
```
🎬 Watch Party server running!

📱 Access on this device:
   http://localhost:3000

🌐 Access from other devices on your network:
   http://10.168.144.228:3000
```

### 2. Access from Any Device

#### On the Same Computer:
- Open browser: `http://localhost:3000`
- OR: `http://10.168.144.228:3000`

#### On Phone/Tablet/Other Computer (Same WiFi):
- Open browser: `http://10.168.144.228:3000`

### 3. Allow Firewall Access (If Needed)

If devices can't connect, allow Node.js through Windows Firewall:

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Watch Party" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

OR manually:
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Port: 3000, TCP
5. Allow the connection
6. Name it "Watch Party"

## 🎯 How to Use:

### Host (You):
1. Start server: `npm start`
2. Share URL with friends: `http://10.168.144.228:3000`
3. Create/join a room
4. Upload a video

### Friends on Same WiFi:
1. Open: `http://10.168.144.228:3000`
2. Join the same room (use Room ID you share)
3. Watch together - video is already loaded!

## 🔧 Troubleshooting:

### Can't Connect from Other Devices?

1. **Check WiFi**: All devices must be on the same WiFi network
2. **Check Firewall**: Allow port 3000 (see above)
3. **Check IP**: Your IP might change - server shows current IP when starting
4. **Try localhost**: On same computer, use `http://localhost:3000`

### Find Your Current IP:
```powershell
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (usually starts with 10.x or 192.168.x)

## 📱 Mobile Access:

1. Connect phone to same WiFi as computer
2. Open browser on phone
3. Type: `http://10.168.144.228:3000`
4. Join room and watch together!

## 🚀 Port Configuration:

Default port: **3000**

To change port, edit `server.js`:
```javascript
const PORT = process.env.PORT || 3000; // Change 3000 to your port
```

Then access at: `http://10.168.144.228:YOUR_PORT`

## ⚠️ Important Notes:

- **Port 5500** is for Live Server (VS Code extension) - DON'T use this!
- **Port 3000** is for Node.js server - USE THIS!
- Always use the Node.js server URL for full functionality
- IP address may change if you restart your router
- Works only on local network (not internet-wide)

## 🎬 Ready to Watch!

Share `http://10.168.144.228:3000` with friends and enjoy watching together! 🍿
