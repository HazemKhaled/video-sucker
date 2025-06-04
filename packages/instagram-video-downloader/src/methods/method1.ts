import axios from 'axios';
import { InstagramPostInfo, DownloadOptions } from '../types.js';
import {
  downloadMediaItems,
  extractShortcode,
  getDefaultOutputDir,
  getMobileHeaders,
  createPostInfo,
  addMediaItem
} from './common.js';

/**
 * First method to download Instagram media
 * This is the primary method using direct extraction
 */
export async function downloadInstagramMediaMethod1(
  url: string, 
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const { outputDir = getDefaultOutputDir() } = options;
  
  try {
    console.log('Attempting method 1: Direct extraction');
    
    // Make a direct request to Instagram with a modern mobile user agent
    const response = await axios.get(url, {
      headers: getMobileHeaders(options.userAgent),
      maxRedirects: 5,
      timeout: 30000
    });

    if (!response.data) {
      throw new Error('Empty response from Instagram URL');
    }

    const html = response.data;
    
    // Try to extract data from various script tags
    let videoUrl = null;
    let thumbnailUrl = null;
    let username = 'unknown_user';
    let caption = '';

    // Look for shared data in script tags
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{.+?\});<\/script>/);
    const additionalDataMatch = html.match(/window\.__additionalDataLoaded\s*\(\s*['"](feed|reel)['"]\s*,\s*(\{.+?\})\);<\/script>/);
    
    // New data format that Instagram uses in 2025
    const reelDataMatch = html.match(/window\.__REELDATA__\s*=\s*(\{.+?\});<\/script>/) || 
                         html.match(/window\.__APOLLO_STATE__\s*=\s*(\{.+?\});<\/script>/) ||
                         html.match(/window\.__APOLLO_PROPS__\s*=\s*(\{.+?\});<\/script>/);
    
    // Try shared data first
    if (sharedDataMatch && sharedDataMatch[1]) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media ||
                     sharedData?.entry_data?.PostPage?.[0]?.media;
        
        if (media) {
          videoUrl = media.video_url;
          thumbnailUrl = media.display_url;
          username = media.owner?.username || 'unknown_user';
          caption = media.edge_media_to_caption?.edges?.[0]?.node?.text || '';
        }
      } catch (e) {
        console.log('Failed to parse shared data:', e);
      }
    }
    
    // Try additional data if shared data didn't work
    if (!videoUrl && additionalDataMatch && additionalDataMatch[2]) {
      try {
        const additionalData = JSON.parse(additionalDataMatch[2]);
        const media = additionalData?.items?.[0] || additionalData?.media;
        
        if (media) {
          videoUrl = media.video_url || media.video_versions?.[0]?.url;
          thumbnailUrl = media.image_versions2?.candidates?.[0]?.url || media.display_url;
          username = media.user?.username || media.owner?.username || 'unknown_user';
          caption = media.caption?.text || '';
        }
      } catch (e) {
        console.log('Failed to parse additional data:', e);
      }
    }
    
    // Try new REELDATA format from 2025
    if (!videoUrl && reelDataMatch && reelDataMatch[1]) {
      try {
        const reelData = JSON.parse(reelDataMatch[1]);
        
        // Navigate through the Apollo state structure
        const findVideoInApollo = (obj: any): any => {
          if (typeof obj !== 'object' || obj === null) return null;
          
          for (const key in obj) {
            const value = obj[key];
            if (value && typeof value === 'object') {
              // Look for video_url or similar properties
              if (value.video_url) {
                return value;
              }
              // Look for video_versions array
              if (value.video_versions && Array.isArray(value.video_versions) && value.video_versions.length > 0) {
                return value;
              }
              // Recursively search
              const found = findVideoInApollo(value);
              if (found) return found;
            }
          }
          return null;
        };
        
        const mediaData = findVideoInApollo(reelData);
        if (mediaData) {
          videoUrl = mediaData.video_url || mediaData.video_versions?.[0]?.url;
          thumbnailUrl = mediaData.display_url || mediaData.image_versions2?.candidates?.[0]?.url;
          username = mediaData.owner?.username || 'unknown_user';
          caption = mediaData.caption?.text || '';
        }
      } catch (e) {
        console.log('Failed to parse reel data:', e);
      }
    }
    
    // If we still don't have a video URL, try extracting from meta tags
    if (!videoUrl) {
      const metaVideoMatch = html.match(/<meta\s+property="og:video"\s+content="([^"]+)"/);
      if (metaVideoMatch) {
        videoUrl = metaVideoMatch[1];
      }
    }
    
    // Extract thumbnail from meta tags if not found
    if (!thumbnailUrl) {
      const thumbnailMatches = [
        html.match(/property="og:image"\s+content="([^"]+)"/),
        html.match(/<img[^>]+class="[^"]*tWeCl[^"]*"[^>]+src="([^"]+)"/),
        html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*FFVAD/),
        html.match(/<img[^>]+sizer_element--cover[^>]+src="([^"]+)"/)
      ];
      
      for (const match of thumbnailMatches) {
        if (match && match[1]) {
          thumbnailUrl = match[1];
          break;
        }
      }
    }
    
    // Extract username from meta tags if not found
    if (username === 'unknown_user') {
      const usernameMatches = [
        html.match(/property="og:title"\s+content="([^"•]+)/),
        html.match(/<title>([^•]+)/),
        html.match(/"username":"([^"]+)"/)
      ];
      
      for (const match of usernameMatches) {
        if (match && match[1]) {
          username = match[1].trim();
          break;
        }
      }
    }
    
    // Extract caption from meta tags if not found
    if (!caption) {
      const captionMatch = html.match(/property="og:description"\s+content="([^"]+)"/);
      if (captionMatch) {
        caption = captionMatch[1];
      }
    }

    if (!videoUrl && !thumbnailUrl) {
      throw new Error('No media found in the Instagram post');
    }

    // Extract the post ID from the URL
    const shortcode = extractShortcode(url);

    // Create post info object
    const postInfo = createPostInfo(shortcode, username, caption);

    // Add video or image
    if (videoUrl) {
      addMediaItem(postInfo, 'video', videoUrl, thumbnailUrl);
    } else if (thumbnailUrl) {
      addMediaItem(postInfo, 'image', thumbnailUrl, thumbnailUrl);
    }

    // Download all media items
    await downloadMediaItems(postInfo, outputDir);
    
    return postInfo;
  } catch (error) {
    console.error('Error in method 1:', error);
    throw error;
  }
}
