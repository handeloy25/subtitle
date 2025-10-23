import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';
import { getCaptionsByVideoId } from './database';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  showBackground: boolean;
  fontWeight: 'normal' | 'bold';
  position: 'top' | 'center' | 'bottom';
  textTransform: 'none' | 'uppercase' | 'lowercase';
  outlineWidth: number;
  outlineColor: string;
  lineSpacing: number;
}

// Helper functions
function formatAssTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centisecs = Math.floor((seconds % 1) * 100);

  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
}

// Helper to format SRT time
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis
    .toString()
    .padStart(3, '0')}`;
}

export async function burnCaptionsToVideo(
  videoId: string,
  videoPath: string,
  style: CaptionStyle
): Promise<string> {
  const captions = getCaptionsByVideoId(videoId);

  if (captions.length === 0) {
    throw new Error('No captions found for this video');
  }

  // Create SRT file (simpler, more compatible than ASS)
  const srtPath = path.join(path.dirname(videoPath), `${videoId}.srt`);

  // Generate SRT content (simpler format)
  const srtContent = captions
    .map((caption, index) => {
      const startTime = formatSrtTime(caption.start_time);
      const endTime = formatSrtTime(caption.end_time);
      let text = caption.text;

      // Apply text transform
      if (style.textTransform === 'uppercase') {
        text = text.toUpperCase();
      } else if (style.textTransform === 'lowercase') {
        text = text.toLowerCase();
      }

      return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
    })
    .join('\n');

  fs.writeFileSync(srtPath, srtContent, 'utf-8');
  console.log(`✅ SRT file created at: ${srtPath}`);
  console.log(`📄 SRT file size: ${fs.statSync(srtPath).size} bytes`);
  console.log(`📝 Total captions: ${captions.length}`);
  console.log(`📋 First caption:\n${srtContent.split('\n\n')[0]}`);

  // Output path
  const outputPath = path.join(
    path.dirname(videoPath),
    `${videoId}_with_captions.mp4`
  );

  // Normalize path for cross-platform compatibility
  const normalizedSrtPath = srtPath.replace(/\\/g, '/');
  console.log(`🎬 Input video: ${videoPath}`);
  console.log(`📋 Subtitle file: ${normalizedSrtPath}`);
  console.log(`💾 Output video: ${outputPath}`);

  // Use bundled font file - try absolute path first, then relative
  let fontPath = path.join(__dirname, '../fonts/DejaVuSans-Bold.ttf');
  if (!fs.existsSync(fontPath)) {
    // Try from dist directory
    fontPath = path.join(__dirname, '../../fonts/DejaVuSans-Bold.ttf');
  }
  const fontExists = fs.existsSync(fontPath);
  console.log(`🔤 Font file exists: ${fontExists}, path: ${fontPath}`);
  console.log(`🔤 __dirname: ${__dirname}`);

  // Simplify - just use subtitles filter without fontsdir for now
  const subtitleFilter = `subtitles=${normalizedSrtPath}:force_style='FontSize=48,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Bold=-1,Outline=3'`;

  console.log(`🎨 Using subtitle filter: ${subtitleFilter}`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf`,
        subtitleFilter
      ])
      .videoCodec('libx264')
      .audioCodec('copy')
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🎥 FFmpeg command:', commandLine);
        console.log(`📂 SRT file exists: ${fs.existsSync(srtPath)}`);
      })
      .on('stderr', (stderrLine) => {
        console.log('FFmpeg stderr:', stderrLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`⏳ Processing: ${Math.round(progress.percent)}% done`);
        }
      })
      .on('end', () => {
        console.log('✅ Video processing finished successfully');
        const outputExists = fs.existsSync(outputPath);
        const outputSize = outputExists ? fs.statSync(outputPath).size : 0;
        console.log(`📦 Output file exists: ${outputExists}, size: ${outputSize} bytes`);

        // Keep SRT file for debugging - DON'T delete it yet
        // fs.unlinkSync(srtPath);
        console.log(`🔍 SRT file kept at: ${srtPath} for debugging`);

        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err);
        console.error('Error message:', err.message);
        console.error('Full error:', JSON.stringify(err, null, 2));
        // Clean up SRT file on error
        if (fs.existsSync(srtPath)) {
          fs.unlinkSync(srtPath);
        }
        reject(err);
      })
      .run();
  });
}
