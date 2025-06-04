import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { InstagramPostInfo } from '../types.js';

// Rotate through different user agents to avoid blocking
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36'
];

/**
 * Get a random user agent to avoid detection
 */
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Downloads a file from a URL and saves it to disk
 */
export async function downloadFile(url: string, outputPath: string, userAgent?: string): Promise<void> {
  try {
    const selectedUserAgent = userAgent || getRandomUserAgent();
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': selectedUserAgent,
        'Referer': 'https://www.instagram.com/',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Origin': 'https://www.instagram.com'
      },
      maxRedirects: 5,
      timeout: 60000 // Increased to 60 seconds timeout
    });

    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(outputPath, response.data);
    console.log(`Downloaded: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to download ${url}:`, error);
    throw error;
  }
}

/**
 * Downloads all media items from a post
 */
export async function downloadMediaItems(postInfo: InstagramPostInfo, outputDir: string): Promise<string[]> {
  const savedFiles: string[] = [];
  
  for (let i = 0; i < postInfo.mediaItems.length; i++) {
    const mediaItem = postInfo.mediaItems[i];
    
    if (mediaItem.url) {
      try {
        // Generate filename
        const extension = mediaItem.type === 'video' ? 'mp4' : 'jpg';
        const filename = postInfo.mediaItems.length > 1 
          ? `${postInfo.reelId}_${i + 1}.${extension}`
          : `${postInfo.reelId}.${extension}`;
        
        const outputPath = path.join(outputDir, filename);
        
        // Download the file
        await downloadFile(mediaItem.url, outputPath);
        savedFiles.push(outputPath);
        
        // Also download thumbnail if it exists and is different from main media
        if (mediaItem.thumbnailUrl && mediaItem.thumbnailUrl !== mediaItem.url) {
          const thumbnailFilename = postInfo.mediaItems.length > 1 
            ? `${postInfo.reelId}_${i + 1}_thumbnail.jpg`
            : `${postInfo.reelId}_thumbnail.jpg`;
          
          const thumbnailPath = path.join(outputDir, thumbnailFilename);
          
          try {
            await downloadFile(mediaItem.thumbnailUrl, thumbnailPath);
            savedFiles.push(thumbnailPath);
          } catch (thumbnailError) {
            console.warn(`Failed to download thumbnail: ${thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error(`Failed to download media item ${i + 1}:`, error);
        throw error;
      }
    }
  }
  
  // Update the post info with saved files
  postInfo.savedFiles = savedFiles.map((filePath) => ({
    mediaPath: filePath,
    thumbnailPath: undefined
  }));
  
  return savedFiles;
}

/**
 * Extract shortcode from Instagram URL
 */
export function extractShortcode(url: string): string {
  const reelMatch = url.match(/\/reel\/([^\/\?]+)/);
  const postMatch = url.match(/\/p\/([^\/\?]+)/);
  
  const shortcode = reelMatch?.[1] || postMatch?.[1];
  if (!shortcode) {
    throw new Error('Could not extract shortcode from URL');
  }
  
  return shortcode;
}



/**
 * Get mobile headers for Instagram requests
 */
export function getMobileHeaders(userAgent?: string) {
  return {
    'User-Agent': userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://www.google.com/',
    'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="125", "Chromium";v="125"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"iOS"',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
}

/**
 * Get desktop headers for Instagram requests
 */
export function getDesktopHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="8"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
}

/**
 * Get Firefox headers for Instagram requests
 */
export function getFirefoxHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
}

/**
 * Common video URL patterns for Instagram
 */
export const VIDEO_PATTERNS = [
  // Modern Instagram patterns
  /"video_url":"([^"]+)"/g,
  /"playback_url":"([^"]+)"/g,
  /"src":"(https:\/\/[^"]+\.mp4[^"]*)"/g,
  /"contentUrl":"([^"]+)"/g,
  // Fallback patterns
  /video_url":\s*"([^"]+)"/g,
  /playback_url":\s*"([^"]+)"/g,
  // Direct URL patterns
  /(https:\/\/[^"'\s]+\.mp4[^"'\s]*)/g
];

/**
 * Clean and validate video URL
 */
export function cleanVideoUrl(url: string): string {
  return url.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
}

/**
 * Filter valid video URLs
 */
export function filterValidVideoUrls(urls: string[]): string[] {
  return urls.filter(url =>
    url.includes('.mp4') &&
    (url.includes('scontent') || url.includes('cdninstagram') || url.includes('fbcdn'))
  );
}

/**
 * Get default output directory
 */
export function getDefaultOutputDir(): string {
  return path.join(process.cwd(), 'public');
}

/**
 * Normalize video URL by fixing protocol and encoding issues
 */
export function normalizeVideoUrl(url: string): string {
  let normalizedUrl = url;

  // Fix protocol
  if (normalizedUrl.startsWith('//')) {
    normalizedUrl = `https:${normalizedUrl}`;
  } else if (normalizedUrl.startsWith('/')) {
    normalizedUrl = `https://www.instagram.com${normalizedUrl}`;
  }

  // Clean up encoded characters
  normalizedUrl = normalizedUrl.replace(/\\u0026/g, '&')
                               .replace(/\\u003c/g, '<')
                               .replace(/\\u003e/g, '>')
                               .replace(/\\\//g, '/');

  return normalizedUrl;
}

/**
 * Create a standardized PostInfo object
 */
export function createPostInfo(shortcode: string, username: string = 'unknown_user', caption: string = ''): InstagramPostInfo {
  return {
    reelId: shortcode,
    username,
    caption,
    mediaItems: []
  };
}

/**
 * Add media item to post info with proper URL normalization
 */
export function addMediaItem(
  postInfo: InstagramPostInfo,
  type: 'video' | 'image',
  url: string,
  thumbnailUrl?: string | null
): void {
  const normalizedUrl = normalizeVideoUrl(url);
  const normalizedThumbnailUrl = thumbnailUrl ? normalizeVideoUrl(thumbnailUrl) : undefined;

  postInfo.mediaItems.push({
    type,
    url: normalizedUrl,
    thumbnailUrl: normalizedThumbnailUrl
  });
}
