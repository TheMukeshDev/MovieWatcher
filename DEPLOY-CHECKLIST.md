# Quick Deployment Checklist ✅

## Before You Start
- [ ] Have a GitHub account
- [ ] Have Node.js installed locally
- [ ] App works locally (`npm start`)

## Step 1: Deploy Backend (Choose One)

### Option A: Render.com (Recommended)
- [ ] Sign up at https://render.com
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repo
- [ ] Set build: `npm install`
- [ ] Set start: `npm start`
- [ ] Click "Create Web Service"
- [ ] Copy your URL: `https://YOUR-APP.onrender.com`

### Option B: Railway.app
- [ ] Sign up at https://railway.app
- [ ] Click "New Project" → "Deploy from GitHub"
- [ ] Select repository
- [ ] Copy deployment URL

### Option C: All-in-One (No GitHub Pages needed)
- [ ] Just deploy everything to Render/Railway
- [ ] Access via their URL
- [ ] No need for separate frontend hosting

## Step 2: Update Config (If using GitHub Pages)

- [ ] Open `config.js`
- [ ] Replace `'https://YOUR-BACKEND-URL-HERE.onrender.com'` with your actual backend URL
- [ ] Save the file

## Step 3: Deploy Frontend to GitHub Pages

- [ ] Create new GitHub repository
- [ ] Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/REPO-NAME.git
git push -u origin main
```
- [ ] Go to Settings → Pages
- [ ] Select "main" branch
- [ ] Click Save
- [ ] Wait 2-3 minutes
- [ ] Access at: `https://YOUR-USERNAME.github.io/REPO-NAME/`

## Step 4: Test Everything

- [ ] Open your GitHub Pages URL
- [ ] Create a room
- [ ] Upload a video
- [ ] Test chat
- [ ] Share with friend to test sync

## Common Issues

❌ **"Socket.IO not connecting"**
- Check config.js has correct backend URL
- Make sure backend is running (visit backend URL)
- Check browser console for errors

❌ **"Backend sleeping" (Render free tier)**
- First load takes ~30 seconds (cold start)
- Solution: Upgrade to $7/month plan for always-on

❌ **"CORS error"**
- Check server.js has CORS enabled
- Make sure your GitHub Pages domain is allowed

## URLs to Save

📝 **Backend URL**: _____________________
📝 **Frontend URL**: _____________________
📝 **Room to share**: _____________________

## Next Steps

🎉 Your app is live!
📤 Share the frontend URL with friends
🎬 Watch videos together from anywhere!

## Cost Summary

**FREE Option:**
- Frontend: GitHub Pages (Free forever)
- Backend: Render/Railway free tier (with limitations)
- Total: $0/month

**Reliable Option:**
- Frontend: GitHub Pages (Free)
- Backend: Render Starter ($7/month)
- Total: $7/month

**Pro Option:**
- Frontend: GitHub Pages (Free)
- Backend: DigitalOcean Droplet ($5/month) or AWS
- Total: $5-10/month
