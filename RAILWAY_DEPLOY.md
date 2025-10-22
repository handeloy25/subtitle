# Railway Deployment Guide

This guide will help you deploy your Video Caption Generator to Railway while keeping it functional locally.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. Git installed on your computer
3. Railway CLI (optional but recommended)

## Step 1: Prepare Your Repository

1. Initialize git repository (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Push to GitHub (create a new repository first):
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway

1. Go to https://railway.app and create a new project
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account and select your repository
4. Railway will auto-detect the configuration

### Configure Environment Variables (Backend Service)

In Railway dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://your-frontend-url.railway.app
GOOGLE_APPLICATION_CREDENTIALS=/app/backend/google-credentials.json
```

### Add Google Cloud Credentials

1. In Railway dashboard, go to your service settings
2. Go to "Variables" tab
3. Add a new variable called `GOOGLE_CREDENTIALS_BASE64`
4. Convert your google-credentials.json to base64:

**Windows (PowerShell):**
```powershell
$content = Get-Content backend/google-credentials.json -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [System.Convert]::ToBase64String($bytes)
$base64 | Set-Clipboard
```

**Mac/Linux:**
```bash
base64 -i backend/google-credentials.json | pbcopy
```

5. Paste the base64 string as the value
6. Add a start command that decodes this on startup (see modified index.ts below)

## Step 3: Deploy Frontend

### Option A: Deploy Frontend as Separate Service on Railway

1. In the same Railway project, click "New Service"
2. Select "Deploy from GitHub repo" (same repository)
3. Configure as frontend service

Add environment variables:
```
VITE_API_URL=https://your-backend-url.railway.app
```

### Option B: Use a separate hosting service

Deploy frontend to Vercel, Netlify, or Cloudflare Pages:
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`
- Environment variable: `VITE_API_URL=https://your-backend-url.railway.app`

## Step 4: Update Backend for Credentials

Add this to the top of `backend/src/index.ts` (after imports):

```typescript
// Decode Google credentials from environment variable if in production
if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CREDENTIALS_BASE64) {
  const credentialsPath = path.join(__dirname, 'google-credentials.json');
  const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
  fs.writeFileSync(credentialsPath, credentials);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}
```

## Step 5: Configure CORS

Update your backend CORS settings with your actual Railway URLs:

In Railway dashboard, update `FRONTEND_URL` environment variable to your actual frontend URL.

## Step 6: Persistent Storage (Railway Volumes)

Railway provides ephemeral storage by default. For persistent uploads and database:

1. In Railway dashboard, go to your backend service
2. Click on "Volumes" tab
3. Add a new volume:
   - Mount path: `/app/backend/uploads`
   - Size: 5GB (or as needed)

4. Add another volume for database:
   - Mount path: `/app/backend/database.db`
   - Size: 1GB

## Local Development

Your app will still work locally! Just make sure:

1. Keep your local `.env` file with:
```
NODE_ENV=development
PORT=3002
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
FRONTEND_URL=http://localhost:5173
```

2. Don't commit:
   - `.env` files
   - `google-credentials.json`
   - `node_modules/`
   - `dist/` folders
   - Database and uploads

## Testing

After deployment:

1. Visit your frontend URL
2. Upload a test video
3. Check Railway logs for any errors:
   - Click on your service
   - Go to "Deployments" tab
   - Click on the latest deployment
   - View logs

## Troubleshooting

### FFmpeg not found
Make sure `nixpacks.toml` includes ffmpeg in nixPkgs.

### Google API errors
Verify your credentials are correctly decoded and the file is accessible.

### CORS errors
Double-check your FRONTEND_URL environment variable matches your actual frontend URL.

### File upload errors
Ensure the uploads directory exists and has proper permissions. Railway volumes should be properly mounted.

## Cost Considerations

- Railway free tier: $5 credit/month
- Backend service: ~$5-10/month (depending on usage)
- Consider storage costs for uploaded videos
- Google Cloud Video Intelligence API has its own pricing

## Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
