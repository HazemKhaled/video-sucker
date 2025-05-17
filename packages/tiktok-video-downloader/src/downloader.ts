import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';

export interface TikTokVideoInfo {
  video: string;
  thumbnail: string;
  username: string;
  description: string;
  downloadUrl?: string;
  videoId: string;
}

export interface DownloadOptions {
  outputDir: string;
  customFilename?: string;
  videoId?: string;
}

/**
 * Extract TikTok video ID and username from a TikTok URL
 */
export function extractTikTokInfo(url: string): { videoId: string; username: string } {
  let username = '';
  let videoId = '';
  
  try {
    const urlParts = url.split('/');
    videoId = urlParts[urlParts.length - 1].split('?')[0];
    username = url.includes('@') ? url.split('@')[1]?.split('/')[0] || '' : '';
  } catch (e) {
    console.error('Error extracting video info:', e);
  }
  
  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  return { videoId, username };
}

/**
 * Attempt to download TikTok video using TikTok's embed API and tikwm.com API
 */
export async function downloadTikTokVideoMethod1(
  url: string, 
  options: DownloadOptions
): Promise<TikTokVideoInfo> {
  const { videoId, username } = extractTikTokInfo(url);
  const outputDir = options.outputDir ? path.join(options.outputDir, videoId) : path.join(process.cwd(), 'tiktok', videoId);
  
  // Create the directory for this specific TikTok video
  await mkdir(outputDir, { recursive: true });

  // First, use TikTok's embed API to get metadata
  const embedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const embedResponse = await fetch(embedUrl);
  
  if (!embedResponse.ok) {
    throw new Error('Failed to fetch TikTok embed data');
  }
  
  const embedData = await embedResponse.json() as any;
  
  // Now use TikTok downloader API to get the actual video file
  const tikApiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
  const tikApiResponse = await fetch(tikApiUrl);
  
  if (!tikApiResponse.ok) {
    throw new Error('Failed to fetch video download URL');
  }
  
  const tikApiData = await tikApiResponse.json() as any;
  
  if (!tikApiData.data || !tikApiData.data.play) {
    throw new Error('No video URL found in response');
  }
  
  // Download the video file
  const videoUrl = tikApiData.data.play;
  const videoResponse = await fetch(videoUrl);
  
  if (!videoResponse.ok) {
    throw new Error('Failed to download video file');
  }
  
  // Save the video with the filename 'video.mp4' in the videoId folder
  const videoPath = path.join(outputDir, 'video.mp4');
  
  if (videoResponse.body) {
    const fileStream = createWriteStream(videoPath);
    await pipeline(videoResponse.body, fileStream);
  } else {
    throw new Error('Failed to get video response body');
  }
  
  // Get thumbnail from the TikTok API response
  const thumbnailUrl = tikApiData.data.cover || embedData.thumbnail_url;
  
  // If we have a thumbnail URL, download it as well
  let thumbnailPath = '';
  if (thumbnailUrl) {
    const thumbnailResponse = await fetch(thumbnailUrl);
    if (thumbnailResponse.ok && thumbnailResponse.body) {
      thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
      const fileStream = createWriteStream(thumbnailPath);
      await pipeline(thumbnailResponse.body, fileStream);
    }
  }
  
  return {
    video: videoPath,
    thumbnail: thumbnailPath,
    username: tikApiData.data.author?.nickname || embedData.author_name || username || 'Unknown',
    description: tikApiData.data.title || embedData.title || 'TikTok Video',
    downloadUrl: videoPath,
    videoId
  };
}

/**
 * Attempt to download TikTok video using ssstik.io API (fallback method)
 */
export async function downloadTikTokVideoMethod2(
  url: string,
  options: DownloadOptions
): Promise<TikTokVideoInfo> {
  const { videoId, username } = extractTikTokInfo(url);
  const outputDir = options.outputDir ? path.join(options.outputDir, videoId) : path.join(process.cwd(), 'tiktok', videoId);
  
  // Create the directory for this specific TikTok video
  await mkdir(outputDir, { recursive: true });
  
  // Try an alternative API service (this is a fallback)
  const ssstikUrl = `https://ssstik.io/api/1/downloader?url=${encodeURIComponent(url)}`;
  const ssstikResponse = await fetch(ssstikUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!ssstikResponse.ok) {
    throw new Error('Failed to fetch from backup service');
  }
  
  const ssstikData = await ssstikResponse.json() as any;
  
  // Download video from the backup service
  const backupVideoUrl = ssstikData.video?.download_url;
  if (!backupVideoUrl) {
    throw new Error('No video URL in backup response');
  }
  
  const backupVideoResponse = await fetch(backupVideoUrl);
  if (!backupVideoResponse.ok || !backupVideoResponse.body) {
    throw new Error('Failed to download video from backup service');
  }
  
  // Save the video with the filename 'video.mp4' in the videoId folder
  const videoPath = path.join(outputDir, 'video.mp4');
  
  const videoFileStream = createWriteStream(videoPath);
  await pipeline(backupVideoResponse.body, videoFileStream);
  
  // Try to get and save the thumbnail
  let thumbnailPath = '';
  if (ssstikData.thumbnail) {
    const thumbnailResponse = await fetch(ssstikData.thumbnail);
    if (thumbnailResponse.ok && thumbnailResponse.body) {
      thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
      const thumbnailFileStream = createWriteStream(thumbnailPath);
      await pipeline(thumbnailResponse.body, thumbnailFileStream);
    }
  }
  
  return {
    video: videoPath,
    thumbnail: thumbnailPath,
    username: ssstikData.author || username || 'Unknown',
    description: ssstikData.title || 'TikTok Video',
    downloadUrl: videoPath,
    videoId
  };
}

/**
 * Attempt to download TikTok video using rapidsave.com API (last resort fallback)
 */
export async function downloadTikTokVideoMethod3(
  url: string,
  options: DownloadOptions
): Promise<TikTokVideoInfo> {
  const { videoId, username } = extractTikTokInfo(url);
  const outputDir = options.outputDir ? path.join(options.outputDir, videoId) : path.join(process.cwd(), 'tiktok', videoId);
  
  // Create the directory for this specific TikTok video
  await mkdir(outputDir, { recursive: true });
  
  // Use a public video downloader as last resort
  const rapidsaveUrl = `https://rapidsave.com/api/get-video?url=${encodeURIComponent(url)}`;
  const rapidsaveResponse = await fetch(rapidsaveUrl);
  
  if (!rapidsaveResponse.ok) {
    throw new Error('Failed to fetch from last resort service');
  }
  
  const rapidsaveData = await rapidsaveResponse.json() as any;
  
  if (!rapidsaveData.videoUrl) {
    throw new Error('No video URL in last resort response');
  }
  
  // Download the video
  const videoResponse = await fetch(rapidsaveData.videoUrl);
  if (!videoResponse.ok || !videoResponse.body) {
    throw new Error('Failed to download video from last resort service');
  }
  
  // Save the video with the filename 'video.mp4' in the videoId folder
  const videoPath = path.join(outputDir, 'video.mp4');
  
  const videoFileStream = createWriteStream(videoPath);
  await pipeline(videoResponse.body, videoFileStream);
  
  // Try to get and save the thumbnail
  let thumbnailPath = '';
  if (rapidsaveData.thumbnailUrl) {
    const thumbnailResponse = await fetch(rapidsaveData.thumbnailUrl);
    if (thumbnailResponse.ok && thumbnailResponse.body) {
      thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
      const thumbnailFileStream = createWriteStream(thumbnailPath);
      await pipeline(thumbnailResponse.body, thumbnailFileStream);
    }
  }
  
  return {
    video: videoPath,
    thumbnail: thumbnailPath,
    username: rapidsaveData.author || 'Unknown',
    description: rapidsaveData.description || 'TikTok Video',
    downloadUrl: videoPath,
    videoId
  };
}

/**
 * Download a TikTok video from a URL
 * This function will try multiple methods to download the video
 */
export async function downloadTikTokVideo(
  url: string,
  options: DownloadOptions = { outputDir: path.join(process.cwd(), 'tiktok') }
): Promise<TikTokVideoInfo> {
  // Validate URL
  if (!url || !url.includes('tiktok.com')) {
    throw new Error('Invalid TikTok URL');
  }

  try {
    // Try the primary method first
    return await downloadTikTokVideoMethod1(url, options);
  } catch (error) {
    console.error('First download method failed:', error);
    
    try {
      // Try the second method
      return await downloadTikTokVideoMethod2(url, options);
    } catch (fallbackError) {
      console.error('Second download method failed:', fallbackError);
      
      try {
        // Try the third method
        return await downloadTikTokVideoMethod3(url, options);
      } catch (lastError) {
        console.error('All download methods failed:', lastError);
        throw new Error('Failed to download TikTok video after trying all methods');
      }
    }
  }
}
