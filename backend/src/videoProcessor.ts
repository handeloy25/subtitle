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

export async function burnCaptionsToVideo(
  videoId: string,
  videoPath: string,
  style: CaptionStyle
): Promise<string> {
  const captions = getCaptionsByVideoId(videoId);

  if (captions.length === 0) {
    throw new Error('No captions found for this video');
  }

  // Create ASS file for FFmpeg (supports better styling)
  const assPath = path.join(path.dirname(videoPath), `${videoId}.ass`);

  // Convert colors to ASS format (&HAABBGGRR format)
  const hexToAssColor = (hex: string) => {
    const r = hex.substring(1, 3);
    const g = hex.substring(3, 5);
    const b = hex.substring(5, 7);
    return `&H00${b}${g}${r}`;
  };

  const primaryColor = hexToAssColor(style.fontColor);
  // For transparent background, use &HFF000000 (fully transparent black)
  const bgColor = style.showBackground ? hexToAssColor(style.backgroundColor) : '&HFF000000';
  const outlineColor = hexToAssColor(style.outlineColor);

  // Determine alignment and margin
  let alignment = 2; // bottom center
  let marginV = 30;
  if (style.position === 'top') {
    alignment = 8; // top center
    marginV = 30;
  } else if (style.position === 'center') {
    alignment = 5; // middle center
    marginV = 0;
  }

  // Create ASS header
  const assHeader = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},${primaryColor},${primaryColor},${outlineColor},${bgColor},${style.fontWeight === 'bold' ? '-1' : '0'},0,0,0,100,${Math.round(style.lineSpacing * 100)},0,0,1,${style.outlineWidth},0,${alignment},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Add caption events
  const assEvents = captions
    .map((caption) => {
      const startTime = formatAssTime(caption.start_time);
      const endTime = formatAssTime(caption.end_time);
      let text = caption.text;

      // Apply text transform
      if (style.textTransform === 'uppercase') {
        text = text.toUpperCase();
      } else if (style.textTransform === 'lowercase') {
        text = text.toLowerCase();
      }

      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  const assContent = assHeader + assEvents;
  fs.writeFileSync(assPath, assContent, 'utf-8');

  // Output path
  const outputPath = path.join(
    path.dirname(videoPath),
    `${videoId}_with_captions.mp4`
  );

  // Escape path for Windows
  const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf`,
        `ass='${escapedAssPath}'`
      ])
      .videoCodec('libx264')
      .audioCodec('copy')
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      })
      .on('end', () => {
        console.log('Video processing finished');
        // Clean up ASS file
        fs.unlinkSync(assPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        // Clean up ASS file on error
        if (fs.existsSync(assPath)) {
          fs.unlinkSync(assPath);
        }
        reject(err);
      })
      .run();
  });
}
