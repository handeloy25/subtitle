import { useEffect, useRef, useState } from 'react';
import type { Caption, CaptionStyle } from '../types';

interface VideoPreviewProps {
  videoUrl: string;
  captions: Caption[];
  style: CaptionStyle;
  isPlaying: boolean;
  onTimeUpdate: (currentTime: number) => void;
  onPlayPause: (playing: boolean) => void;
}

export function VideoPreview({
  videoUrl,
  captions,
  style,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play();
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    onTimeUpdate(currentTime);

    // Find the caption for the current time
    const caption = captions.find(
      (cap) => currentTime >= cap.startTime && currentTime <= cap.endTime
    );
    setCurrentCaption(caption || null);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      onPlayPause(true);
    } else {
      video.pause();
      onPlayPause(false);
    }
  };

  const getPositionStyles = () => {
    switch (style.position) {
      case 'top':
        return 'top-8';
      case 'center':
        return 'top-1/2 -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-20';
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-black rounded-lg overflow-hidden shadow-2xl">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto"
        onTimeUpdate={handleTimeUpdate}
        onClick={handlePlayPause}
        controls
      />

      {currentCaption && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${getPositionStyles()} max-w-[90%] pointer-events-none transition-all duration-200`}
          style={{
            fontFamily: style.fontFamily,
            fontSize: `${style.fontSize}px`,
            fontWeight: style.fontWeight,
            color: style.color,
            backgroundColor: style.backgroundColor,
            textAlign: style.textAlign,
            textTransform: style.textTransform,
            textShadow: style.textShadow,
            padding: `${style.padding}px`,
            borderRadius: `${style.borderRadius}px`,
            opacity: style.opacity,
          }}
        >
          {currentCaption.text}
        </div>
      )}
    </div>
  );
}
