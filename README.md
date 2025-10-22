# Video Caption Generator

A full-stack application for generating TikTok-style captions for videos using Google Cloud Video Intelligence API. Upload videos, automatically generate captions, customize styling, and export in multiple formats.

## Features

- **Video Upload**: Drag-and-drop video upload with progress tracking
- **Automatic Transcription**: Uses Google Cloud Video Intelligence API for speech-to-text
- **TikTok-Style Captions**: Generates 2-word caption segments for dynamic display
- **Full Customization**:
  - Font family, size, and weight
  - Text and background colors
  - Position (top, center, bottom)
  - Text transform (uppercase, lowercase, capitalize)
  - Background opacity and styling
- **Real-time Preview**: See captions overlaid on video as you customize
- **Export Options**: Export captions as SRT or VTT files
- **Caption Editing**: Edit individual caption text inline

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Axios (API calls)
- Lucide React (icons)

### Backend
- Node.js + Express + TypeScript
- SQLite (database)
- Multer (file uploads)
- Google Cloud Video Intelligence API (transcription)

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **pnpm**
3. **Google Cloud Account** with Video Intelligence API enabled

## Setup Instructions

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Video Intelligence API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Video Intelligence API"
   - Click "Enable"
4. Create a service account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name it (e.g., "video-caption-service")
   - Grant role: "Video Intelligence API User"
   - Click "Done"
5. Create and download credentials:
   - Click on the service account you created
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose "JSON" format
   - Download the JSON file
6. Save the downloaded JSON file as `google-credentials.json` in the `backend/` directory

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment example file
copy .env.example .env

# The .env file should contain:
# PORT=3001
# GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend will start on `http://localhost:3001`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (open a new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### 4. Access the Application

Open your browser and go to: `http://localhost:5173`

## Usage

1. **Upload Video**:
   - Drag and drop a video file onto the upload zone
   - Or click "Choose Video" to select a file
   - Supported formats: MP4, MPEG, MOV, AVI

2. **Wait for Transcription**:
   - The video will be automatically transcribed
   - This may take 1-5 minutes depending on video length
   - Progress is shown on screen

3. **Customize Captions**:
   - Use the Caption Editor panel to customize:
     - Font family (Arial, Times New Roman, etc.)
     - Font size (24-96px)
     - Font weight (normal, bold, bolder)
     - Text color
     - Background color and opacity
     - Text transform (uppercase, lowercase, etc.)
     - Position (top, center, bottom)
     - Text alignment (left, center, right)

4. **Preview**:
   - Play the video to see captions in real-time
   - Captions appear as 2-word segments (TikTok-style)
   - Changes to styling are reflected immediately

5. **Edit Captions**:
   - Scroll through the caption list
   - Click the edit icon on any caption to modify text

6. **Export**:
   - Click "Export as SRT" for SubRip format
   - Click "Export as VTT" for WebVTT format
   - Files will download automatically

## Project Structure

```
subtitle/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx      # Video upload component
│   │   │   ├── VideoPreview.tsx    # Video player with caption overlay
│   │   │   └── CaptionEditor.tsx   # Caption styling and editing
│   │   ├── types.ts                # TypeScript type definitions
│   │   ├── App.tsx                 # Main application component
│   │   └── index.css               # Global styles
│   ├── package.json
│   └── tailwind.config.js
│
└── backend/
    ├── src/
    │   ├── database.ts             # SQLite database operations
    │   ├── transcription.ts        # Google Video Intelligence integration
    │   └── index.ts                # Express server and API routes
    ├── google-credentials.json     # Google Cloud credentials (not in git)
    ├── .env                        # Environment variables (not in git)
    └── package.json
```

## API Endpoints

### POST `/api/upload`
Upload a video file
- **Body**: multipart/form-data with `video` field
- **Response**: `{ videoId, videoUrl, message }`

### POST `/api/transcribe/:videoId`
Start transcription for a video
- **Response**: `{ message, videoId }`

### GET `/api/captions/:videoId`
Get captions for a video
- **Response**: `{ videoId, status, captions[] }`

### GET `/api/video/:videoId`
Get video information
- **Response**: `{ id, filename, fileSize, status, videoUrl, createdAt }`

### GET `/api/health`
Health check endpoint
- **Response**: `{ status, message }`

## Database Schema

### videos
- `id` (TEXT, PRIMARY KEY)
- `filename` (TEXT)
- `filepath` (TEXT)
- `file_size` (INTEGER)
- `status` (TEXT) - 'uploading' | 'processing' | 'completed' | 'error'
- `created_at` (INTEGER)

### captions
- `id` (TEXT, PRIMARY KEY)
- `video_id` (TEXT, FOREIGN KEY)
- `segment_index` (INTEGER)
- `start_time` (REAL)
- `end_time` (REAL)
- `text` (TEXT)
- `confidence` (REAL)
- `created_at` (INTEGER)

## Caption Processing

1. Video is sent to Google Cloud Video Intelligence API
2. API returns word-level timestamps and transcriptions
3. Filler words (um, uh, hmm, etc.) are filtered out
4. Words are grouped into 2-word segments (TikTok-style)
5. Segments are stored in database with timestamps
6. Frontend displays segments based on current video time

## Troubleshooting

### "Failed to upload video"
- Check that backend is running on port 3001
- Verify file size is under 100MB
- Ensure file is a valid video format

### "Transcription failed"
- Verify Google Cloud credentials are correct
- Check that Video Intelligence API is enabled
- Ensure service account has proper permissions
- Check backend console logs for detailed errors

### "No captions generated"
- Video may not contain clear speech
- Try a video with clearer audio
- Check backend logs for API response details

### CORS errors
- Ensure backend has CORS enabled (already configured)
- Verify frontend is making requests to correct URL

## Cost Considerations

Google Cloud Video Intelligence API pricing:
- First 1,000 minutes/month: Free
- Additional minutes: ~$0.10 per minute

Monitor your usage in the Google Cloud Console.

## Future Enhancements

- [ ] User authentication
- [ ] Cloud storage integration (AWS S3, Google Cloud Storage)
- [ ] Multiple language support
- [ ] Batch video processing
- [ ] Caption timing adjustment
- [ ] Video trimming/editing
- [ ] More export formats (ASS, SSA)
- [ ] Caption animation effects
- [ ] Mobile responsive design

## License

MIT

## Support

For issues or questions, please check:
1. Backend console logs for detailed error messages
2. Browser console for frontend errors
3. Google Cloud Console for API quota and errors

## Development

To build for production:

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
npm start
```

---

Built with ❤️ using React, TypeScript, and Google Cloud Video Intelligence API
