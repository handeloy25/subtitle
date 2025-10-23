import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileVideo, Loader2, Download, Video as VideoIcon, Edit2, Check, X } from 'lucide-react';
import { API_URL } from './config';

// Types
type Caption = {
  id: string;
  segmentIndex: number;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
};

type CaptionStyle = {
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
};

const defaultCaptionStyle: CaptionStyle = {
  fontFamily: 'Arial',
  fontSize: 48,
  fontColor: '#FFFFFF',
  backgroundColor: '#000000',
  showBackground: true,
  fontWeight: 'bold',
  position: 'bottom',
  textTransform: 'uppercase',
  outlineWidth: 2,
  outlineColor: '#000000',
  lineSpacing: 1.2,
};

function App() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(defaultCaptionStyle);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [wordsPerSegment, setWordsPerSegment] = useState<number>(2);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      setVideoId(response.data.videoId);
      setVideoUrl(response.data.videoUrl);
      setIsUploading(false);

      // Start transcription
      setIsProcessing(true);
      setProcessingStatus('Starting transcription...');

      await axios.post(`${API_URL}/api/transcribe/${response.data.videoId}`, {
        wordsPerSegment
      });
      pollForCaptions(response.data.videoId);
    } catch (err) {
      console.error('Upload error:', err);
      setIsUploading(false);
    }
  };

  const pollForCaptions = async (id: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/captions/${id}`);

        if (response.data.captions && response.data.captions.length > 0) {
          setCaptions(response.data.captions);
          setIsProcessing(false);
          setProcessingStatus('Transcription complete!');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setProcessingStatus(`Processing video... (${attempts * 5}s)`);
          setTimeout(poll, 5000);
        } else {
          setIsProcessing(false);
          setProcessingStatus('Transcription timeout');
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsProcessing(false);
          setProcessingStatus('Error fetching captions');
        }
      }
    };

    poll();
  };

  const handleExportSubtitles = (format: 'srt' | 'vtt') => {
    let content = '';

    if (format === 'srt') {
      content = captions
        .map((caption, index) => {
          const startTime = formatSrtTime(caption.startTime);
          const endTime = formatSrtTime(caption.endTime);
          return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
        })
        .join('\n');
    } else if (format === 'vtt') {
      content = 'WEBVTT\n\n';
      content += captions
        .map((caption) => {
          const startTime = formatVttTime(caption.startTime);
          const endTime = formatVttTime(caption.endTime);
          return `${startTime} --> ${endTime}\n${caption.text}\n`;
        })
        .join('\n');
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `captions.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportVideo = async () => {
    if (!videoId) return;

    setIsExporting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/export/${videoId}`,
        { style: captionStyle },
        { timeout: 60000 } // 1 minute timeout
      );

      // Download the SRT subtitle file
      const srtLink = document.createElement('a');
      srtLink.href = response.data.srtUrl;
      srtLink.download = response.data.srtFilename;
      document.body.appendChild(srtLink);
      srtLink.click();
      document.body.removeChild(srtLink);

      // Small delay between downloads
      setTimeout(() => {
        // Download the original video
        const videoLink = document.createElement('a');
        videoLink.href = response.data.videoUrl;
        videoLink.download = response.data.videoFilename;
        document.body.appendChild(videoLink);
        videoLink.click();
        document.body.removeChild(videoLink);
      }, 500);

      alert('✅ Subtitles and video exported successfully!\n\nYou can use the SRT file with any video player or editor.');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export subtitles. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const updateStyle = (key: keyof CaptionStyle, value: any) => {
    setCaptionStyle({ ...captionStyle, [key]: value });
  };

  // Update current caption based on video time
  useEffect(() => {
    const caption = captions.find(
      (cap) => currentTime >= cap.startTime && currentTime <= cap.endTime
    );
    setCurrentCaption(caption || null);
  }, [currentTime, captions]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const startEditingCaption = (caption: Caption) => {
    setEditingCaptionId(caption.id);
    setEditingText(caption.text);
  };

  const cancelEditingCaption = () => {
    setEditingCaptionId(null);
    setEditingText('');
  };

  const saveEditedCaption = async () => {
    if (!editingCaptionId || !editingText.trim()) return;

    try {
      await axios.put(
        `${API_URL}/api/captions/${editingCaptionId}`,
        { text: editingText }
      );

      // Update the captions list with the edited caption
      setCaptions(captions.map(cap =>
        cap.id === editingCaptionId
          ? { ...cap, text: editingText }
          : cap
      ));

      setEditingCaptionId(null);
      setEditingText('');
    } catch (error) {
      console.error('Failed to update caption:', error);
      alert('Failed to update caption. Please try again.');
    }
  };

  const getPositionStyles = () => {
    switch (captionStyle.position) {
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
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Video Caption Generator
          </h1>
          <p className="text-xl text-white/90 drop-shadow">
            Upload, transcribe, customize, and burn captions into your videos
          </p>
        </header>

        {!videoUrl ? (
          <div className="w-full max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-12 text-center">
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="w-16 h-16 mx-auto animate-spin text-blue-500" />
                  <p className="text-lg font-semibold text-gray-700">Uploading video...</p>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <FileVideo className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Drop your video here
                  </h3>
                  <p className="text-gray-500 mb-4">
                    or click to browse from your computer
                  </p>

                  {/* Words per segment selector */}
                  <div className="mb-6 max-w-xs mx-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Words per caption segment: {wordsPerSegment}
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">1</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={wordsPerSegment}
                        onChange={(e) => setWordsPerSegment(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">5</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      TikTok style: 2-3 words • Longer captions: 4-5 words
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Choose Video
                  </label>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Preview */}
            <div className="lg:col-span-2 space-y-4">
              {isProcessing && (
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500 mb-4" />
                  <p className="text-lg font-semibold text-gray-700">{processingStatus}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    This may take a few minutes depending on video length
                  </p>
                </div>
              )}

              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-auto"
                  controls
                  onTimeUpdate={handleTimeUpdate}
                />

                {/* Caption Overlay Preview */}
                {currentCaption && (
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 ${getPositionStyles()} max-w-[90%] pointer-events-none transition-all duration-200`}
                    style={{
                      fontFamily: captionStyle.fontFamily,
                      fontSize: `${captionStyle.fontSize}px`,
                      fontWeight: captionStyle.fontWeight,
                      color: captionStyle.fontColor,
                      backgroundColor: captionStyle.showBackground ? captionStyle.backgroundColor : 'transparent',
                      textTransform: captionStyle.textTransform,
                      padding: '12px 24px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      WebkitTextStroke: `${captionStyle.outlineWidth}px ${captionStyle.outlineColor}`,
                      paintOrder: 'stroke fill',
                      lineHeight: captionStyle.lineSpacing,
                    }}
                  >
                    {captionStyle.textTransform === 'uppercase'
                      ? currentCaption.text.toUpperCase()
                      : captionStyle.textTransform === 'lowercase'
                      ? currentCaption.text.toLowerCase()
                      : currentCaption.text
                    }
                  </div>
                )}
              </div>

              {captions.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Captions ({captions.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {captions.map((caption) => (
                      <div key={caption.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                          <div className="flex items-center gap-2">
                            <span>{formatTime(caption.startTime)}</span>
                            <span>→</span>
                            <span>{formatTime(caption.endTime)}</span>
                          </div>
                          {editingCaptionId !== caption.id && (
                            <button
                              onClick={() => startEditingCaption(caption)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Edit caption"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                        </div>

                        {editingCaptionId === caption.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditedCaption}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={cancelEditingCaption}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-800">{caption.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Style Controls */}
            {captions.length > 0 && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Caption Style</h3>

                  {/* Font Family */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Family
                    </label>
                    <select
                      value={captionStyle.fontFamily}
                      onChange={(e) => updateStyle('fontFamily', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Impact">Impact</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Size: {captionStyle.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="24"
                      max="96"
                      value={captionStyle.fontSize}
                      onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Font Weight */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Weight
                    </label>
                    <select
                      value={captionStyle.fontWeight}
                      onChange={(e) => updateStyle('fontWeight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>

                  {/* Font Color */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={captionStyle.fontColor}
                      onChange={(e) => updateStyle('fontColor', e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Background Color */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Background Color
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={captionStyle.showBackground}
                          onChange={(e) => updateStyle('showBackground', e.target.checked)}
                          className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Show</span>
                      </label>
                    </div>
                    <input
                      type="color"
                      value={captionStyle.backgroundColor}
                      onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                      disabled={!captionStyle.showBackground}
                      className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Text Outline */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Outline Color
                    </label>
                    <input
                      type="color"
                      value={captionStyle.outlineColor}
                      onChange={(e) => updateStyle('outlineColor', e.target.value)}
                      className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Outline Width */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Outline Width: {captionStyle.outlineWidth}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={captionStyle.outlineWidth}
                      onChange={(e) => updateStyle('outlineWidth', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Line Spacing */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Line Spacing: {captionStyle.lineSpacing.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.8"
                      max="2.5"
                      step="0.1"
                      value={captionStyle.lineSpacing}
                      onChange={(e) => updateStyle('lineSpacing', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Distance between lines of text
                    </p>
                  </div>

                  {/* Position */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <div className="flex gap-2">
                      {['top', 'center', 'bottom'].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => updateStyle('position', pos)}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            captionStyle.position === pos
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Transform */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Transform
                    </label>
                    <select
                      value={captionStyle.textTransform}
                      onChange={(e) => updateStyle('textTransform', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="none">None</option>
                      <option value="uppercase">UPPERCASE</option>
                      <option value="lowercase">lowercase</option>
                    </select>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Export</h3>

                  <div className="space-y-3">
                    {/* Export Video with Captions */}
                    <button
                      onClick={handleExportVideo}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <VideoIcon className="w-5 h-5" />
                          Export Video with Captions
                        </>
                      )}
                    </button>

                    {/* Export Subtitles */}
                    <button
                      onClick={() => handleExportSubtitles('srt')}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Export SRT File
                    </button>

                    <button
                      onClick={() => handleExportSubtitles('vtt')}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Export VTT File
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms
    .toString()
    .padStart(3, '0')}`;
}

function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
    .toString()
    .padStart(3, '0')}`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default App;

