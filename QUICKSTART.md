# Quick Start Guide

## Get Up and Running in 5 Minutes

### Step 1: Google Cloud Credentials (5 minutes)

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable "Video Intelligence API" in API Library
4. Create a Service Account:
   - IAM & Admin > Service Accounts > Create
   - Name: "video-caption-service"
   - Role: "Video Intelligence API User"
5. Download JSON key file
6. Save as `backend/google-credentials.json`

### Step 2: Backend Setup (2 minutes)

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Wait for: `🚀 Server is running on http://localhost:3001`

### Step 3: Frontend Setup (2 minutes)

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### Step 4: Test It Out!

1. Open http://localhost:5173 in your browser
2. Drag and drop a video (or click to browse)
3. Wait for transcription (~1-3 minutes)
4. Customize caption styling
5. Export captions!

## First Time Using Google Cloud?

You get **1,000 free minutes** of video processing per month!

## Troubleshooting

**Backend won't start?**
- Make sure `google-credentials.json` is in the `backend/` folder
- Check that `.env` file exists with correct path

**Frontend won't connect?**
- Verify backend is running on port 3001
- Check browser console for errors

**No captions generated?**
- Make sure video has clear speech
- Check backend console logs for errors
- Verify Google Cloud API is enabled

## Need Help?

Check the full README.md for detailed documentation.
