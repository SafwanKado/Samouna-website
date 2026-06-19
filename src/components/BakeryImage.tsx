import React, { useState, useEffect } from 'react';
import { generateBakeryImage, getRelevantPlaceholder } from '../services/imageService';

interface BakeryImageProps {
  bakeryId: string;
  name: string;
  description: string;
  imageUrl?: string;
  className?: string;
}

const BakeryImage: React.FC<BakeryImageProps> = ({ bakeryId, name, description, imageUrl, className }) => {
  const [currentImage, setCurrentImage] = React.useState<string>(imageUrl || getRelevantPlaceholder(name));
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => {
    if (imageUrl) {
      setCurrentImage(imageUrl);
    }
  }, [imageUrl]);

  React.useEffect(() => {
    // If no imageUrl is provided, try to generate one using AI
    if (!imageUrl) {
      const generate = async () => {
        setIsGenerating(true);
        const aiImage = await generateBakeryImage(name, description);
        if (aiImage) {
          setCurrentImage(aiImage);
        }
        setIsGenerating(false);
      };
      // For now, let's only generate if explicitly requested or if we want to show off the AI
      // But the request says "improve handling... use more relevant default... or AI"
      // Let's just use the relevant placeholder by default and provide a way to generate AI image in Dashboard
    }
  }, [imageUrl, name, description]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img 
        src={currentImage} 
        alt={name}
        className="w-full h-full object-cover transition-opacity duration-500"
        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        style={{ opacity: 0 }}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
      {isGenerating && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Generating AI Image...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BakeryImage;
