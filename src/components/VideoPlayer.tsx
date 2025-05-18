import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface VideoPlayerProps {
  videoSrc: string;
  isUrl: boolean;
  onThumbnailsGenerated: (thumbnails: string[]) => void;
  onClipSelected: (startTime: number, endTime: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoSrc, 
  onThumbnailsGenerated,
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
  const [selectionWidth, setSelectionWidth] = useState<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      // Set default selection to first 90 seconds or full video if shorter
      const defaultEnd = Math.min(90, duration);
      setSelectionEnd(defaultEnd);
      onClipSelected(0, defaultEnd);
      
      // Generate thumbnails once video is loaded
      generateThumbnails();
    }
  };

  // Generate thumbnails at different points in the video
  const generateThumbnails = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    const thumbnails: string[] = [];
    const numThumbnails = 5;
    const thumbnailPositions = Array.from({ length: numThumbnails }, (_, i) => 
      i * (video.duration / (numThumbnails + 1))
    );
    
    let thumbnailsGenerated = 0;
    
    const captureFrame = (time: number) => {
      video.currentTime = time;
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const thumbnail = canvas.toDataURL('image/jpeg');
        thumbnails.push(thumbnail);
        thumbnailsGenerated++;
        
        if (thumbnailsGenerated === numThumbnails) {
          onThumbnailsGenerated(thumbnails);
          // Reset video to beginning
          video.currentTime = 0;
        } else if (thumbnailsGenerated < numThumbnails) {
          captureFrame(thumbnailPositions[thumbnailsGenerated]);
        }
      };
    };
    
    captureFrame(thumbnailPositions[0]);
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

  // Handle selection frame drag start
  const handleSelectionDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  // Handle selection frame dragging
  const handleSelectionDrag = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const timelineWidth = timelineRect.width;
    const deltaX = e.clientX - dragStartX;
    const deltaTime = (deltaX / timelineWidth) * videoDuration;
    
    // Ensure selection stays within video bounds and maintains 90 second width
    let newStart = Math.max(0, selectionStart + deltaTime);
    let newEnd = newStart + 90;
    
    if (newEnd > videoDuration) {
      newEnd = videoDuration;
      newStart = Math.max(0, newEnd - 90);
    }
    
    setSelectionStart(newStart);
    setSelectionEnd(newEnd);
    onClipSelected(newStart, newEnd);
    setDragStartX(e.clientX);
  };

  // Handle selection frame drag end
  const handleSelectionDragEnd = () => {
    setIsDragging(false);
  };

  // Calculate selection frame position and width
  useEffect(() => {
    if (timelineRef.current && videoDuration > 0) {
      const startPercent = (selectionStart / videoDuration) * 100;
      const endPercent = (selectionEnd / videoDuration) * 100;
      setSelectionWidth(endPercent - startPercent);
    }
  }, [selectionStart, selectionEnd, videoDuration]);

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
            <div className="text-sm font-medium">Select 90 seconds for LinkedIn:</div>
            <div 
              ref={timelineRef}
              className="relative h-8 bg-gray-200 rounded-md cursor-pointer"
              onMouseMove={handleSelectionDrag}
              onMouseUp={handleSelectionDragEnd}
              onMouseLeave={handleSelectionDragEnd}
            >
              {/* Progress bar */}
              <div 
                className="absolute h-full bg-gray-400 rounded-md"
                style={{ width: `${(currentTime / videoDuration) * 100}%` }}
              />
              
              {/* Selection frame */}
              <div 
                className="absolute h-full bg-primary/40 border-2 border-primary rounded-md flex items-center justify-center cursor-move hover:bg-primary/50 transition-colors"
                style={{ 
                  left: `${(selectionStart / videoDuration) * 100}%`,
                  width: `${selectionWidth}%`
                }}
                onMouseDown={handleSelectionDragStart}
              >
                <div className="text-sm font-bold text-white drop-shadow-lg bg-black/30 px-2 py-1 rounded">
                  {formatTime(selectionEnd - selectionStart)}
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
