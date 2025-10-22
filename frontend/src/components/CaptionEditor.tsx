import { Caption, CaptionStyle } from '../types';
import { Download, Edit3 } from 'lucide-react';

interface CaptionEditorProps {
  captions: Caption[];
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
  onExport: (format: 'srt' | 'vtt') => void;
  onCaptionEdit: (caption: Caption) => void;
}

export function CaptionEditor({
  captions,
  style,
  onStyleChange,
  onExport,
  onCaptionEdit,
}: CaptionEditorProps) {
  const updateStyle = (key: keyof CaptionStyle, value: any) => {
    onStyleChange({ ...style, [key]: value });
  };

  const fonts = [
    'Arial, sans-serif',
    'Times New Roman, serif',
    'Courier New, monospace',
    'Georgia, serif',
    'Verdana, sans-serif',
    'Impact, fantasy',
    'Comic Sans MS, cursive',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Style Controls */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Caption Styling</h2>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Family
          </label>
          <select
            value={style.fontFamily}
            onChange={(e) => updateStyle('fontFamily', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {fonts.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font.split(',')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size: {style.fontSize}px
          </label>
          <input
            type="range"
            min="24"
            max="96"
            value={style.fontSize}
            onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Font Weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Weight
          </label>
          <select
            value={style.fontWeight}
            onChange={(e) => updateStyle('fontWeight', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="bolder">Bolder</option>
          </select>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <input
              type="color"
              value={style.color}
              onChange={(e) => updateStyle('color', e.target.value)}
              className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <input
              type="color"
              value={style.backgroundColor.replace(/rgba?\([^)]+\)/, '#000000')}
              onChange={(e) => {
                const opacity = style.backgroundColor.match(/[\d.]+\)$/)?.[0].replace(')', '') || '0.7';
                updateStyle('backgroundColor', `rgba(${parseInt(e.target.value.slice(1, 3), 16)}, ${parseInt(e.target.value.slice(3, 5), 16)}, ${parseInt(e.target.value.slice(5, 7), 16)}, ${opacity})`);
              }}
              className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Background Opacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Opacity: {Math.round((style.opacity) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={style.opacity}
            onChange={(e) => updateStyle('opacity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Text Transform */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Transform
          </label>
          <select
            value={style.textTransform}
            onChange={(e) => updateStyle('textTransform', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="none">None</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="lowercase">lowercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Position
          </label>
          <div className="flex gap-2">
            {['top', 'center', 'bottom'].map((pos) => (
              <button
                key={pos}
                onClick={() => updateStyle('position', pos)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  style.position === pos
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Text Align */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Align
          </label>
          <div className="flex gap-2">
            {['left', 'center', 'right'].map((align) => (
              <button
                key={align}
                onClick={() => updateStyle('textAlign', align as any)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  style.textAlign === align
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {align.charAt(0).toUpperCase() + align.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Export Captions</h3>
        <div className="flex gap-3">
          <button
            onClick={() => onExport('srt')}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export as SRT
          </button>
          <button
            onClick={() => onExport('vtt')}
            className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Download className="w-5 h-5" />
            Export as VTT
          </button>
        </div>
      </div>

      {/* Caption List */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Captions ({captions.length})
        </h3>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span>{formatTime(caption.startTime)}</span>
                  <span>→</span>
                  <span>{formatTime(caption.endTime)}</span>
                </div>
                <p className="text-gray-800">{caption.text}</p>
              </div>
              <button
                onClick={() => onCaptionEdit(caption)}
                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
