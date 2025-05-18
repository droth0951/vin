import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';

interface ThumbnailSelectorProps {
  thumbnails: string[];
  onThumbnailSelected: (thumbnail: string) => void;
}

const ThumbnailSelector: React.FC<ThumbnailSelectorProps> = ({ 
  thumbnails, 
  onThumbnailSelected 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
    onThumbnailSelected(thumbnails[index]);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select a Thumbnail</h3>
          
          {thumbnails.length > 0 ? (
            <>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {thumbnails.map((thumbnail, index) => (
                  <div 
                    key={index}
                    className={`relative aspect-video cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                      selectedIndex === index ? 'border-primary ring-2 ring-primary' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleThumbnailClick(index)}
                  >
                    <img 
                      src={thumbnail} 
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedIndex === index && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-gray-500">
                Click on a thumbnail to select it for your LinkedIn video.
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p>No thumbnails available yet. Please load a video first.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ThumbnailSelector;
