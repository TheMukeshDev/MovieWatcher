# Watch Party - Deployment Guide

This guide explains how to deploy your Watch Party app to GitHub Pages (frontend) and a hosting service (backend).

## Architecture

- **Frontend (GitHub Pages)**: HTML, CSS, JavaScript files
- **Backend (Render/Railway/etc)**: Node.js server with Socket.IO

## Option 1: Deploy Frontend to GitHub Pages

### Step 1: Create GitHub Repository

1. Go to https://github.com and create a new repository
2. Name it: `watch-party` (or any name)
3. Make it public
4. Don't initialize with README (we have files already)

### Step 2: Push Code to GitHub

```bash
cd MovieWatcher
git init
git add .
git commit -m "Initial commit - Watch Party app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/watch-party.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Pages** in the left sidebar
4. Under "Source", select **main** branch
5. Click **Save**
6. Your site will be available at: `https://YOUR-USERNAME.github.io/watch-party/`

## Option 2: Deploy Backend Server

You need to deploy the backend separately. Here are the best free options:

### Option A: Deploy to Render (Recommended - Free)

1. Go to https://render.com and sign up
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: watch-party-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Click **Create Web Service**
6. Copy your service URL (e.g., `https://watch-party-backend.onrender.com`)

### Option B: Deploy to Railway

1. Go to https://railway.app and sign up
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will auto-detect Node.js
5. Copy your deployment URL

### Option C: Deploy to Vercel

1. Go to https://vercel.com and sign up
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Vercel will auto-configure
5. Copy your deployment URL

## Step 4: Update Frontend Configuration

After deploying the backend, update `config.js`:

```javascript
const config = {
    SOCKET_SERVER_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://YOUR-BACKEND-URL.onrender.com', // Replace with your backend URL
    
    IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
};
```

Then push the update:

```bash
git add config.js
git commit -m "Update backend URL"
git push
```

## Step 5: Test Your Deployment

1. Open `https://YOUR-USERNAME.github.io/watch-party/`
2. Create a room
3. Share the link with friends
4. Test video upload, chat, and sync features

## Important Notes

### GitHub Pages Limitations
- ✅ Can host: HTML, CSS, JavaScript, images
- ❌ Cannot host: Node.js server, Socket.IO server
- ✅ Solution: Deploy backend separately (Render/Railway/Vercel)

### Free Tier Limitations
- **Render Free**: Server sleeps after 15 min inactivity (cold start ~30 sec)
- **Railway Free**: 500 hours/month, $5 credit
- **Vercel Free**: Unlimited, but serverless (may need adjustments)

### For Better Performance (Paid Options)
- **Render Starter**: $7/month - No sleep, always on
- **Railway Pro**: $5/month for extended usage
- **DigitalOcean**: $5/month VPS
- **AWS EC2**: Free tier for 12 months

## Files to Deploy

### Frontend (GitHub Pages)
```
index.html
style.css
client.js
config.js
README.md
```

### Backend (Render/Railway/etc)
```
server.js
package.json
package-lock.json
videos/ (optional)
```

## Environment Variables (Backend)

If needed, set these on your hosting service:

```
PORT=3000 (usually auto-set by host)
NODE_ENV=production
```

## Troubleshooting

### "Socket.IO not connecting"
- Check if backend is running (visit backend URL)
- Check config.js has correct backend URL
- Check browser console for errors
- Ensure CORS is enabled on backend

### "Screen sharing not working"
- GitHub Pages uses HTTPS (secure context) ✅
- Screen sharing will work on GitHub Pages
- Make sure backend CORS allows your domain

### "Video upload failing"
- Free tier servers have memory limits
- Large videos (>100MB) may timeout
- Consider using video library feature instead

## Alternative: All-in-One Hosting

If you want simpler deployment, you can host both frontend and backend together:

1. Deploy entire project to **Render/Railway/Vercel**
2. They will serve static files AND run the Node.js server
3. Access via their provided URL (e.g., `watch-party.onrender.com`)
4. No need for separate GitHub Pages hosting

## Support

For issues or questions:
- Check browser console (F12) for errors
- Check backend logs on hosting service
- Ensure backend URL is correct in config.js

## Security Notes for Production

1. Update CORS in server.js to only allow your domain:
```javascript
cors: {
    origin: ['https://your-username.github.io'],
    // Remove '*' for security
}
```

2. Add rate limiting
3. Add authentication if needed
4. Use environment variables for sensitive data

---

**Happy Watching Together! 🎬✨**
