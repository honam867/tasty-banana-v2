'use client';

import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Download, X } from 'lucide-react';
import type { GenerationImage } from '@/lib/api/generations';

interface ImageGalleryProps {
  images: GenerationImage[];
  prompt: string;
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Image Gallery Lightbox Component
 * Displays generation images in a fullscreen lightbox with navigation
 */
export default function ImageGallery({
  images,
  prompt,
  isOpen,
  initialIndex = 0,
  onClose,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Convert images to lightbox format
  const slides = images.map((img) => ({
    src: img.imageUrl,
    alt: prompt,
    width: 1024,
    height: 1024,
  }));

  const handleDownload = async () => {
    const currentImage = images[currentIndex];
    if (!currentImage) return;

    try {
      const response = await fetch(currentImage.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generation-${currentImage.imageId}.${
        currentImage.mimeType.split('/')[1] || 'png'
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={currentIndex}
      on={{
        view: ({ index }) => setCurrentIndex(index),
      }}
      carousel={{
        finite: images.length <= 1,
      }}
      render={{
        buttonPrev: images.length <= 1 ? () => null : undefined,
        buttonNext: images.length <= 1 ? () => null : undefined,
        iconClose: () => <X className="w-6 h-6" />,
      }}
      toolbar={{
        buttons: [
          <button
            key="download"
            type="button"
            aria-label="Download"
            className="yarl__button"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5" />
          </button>,
          'close',
        ],
      }}
      styles={{
        container: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
        },
      }}
    />
  );
}
