# Deploy CLASSIC MAXIMIZE to Render

## Prerequisites
1. **Render account** - Create one at https://render.com (free tier available)
2. **GitHub repository** - Push your code to GitHub (Render deploys from GitHub)
3. **Firebase service account** - You'll need `serviceAccount.json` content

## Step 1: Prepare Your Repository

Create a `.gitignore` file (if not exists) to exclude sensitive files:

```
node_modules/
.env
.env.local
.DS_Store
*.log
serviceAccount.json
```

**Important:** Do NOT commit `serviceAccount.json` to GitHub for security reasons!

## Step 2: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit - CLASSIC MAXIMIZE"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 3: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Fill in deployment settings:
   - **Name:** `classic-maximize-backend`
   - **Environment:** Node
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for production)

## Step 4: Add Environment Variables

In Render dashboard, go to **Environment** section and add these environment variables from your Firebase project.

## Step 5: Add Firebase Service Account (Secret File)

1. In Render dashboard, go to **Environment** → **Secret Files**
2. Create a new secret file:
   - **Filename:** `serviceAccount.json`
   - **Content:** Copy the entire content of your `serviceAccount.json` file from your local machine

## Step 6: Update Frontend API URL

Edit `FRONTEND/js/api.js` and change:

```javascript
const API_BASE = 'http://localhost:3000'; // OLD (local)
```

To:

```javascript
const API_BASE = 'https://your-service-name.onrender.com'; // NEW (Render)
```

You'll get your Render URL after deployment.

## Step 7: Deploy!

Click **Deploy** button in Render dashboard and wait for deployment to complete.

Your backend will be live at: **https://your-service-name.onrender.com**

## Troubleshooting

**Issue:** Deployment fails
- Check logs in Render dashboard for error messages
- Ensure `package.json` and `server.js` are in root directory

**Issue:** Firebase connection error
- Verify `serviceAccount.json` is correctly added as a secret file in Render
- Check environment variables are set

**Issue:** Frontend can't connect to backend
- Update `API_BASE` in `FRONTEND/js/api.js` with correct Render URL
- Ensure backend is fully deployed and running

## Keep Server Awake (Free Tier)

Free Render instances go to sleep after 15 minutes of inactivity. To prevent this:
1. Upgrade to a paid plan ($7/month minimum)
2. Or use UptimeRobot to ping your service every 10 minutes

## Auto-Deploy on Code Changes

Every time you push code to GitHub, Render automatically redeploys:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Done! Your CLASSIC MAXIMIZE app is now live on Render! 🚀
