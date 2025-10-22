import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createCaption, updateVideoStatus } from './database';

const client = new VideoIntelligenceServiceClient();

// Filler words to filter out
const FILLER_WORDS = new Set([
  'um', 'uh', 'hmm', 'ah', 'like', 'you know', 'so', 'basically', 'actually'
]);

interface WordInfo {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export async function transcribeVideo(videoId: string, videoPath: string, wordsPerSegment: number = 2): Promise<void> {
  try {
    console.log(`Starting transcription for video ${videoId}`);
    updateVideoStatus(videoId, 'processing');

    // Read video file
    const videoContent = fs.readFileSync(videoPath);
    const videoBase64 = videoContent.toString('base64');

    // Configure request
    const request: any = {
      inputContent: videoBase64,
      features: ['SPEECH_TRANSCRIPTION'],
      videoContext: {
        speechTranscriptionConfig: {
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
        },
      },
    };

    console.log('Sending video to Google Video Intelligence API...');
    const [operation]: any = await client.annotateVideo(request);

    console.log('Waiting for transcription to complete...');
    const [operationResult] = await operation.promise();

    // Process results
    const transcriptionResults = operationResult.annotationResults?.[0]?.speechTranscriptions;

    if (!transcriptionResults || transcriptionResults.length === 0) {
      console.log('No transcription results found');
      updateVideoStatus(videoId, 'completed');
      return;
    }

    console.log('Processing transcription results...');
    const words: WordInfo[] = [];

    // Extract words with timestamps
    for (const transcription of transcriptionResults) {
      const alternatives = transcription.alternatives;
      if (!alternatives || alternatives.length === 0) continue;

      const alternative = alternatives[0];
      const wordInfos = alternative.words;

      if (!wordInfos) continue;

      for (const wordInfo of wordInfos) {
        const word = wordInfo.word?.toLowerCase() || '';

        // Skip filler words
        if (FILLER_WORDS.has(word)) continue;

        const startTime = parseTime(wordInfo.startTime);
        const endTime = parseTime(wordInfo.endTime);
        const confidence = wordInfo.confidence || 0;

        words.push({
          word,
          startTime,
          endTime,
          confidence,
        });
      }
    }

    console.log(`Extracted ${words.length} words`);

    // Create segments with configurable words per segment
    const segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }> = [];

    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const segmentWords = words.slice(i, i + wordsPerSegment);

      if (segmentWords.length > 0) {
        const text = segmentWords.map(w => w.word).join(' ');
        const startTime = segmentWords[0].startTime;
        const endTime = segmentWords[segmentWords.length - 1].endTime;
        const confidence = segmentWords.reduce((sum, w) => sum + w.confidence, 0) / segmentWords.length;

        segments.push({
          text,
          startTime,
          endTime,
          confidence,
        });
      }
    }

    console.log(`Created ${segments.length} caption segments`);

    // Save captions to database
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      createCaption({
        id: uuidv4(),
        video_id: videoId,
        segment_index: i,
        start_time: segment.startTime,
        end_time: segment.endTime,
        text: segment.text,
        confidence: segment.confidence,
      });
    }

    updateVideoStatus(videoId, 'completed');
    console.log(`Transcription completed for video ${videoId}`);
  } catch (error) {
    console.error('Transcription error:', error);
    updateVideoStatus(videoId, 'error');
    throw error;
  }
}

function parseTime(time: any): number {
  if (!time) return 0;

  const seconds = Number(time.seconds || 0);
  const nanos = Number(time.nanos || 0);

  return seconds + nanos / 1e9;
}
