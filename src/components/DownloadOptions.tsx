import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Add type declaration for captureStream
declare global {
  interface HTMLVideoElement {
    captureStream(): MediaStream;
  }
}

interface DownloadOptionsProps {
  videoStartTime: number;
  videoEndTime: number;
  videoSrc: string;
  selectedThumbnail: string;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({
  videoStartTime,
  videoEndTime,
  videoSrc,
  selectedThumbnail
}) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Check if video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkVideoReady = () => {
      // Video is ready when it has enough data to play
      setIsVideoReady(video.readyState >= 3);
    };

    video.addEventListener('loadeddata', checkVideoReady);
    video.addEventListener('canplay', checkVideoReady);
    
    // Initial check
    checkVideoReady();

    return () => {
      video.removeEventListener('loadeddata', checkVideoReady);
      video.removeEventListener('canplay', checkVideoReady);
    };
  }, [videoSrc]);

  // Process the video to extract the selected 90-second clip
  const processVideo = async () => {
    if (!videoRef.current) return;
    
    setProcessing(true);
    setProcessingProgress(0);
    recordedChunksRef.current = [];
    
    try {
      const video = videoRef.current;
      
      // Ensure video is loaded
      if (video.readyState < 2) {
        await new Promise((resolve) => {
          video.onloadeddata = resolve;
        });
      }
      
      // Set the start time and mute the video
      video.currentTime = videoStartTime;
      video.muted = true;
      
      // Wait for video to seek to the start time
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });

      // Create MediaRecorder with WebM/VP8
      const stream = video.captureStream();
      
      // Check for WebM support
      if (!MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        throw new Error('WebM/VP8 is not supported in this browser');
      }
      
      console.log('Starting video recording...');
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('Recording stopped. Total chunks:', recordedChunksRef.current.length);
        
        if (recordedChunksRef.current.length === 0) {
          console.error('No video data recorded');
          setProcessing(false);
          setProcessingProgress(0);
          alert('Error: No video data was recorded. Please try again.');
          return;
        }

        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        });
        console.log('Created blob:', blob.size, 'bytes');
        
        const url = URL.createObjectURL(blob);
        setProcessedVideoUrl(url);
        setProcessing(false);
        setProcessingProgress(100);
        
        // Reset video state
        video.pause();
        video.currentTime = videoStartTime;
        video.muted = false;
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setProcessing(false);
        setProcessingProgress(0);
        // Reset video state on error
        video.pause();
        video.currentTime = videoStartTime;
        video.muted = false;
        alert('Error recording video. Please try again.');
      };

      // Start recording with smaller time slices
      mediaRecorder.start(100); // Request data every 100ms
      console.log('MediaRecorder started');
      
      // Ensure video is playing
      try {
        await video.play();
        console.log('Video playback started');
      } catch (error) {
        console.error('Error playing video:', error);
        mediaRecorder.stop();
        video.muted = false;
        throw error;
      }

      // Update progress during recording
      const duration = videoEndTime - videoStartTime;
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min((elapsed / duration) * 100, 99);
        setProcessingProgress(progress);
      }, 100);

      // Stop recording after the selected duration
      const recordingTimeout = setTimeout(() => {
        console.log('Recording timeout reached');
        clearInterval(progressInterval);
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          video.pause();
          video.currentTime = videoStartTime;
          video.muted = false;
        }
      }, duration * 1000);

      // Cleanup timeout if component unmounts
      return () => {
        clearTimeout(recordingTimeout);
        clearInterval(progressInterval);
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        // Ensure video is reset
        video.pause();
        video.currentTime = videoStartTime;
        video.muted = false;
      };

    } catch (error) {
      console.error('Error processing video:', error);
      setProcessing(false);
      setProcessingProgress(0);
      alert('Error processing video. Please try again.');
    }
  };

  // Download the processed video
  const downloadVideo = async () => {
    try {
      if (!processedVideoUrl) {
        await processVideo();
      }
      if (processedVideoUrl) {
        // Download as WebM first
        triggerDownload(processedVideoUrl, 'linkedin-video.webm');
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Error downloading video. Please try again.');
    }
  };

  // Download the selected thumbnail
  const downloadThumbnail = () => {
    if (selectedThumbnail) {
      // Convert base64 to blob
      fetch(selectedThumbnail)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          triggerDownload(url, 'linkedin-thumbnail.jpg');
        })
        .catch(error => {
          console.error('Error downloading thumbnail:', error);
        });
    }
  };

  // Helper function to trigger download
  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Cleanup URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (processedVideoUrl) {
        URL.revokeObjectURL(processedVideoUrl);
      }
    };
  }, [processedVideoUrl]);

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Download Options</h3>
          
          <Tabs defaultValue="video">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="thumbnail">Thumbnail</TabsTrigger>
            </TabsList>
            
            <TabsContent value="video" className="space-y-4 pt-4">
              <div className="bg-gray-100 p-4 rounded-md">
                <div className="font-medium">Selected Clip Details:</div>
                <div className="text-sm text-gray-600">
                  Start: {formatTime(videoStartTime)} | End: {formatTime(videoEndTime)} | Duration: {formatTime(videoEndTime - videoStartTime)}
                </div>
              </div>
              
              {!isVideoReady && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Please wait for the video to fully load before processing. The download button will be enabled when ready.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={downloadVideo} 
                className="w-full"
                disabled={processing || !isVideoReady}
              >
                {processing ? (
                  <div className="w-full">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Video... {Math.round(processingProgress)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  </div>
                ) : !isVideoReady ? (
                  <>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Waiting for Video to Load...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Video for LinkedIn
                  </>
                )}
              </Button>
              
              <div className="text-sm text-gray-500">
                The video will be processed to include only your selected 90-second clip.
              </div>
            </TabsContent>
            
            <TabsContent value="thumbnail" className="space-y-4 pt-4">
              {selectedThumbnail ? (
                <>
                  <div className="aspect-video rounded-md overflow-hidden border border-gray-200">
                    <img 
                      src={selectedThumbnail} 
                      alt="Selected thumbnail" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <Button onClick={downloadThumbnail} className="w-full">
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Thumbnail for LinkedIn
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <p>Please select a thumbnail first.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      
      {/* Hidden video element for processing */}
      <video ref={videoRef} src={videoSrc} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
};

// Helper function to format time in MM:SS format
const formatTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default DownloadOptions;
