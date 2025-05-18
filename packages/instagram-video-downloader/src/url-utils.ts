/**
 * Instagram URL utilities for better URL handling
 */

/**
 * Normalizes an Instagram reel URL to ensure consistent handling
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
    
    // Check if it's a reel URL pattern
    const isReelUrl = /\/(?:reel|reels)\//.test(parsedUrl.pathname);
    if (!isReelUrl) {
      throw new Error('Not an Instagram reel URL');
    }
    
    // Remove all query parameters except essential ones
    const cleanUrl = new URL(parsedUrl.origin + parsedUrl.pathname);
    
    // Ensure we have a trailing slash for consistency
    if (!cleanUrl.pathname.endsWith('/')) {
      cleanUrl.pathname += '/';
    }
    
    // Ensure hostname is www.instagram.com for consistency
    if (cleanUrl.hostname === 'instagram.com') {
      cleanUrl.hostname = 'www.instagram.com';
    }
    
    return cleanUrl.toString();
  } catch (error) {
    // If URL parsing fails, return the original URL
    console.warn('Could not normalize Instagram URL:', error);
    return url;
  }
}

/**
 * Validates if a URL is a valid Instagram reel URL that we can process
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
  
  // Check for reel format
  if (segments.length >= 2 && (segments[0] === 'reel' || segments[0] === 'reels')) {
    return segments[1];
  }
  
  return null;
}