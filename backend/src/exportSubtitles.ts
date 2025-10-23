import path from 'path';
import fs from 'fs';
import { getCaptionsByVideoId } from './database';

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

export function generateSrtFile(videoId: string, textTransform: 'none' | 'uppercase' | 'lowercase' = 'none'): string {
  const captions = getCaptionsByVideoId(videoId);

  if (captions.length === 0) {
    throw new Error('No captions found for this video');
  }

  // Generate SRT content
  const srtContent = captions
    .map((caption, index) => {
      const startTime = formatSrtTime(caption.start_time);
      const endTime = formatSrtTime(caption.end_time);
      let text = caption.text;

      // Apply text transform
      if (textTransform === 'uppercase') {
        text = text.toUpperCase();
      } else if (textTransform === 'lowercase') {
        text = text.toLowerCase();
      }

      return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
    })
    .join('\n');

  // Save SRT file
  const uploadsDir = path.join(__dirname, '../uploads');
  const srtPath = path.join(uploadsDir, `${videoId}.srt`);
  fs.writeFileSync(srtPath, srtContent, 'utf-8');

  console.log(`✅ SRT file created: ${srtPath}`);
  console.log(`📝 Total captions: ${captions.length}`);

  return srtPath;
}
