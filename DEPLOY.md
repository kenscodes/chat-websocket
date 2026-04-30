# Deployment Guide

## Render.com (Free Tier — Recommended)

1. Push this folder to a **GitHub repo**
2. Go to [render.com](https://render.com) → **New** → **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Deploy — you'll get a URL like `https://your-app.onrender.com`

> Note: Free tier spins down after 15 min of inactivity. First request after idle takes ~30s.

## Railway.app (Free Tier)

1. Install CLI: `npm i -g @railway/cli`
2. Run:
```bash
cd /Users/kenkaneki/.gemini/antigravity/scratch/chat-websocket
railway login
railway init
railway up
```

## Glitch.com (Free, always-on for projects)

1. Go to [glitch.com](https://glitch.com) → **New Project** → **Import from GitHub**
2. Paste your GitHub repo URL
3. It auto-deploys and gives you a live URL
