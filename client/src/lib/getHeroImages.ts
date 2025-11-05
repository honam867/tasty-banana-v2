/**
 * Configuration for hero images
 * 
 * USAGE: Just add images following the pattern: hero-slide-{number}.jpg
 * Then update MAX_HERO_SLIDES below to match the total count
 * 
 * Example: When you add hero-slide-6.jpg, update MAX_HERO_SLIDES to 6
 */

const MAX_HERO_SLIDES = 5; // Update this number when you add/remove images

/**
 * Generates hero image paths based on convention: /images/hero-slide-{1..N}.jpg
 * Images will be automatically included based on MAX_HERO_SLIDES count
 */
export function getHeroImages(): string[] {
  return Array.from(
    { length: MAX_HERO_SLIDES }, 
    (_, i) => `/images/hero-slide-${i + 1}.jpg`
  );
}
