export type Caption = {
  id: string;
  segmentIndex: number;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
};

export type CaptionStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'bolder';
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  position: 'top' | 'center' | 'bottom';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textShadow: string;
  padding: number;
  borderRadius: number;
  opacity: number;
};

export type Video = {
  id: string;
  filename: string;
  fileSize: number;
  duration: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  videoUrl: string;
  captions: Caption[];
};

export const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 48,
  fontWeight: 'bold',
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textAlign: 'center',
  position: 'bottom',
  textTransform: 'uppercase',
  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
  padding: 12,
  borderRadius: 8,
  opacity: 1,
};
