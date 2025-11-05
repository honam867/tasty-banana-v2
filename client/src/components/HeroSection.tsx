'use client';

import HeroCarousel from './HeroCarousel';
import { getHeroImages } from '@/lib/getHeroImages';

/**
 * Hero section that automatically loads images based on naming convention
 * Just add images as: hero-slide-1.jpg, hero-slide-2.jpg, etc.
 * and update MAX_HERO_SLIDES in lib/getHeroImages.ts
 */
export default function HeroSection() {
  const heroImages = getHeroImages();
  
  return <HeroCarousel images={heroImages} />;
}
