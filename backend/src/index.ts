import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { createVideo, getVideo, getCaptionsByVideoId, updateCaption } from './database';
import { transcribeVideo } from './transcription';
import { burnCaptionsToVideo, CaptionStyle as VideoCaptionStyle } from './videoProcessor';

// Load environment variables
dotenv.config();

// Decode Google credentials from environment variable if in production
if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CREDENTIALS_BASE64) {
  const credentialsPath = path.join(__dirname, 'google-credentials.json');
  const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
  fs.writeFileSync(credentialsPath, credentials);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  console.log('✅ Google credentials decoded from environment variable');
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    FRONTEND_URL
  ],
  credentials: true
}));
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded videos
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// FFmpeg info endpoint
app.get('/api/ffmpeg-info', (req: Request, res: Response) => {
  const { execSync } = require('child_process');
  try {
    const ffmpegVersion = execSync('ffmpeg -version').toString();
    const ffmpegFilters = execSync('ffmpeg -filters').toString();

    res.json({
      version: ffmpegVersion.split('\n').slice(0, 5).join('\n'),
      hasSubtitlesFilter: ffmpegFilters.includes('subtitles'),
      hasDrawtextFilter: ffmpegFilters.includes('drawtext'),
      hasLibass: ffmpegVersion.includes('--enable-libass')
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload video endpoint
app.post('/api/upload', upload.single('video'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoId = uuidv4();
    const filepath = req.file.path;
    const filename = req.file.originalname;
    const fileSize = req.file.size;

    // Create video record in database
    const video = createVideo({
      id: videoId,
      filename,
      filepath,
      file_size: fileSize,
      status: 'uploading',
    });

    // Generate video URL
    const videoUrl = `${BACKEND_URL}/uploads/${path.basename(filepath)}`;

    res.json({
      videoId: video.id,
      videoUrl,
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Start transcription endpoint
app.post('/api/transcribe/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { wordsPerSegment = 2 } = req.body;

    const video = getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Start transcription in background
    transcribeVideo(videoId, video.filepath, wordsPerSegment)
      .catch(error => {
        console.error('Background transcription error:', error);
      });

    res.json({
      message: 'Transcription started',
      videoId,
    });
  } catch (error) {
    console.error('Transcription start error:', error);
    res.status(500).json({ error: 'Failed to start transcription' });
  }
});

// Get captions endpoint
app.get('/api/captions/:videoId', (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const captions = getCaptionsByVideoId(videoId);

    res.json({
      videoId,
      status: video.status,
      captions: captions.map(caption => ({
        id: caption.id,
        segmentIndex: caption.segment_index,
        startTime: caption.start_time,
        endTime: caption.end_time,
        text: caption.text,
        confidence: caption.confidence,
      })),
    });
  } catch (error) {
    console.error('Get captions error:', error);
    res.status(500).json({ error: 'Failed to get captions' });
  }
});

// Get video info endpoint
app.get('/api/video/:videoId', (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoUrl = `${BACKEND_URL}/uploads/${path.basename(video.filepath)}`;

    res.json({
      id: video.id,
      filename: video.filename,
      fileSize: video.file_size,
      status: video.status,
      videoUrl,
      createdAt: video.created_at,
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to get video' });
  }
});

// Update caption endpoint
app.put('/api/captions/:captionId', (req: Request, res: Response) => {
  try {
    const { captionId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const updatedCaption = updateCaption(captionId, text);

    if (!updatedCaption) {
      return res.status(404).json({ error: 'Caption not found' });
    }

    res.json({
      message: 'Caption updated successfully',
      caption: {
        id: updatedCaption.id,
        segmentIndex: updatedCaption.segment_index,
        startTime: updatedCaption.start_time,
        endTime: updatedCaption.end_time,
        text: updatedCaption.text,
        confidence: updatedCaption.confidence,
      },
    });
  } catch (error) {
    console.error('Update caption error:', error);
    res.status(500).json({ error: 'Failed to update caption' });
  }
});

// Export video with burned captions endpoint
app.post('/api/export/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const style: VideoCaptionStyle = req.body.style;

    const video = getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    console.log('Starting video export with burned captions...');
    const outputPath = await burnCaptionsToVideo(videoId, video.filepath, style);

    const outputFilename = path.basename(outputPath);
    const downloadUrl = `${BACKEND_URL}/uploads/${outputFilename}`;

    res.json({
      message: 'Video exported successfully',
      downloadUrl,
      filename: outputFilename,
    });
  } catch (error) {
    console.error('Export video error:', error);
    res.status(500).json({ error: 'Failed to export video' });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server is running on http://${HOST}:${PORT}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`\n✨ Video Caption Generator API is ready!\n`);
});
