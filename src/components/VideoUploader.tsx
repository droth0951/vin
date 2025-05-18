import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface VideoUploaderProps {
  onVideoSelected: (videoSrc: string, isUrl: boolean) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoSelected }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoUrl.trim()) {
      onVideoSelected(videoUrl, true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const videoSrc = URL.createObjectURL(file);
      onVideoSelected(videoSrc, false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const videoSrc = URL.createObjectURL(file);
      onVideoSelected(videoSrc, false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">VIN: Videos in Ninety Seconds</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-gray-500"
              >
                <path d="m21 15-5-5-5 5" />
                <path d="M16 4v6" />
                <rect width="20" height="14" x="2" y="6" rx="2" />
                <path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2" />
              </svg>
              <div className="text-lg font-medium">Drag and drop your video here</div>
              <div className="text-sm text-gray-500">or</div>
              <Button onClick={handleButtonClick} variant="outline">
                Select Video
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-url">Or paste a video URL:</Label>
            <form onSubmit={handleUrlSubmit} className="flex space-x-2">
              <Input
                id="video-url"
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!videoUrl.trim()}>
                Load Video
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoUploader;
