import { useState, useRef, useEffect } from 'react';
import './App.css';
import VideoUploader from './components/VideoUploader';
import VideoPlayer from './components/VideoPlayer';
import ThumbnailSelector from './components/ThumbnailSelector';
import DownloadOptions from './components/DownloadOptions';

function App() {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isVideoUrl, setIsVideoUrl] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');
  const [clipStartTime, setClipStartTime] = useState<number>(0);
  const [clipEndTime, setClipEndTime] = useState<number>(90);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleVideoSelected = (src: string, isUrl: boolean) => {
    setVideoSrc(src);
    setIsVideoUrl(isUrl);
    setVideoLoaded(true);
    // Reset other states when new video is loaded
    setThumbnails([]);
    setSelectedThumbnail('');
    setClipStartTime(0);
    setClipEndTime(90);
  };

  const handleThumbnailSelected = (thumbnail: string) => {
    setSelectedThumbnail(thumbnail);
  };

  const handleClipSelected = (startTime: number, endTime: number) => {
    setClipStartTime(startTime);
    setClipEndTime(endTime);
  };

  // Generate thumbnails for the selected section (show all at once)
  const generateThumbnails = (video: HTMLVideoElement, start: number, end: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const duration = end - start;
    const numThumbnails = Math.max(1, Math.floor(duration / 10));
    const thumbnailPositions = Array.from({ length: numThumbnails }, (_, i) =>
      start + ((i + 0.5) * duration) / numThumbnails
    );
    let newThumbnails: string[] = [];
    let idx = 0;
    const captureFrame = (time: number) => {
      video.currentTime = time;
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg');
        newThumbnails.push(thumbnail);
        idx++;
        if (idx < thumbnailPositions.length) {
          captureFrame(thumbnailPositions[idx]);
        } else {
          setThumbnails(newThumbnails);
          if (newThumbnails.length > 0) setSelectedThumbnail(newThumbnails[0]);
        }
      };
    };
    if (thumbnailPositions.length > 0) {
      captureFrame(thumbnailPositions[0]);
    } else {
      setThumbnails([]);
    }
  };

  // Regenerate thumbnails when videoSrc, clipStartTime, or clipEndTime changes
  useEffect(() => {
    if (!videoLoaded || !videoSrc) return;
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => {
      generateThumbnails(video, clipStartTime, clipEndTime);
    };
  }, [videoSrc, clipStartTime, clipEndTime, videoLoaded]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VIN: Video in Ninety</h1>
          <p className="text-gray-600 mt-2">Select up to 90 seconds from your video for LinkedIn</p>
        </header>

        {!videoLoaded ? (
          <VideoUploader onVideoSelected={handleVideoSelected} />
        ) : (
          <div className="space-y-6">
            <VideoPlayer 
              videoSrc={videoSrc} 
              isUrl={isVideoUrl} 
              onClipSelected={handleClipSelected}
            />
            
            <ThumbnailSelector 
              thumbnails={thumbnails} 
              onThumbnailSelected={handleThumbnailSelected} 
            />
            
            <DownloadOptions 
              videoStartTime={clipStartTime}
              videoEndTime={clipEndTime}
              videoSrc={videoSrc}
              selectedThumbnail={selectedThumbnail}
            />
            
            <div className="text-center">
              <button 
                onClick={() => setVideoLoaded(false)} 
                className="text-primary hover:underline"
              >
                Upload a different video
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default App;
