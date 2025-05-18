import { useState } from 'react';
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

  const handleThumbnailsGenerated = (newThumbnails: string[]) => {
    setThumbnails(newThumbnails);
    if (newThumbnails.length > 0) {
      setSelectedThumbnail(newThumbnails[0]);
    }
  };

  const handleThumbnailSelected = (thumbnail: string) => {
    setSelectedThumbnail(thumbnail);
  };

  const handleClipSelected = (startTime: number, endTime: number) => {
    setClipStartTime(startTime);
    setClipEndTime(endTime);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VIN: Videos in Ninety Seconds</h1>
          <p className="text-gray-600 mt-2">Select the best 90 seconds from your video for LinkedIn</p>
        </header>

        {!videoLoaded ? (
          <VideoUploader onVideoSelected={handleVideoSelected} />
        ) : (
          <div className="space-y-6">
            <VideoPlayer 
              videoSrc={videoSrc} 
              isUrl={isVideoUrl} 
              onThumbnailsGenerated={handleThumbnailsGenerated}
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
    </div>
  );
}

export default App;
