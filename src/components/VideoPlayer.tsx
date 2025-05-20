import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface VideoPlayerProps {
  videoSrc: string;
  isUrl: boolean;
  onClipSelected: (startTime: number, endTime: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoSrc, 
  onClipSelected
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(90); // Default 90 seconds
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // New: Track which handle is being dragged
  const [draggingHandle, setDraggingHandle] = useState<null | 'start' | 'end' | 'frame'>(null);

  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      // Set default selection to first 90 seconds or full video if shorter
      const defaultEnd = Math.min(90, duration);
      setSelectionEnd(defaultEnd);
      onClipSelected(0, defaultEnd);
    }
  };

  // Update current time during playback
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Play/pause toggle
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // New: Handle drag start for handles or frame
  const handleHandleDragStart = (e: React.MouseEvent, handle: 'start' | 'end' | 'frame') => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDraggingHandle(handle);
  };

  // New: Handle dragging for handles or frame
  const handleHandleDrag = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current || !draggingHandle) return;
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const timelineWidth = timelineRect.width;
    const mouseX = e.clientX - timelineRect.left;
    const time = Math.max(0, Math.min(videoDuration, (mouseX / timelineWidth) * videoDuration));
    let newStart = selectionStart;
    let newEnd = selectionEnd;
    if (draggingHandle === 'start') {
      newStart = Math.min(time, selectionEnd - 1); // at least 1s
      if (newEnd - newStart > 90) newStart = newEnd - 90;
      setSelectionStart(newStart);
      onClipSelected(newStart, newEnd);
      if (videoRef.current) videoRef.current.currentTime = newStart;
    } else if (draggingHandle === 'end') {
      newEnd = Math.max(time, selectionStart + 1); // at least 1s
      if (newEnd - newStart > 90) newEnd = newStart + 90;
      setSelectionEnd(newEnd);
      onClipSelected(newStart, newEnd);
      if (videoRef.current) videoRef.current.currentTime = newEnd;
    } else if (draggingHandle === 'frame') {
      // Drag whole frame
      const frameWidth = selectionEnd - selectionStart;
      let newFrameStart = time - (dragStartX - timelineRect.left) / timelineWidth * videoDuration;
      newFrameStart = Math.max(0, Math.min(videoDuration - frameWidth, newFrameStart));
      setSelectionStart(newFrameStart);
      setSelectionEnd(newFrameStart + frameWidth);
      onClipSelected(newFrameStart, newFrameStart + frameWidth);
      if (videoRef.current) videoRef.current.currentTime = newFrameStart;
    }
  };

  // Handle selection drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggingHandle(null);
  };

  // Play selected clip
  const playSelectedClip = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = selectionStart;
      videoRef.current.play();
      setIsPlaying(true);
      
      // Stop when reaching end of selection
      const checkTime = () => {
        if (videoRef.current && videoRef.current.currentTime >= selectionEnd) {
          videoRef.current.pause();
          setIsPlaying(false);
          videoRef.current.removeEventListener('timeupdate', checkTime);
        }
      };
      
      videoRef.current.addEventListener('timeupdate', checkTime);
    }
  };

  // Add keyboard nudge support and instructions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoDuration) return;
      let nudgeAmount = 0;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        // Nudge by 1 second
        nudgeAmount = e.key === 'ArrowLeft' ? -1 : 1;
      } else if (e.key === ',' || e.key === '.') {
        // Nudge by 1 frame (assuming 30fps)
        nudgeAmount = e.key === ',' ? -1 / 30 : 1 / 30;
      }
      if (nudgeAmount !== 0) {
        e.preventDefault();
        // If shift is held, nudge the end handle, else nudge the start handle
        if (e.shiftKey) {
          let newEnd = Math.max(selectionStart + 1 / 30, Math.min(videoDuration, selectionEnd + nudgeAmount));
          if (newEnd - selectionStart > 90) newEnd = selectionStart + 90;
          setSelectionEnd(newEnd);
          onClipSelected(selectionStart, newEnd);
          if (videoRef.current) videoRef.current.currentTime = newEnd;
        } else {
          let newStart = Math.min(selectionEnd - 1 / 30, Math.max(0, selectionStart + nudgeAmount));
          if (selectionEnd - newStart > 90) newStart = selectionEnd - 90;
          setSelectionStart(newStart);
          onClipSelected(newStart, selectionEnd);
          if (videoRef.current) videoRef.current.currentTime = newStart;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionStart, selectionEnd, videoDuration, onClipSelected, togglePlayPause]);

  // --- Clamp selection to video duration and keep handles in sync ---
  useEffect(() => {
    if (videoDuration > 0) {
      let newStart = selectionStart;
      let newEnd = selectionEnd;
      // Clamp end to video duration
      if (newEnd > videoDuration) newEnd = videoDuration;
      // Clamp start to not exceed end
      if (newStart > newEnd) newStart = newEnd;
      // Clamp selection to max 90s
      if (newEnd - newStart > 90) newStart = newEnd - 90;
      if (newStart < 0) newStart = 0;
      setSelectionStart(newStart);
      setSelectionEnd(newEnd);
      onClipSelected(newStart, newEnd);
    }
  }, [videoDuration]);

  // --- Prevent selectionEnd from ever exceeding videoDuration during drag/nudge ---
  useEffect(() => {
    if (selectionEnd > videoDuration) {
      setSelectionEnd(videoDuration);
      if (selectionStart > videoDuration) setSelectionStart(videoDuration);
    }
  }, [selectionEnd, videoDuration]);

  // --- Progress bar for current play position ---
  const getProgressBarStyle = () => {
    if (!videoDuration) return { width: '0%' };
    const percent = (currentTime / videoDuration) * 100;
    return { width: `${percent}%` };
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full"
              onLoadedMetadata={handleMetadataLoaded}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlayPause}
            />
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2 py-1 rounded">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </div>
            <button
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-4"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>
          </div>

          {/* Timeline with 90-second selection frame */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Select up to 90 seconds for LinkedIn:</div>
            {/* Instructions for keyboard controls */}
            <div className="text-xs text-gray-600 mb-2">
              <strong>Keyboard controls:</strong> Space = play/pause, Arrow keys = nudge by 1s, <code>,</code>/<code>.</code> = nudge by 1 frame. Hold <strong>Shift</strong> to nudge the end handle.
            </div>
            <div 
              ref={timelineRef}
              className="relative h-8 bg-gray-200 rounded-md cursor-pointer"
              onMouseMove={handleHandleDrag}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              {/* Progress bar for current play position */}
              <div 
                className="absolute h-full bg-blue-400/60 rounded-md z-0 transition-all duration-150"
                style={getProgressBarStyle()}
              />
              {/* Selection frame with handles */}
              <div 
                className="absolute h-full bg-primary/60 border-4 border-yellow-400 shadow-lg rounded-md flex items-center justify-between cursor-move hover:bg-primary/70 transition-colors z-10"
                style={{ 
                  left: `${(selectionStart / videoDuration) * 100}%`,
                  width: `${((selectionEnd - selectionStart) / videoDuration) * 100}%`
                }}
                onMouseDown={e => handleHandleDragStart(e, 'frame')}
              >
                {/* Start handle */}
                <div
                  className="w-4 h-8 bg-yellow-400 border-2 border-yellow-600 rounded-l cursor-ew-resize flex items-center justify-center z-20"
                  onMouseDown={e => handleHandleDragStart(e, 'start')}
                  style={{ marginLeft: -8 }}
                >
                  <div className="w-1 h-6 bg-yellow-600 rounded" />
                </div>
                <div className="flex-1 flex items-center justify-center select-none">
                  <div className="text-sm font-bold text-white drop-shadow-lg bg-black/40 px-2 py-1 rounded">
                    {formatTime(selectionEnd - selectionStart)}
                  </div>
                </div>
                {/* End handle */}
                <div
                  className="w-4 h-8 bg-yellow-400 border-2 border-yellow-600 rounded-r cursor-ew-resize flex items-center justify-center z-20"
                  onMouseDown={e => handleHandleDragStart(e, 'end')}
                  style={{ marginRight: -8 }}
                >
                  <div className="w-1 h-6 bg-yellow-600 rounded" />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatTime(selectionStart)}</span>
              <span>{formatTime(selectionEnd)}</span>
            </div>
            <div className="flex space-x-2">
              <Button onClick={playSelectedClip} className="flex-1">
                Play Selected Clip
              </Button>
            </div>
          </div>
        </div>
        
        {/* Hidden canvas for thumbnail generation */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;
