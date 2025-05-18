/**
 * Instagram URL utilities for better URL handling
 */

/**
 * Normalizes an Instagram URL to ensure consistent handling
 * This removes tracking parameters, fragments, etc.
 */
export function normalizeInstagramUrl(url: string): string {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Ensure it's an Instagram URL
    if (!parsedUrl.hostname.includes('instagram.com')) {
      throw new Error('Not an Instagram URL');
    }
    
    // Remove all query parameters except essential ones
    const cleanUrl = new URL(parsedUrl.origin + parsedUrl.pathname);
    
    return cleanUrl.toString();
  } catch (error) {
    // If URL parsing fails, return the original URL
    console.warn('Could not normalize Instagram URL:', error);
    return url;
  }
}

/**
 * Validates if a URL is a valid Instagram URL that we can process
 * We only support reels as per requirements
 */
export function isValidInstagramUrl(url: string): boolean {
  // Basic validation for Instagram domain
  if (!url.includes('instagram.com')) {
    return false;
  }
  
  // Only support reels as per requirements
  // - reels: instagram.com/reel/{id} or instagram.com/reels/{id}
  const reelPattern = /instagram\.com\/(?:reel|reels)\/([A-Za-z0-9_-]+)/i;
  
  return reelPattern.test(url);
}

/**
 * Extracts the content ID from the URL path segments
 */
export function getContentIdFromPath(urlPath: string): string | null {
  // Remove leading/trailing slashes and split path
  const segments = urlPath.replace(/^\/|\/$/g, '').split('/');
  
  // For posts and reels, the ID is typically after 'p' or 'reel'
  if (segments.includes('p') || segments.includes('reel') || segments.includes('reels')) {
    const idIndex = segments.findIndex(s => s === 'p' || s === 'reel' || s === 'reels') + 1;
    if (idIndex < segments.length) {
      return segments[idIndex];
    }
  }
  
  return null;
}