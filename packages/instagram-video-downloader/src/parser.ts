import axios from 'axios';
import * as cheerio from 'cheerio';
import { ParsingResult, InstagramContentType, InstagramPostInfo, MediaItem } from './types.js';

// Regex patterns for Instagram reel URL format
const REEL_PATTERN = /instagram\.com\/(?:reel|reels)\/([^\/\?#]+)/i;

/**
 * Determines the type of Instagram content from a URL
 * Since we only support reels, this will always return 'reel' for valid URLs
 */
export function getContentType(url: string): InstagramContentType {
  if (REEL_PATTERN.test(url)) return 'reel';
  return 'unknown';
}

/**
 * Extracts the post ID from an Instagram URL
 */
export function extractPostId(url: string): string {
  const reelMatch = url.match(REEL_PATTERN);
  
  if (reelMatch && reelMatch[1]) return reelMatch[1];
  
  throw new Error('Could not extract post ID from Instagram URL');
}

/**
 * Extracts the username from an Instagram URL or content
 */
export function extractUsername(url: string, html?: string): string {
  
  // If HTML is provided, try to extract from it
  if (html) {
    const $ = cheerio.load(html);
    
    // Try multiple methods to find username
    const metaUsername = $('meta[property="og:title"]').attr('content');
    if (metaUsername) {
      const usernameMatch = metaUsername.match(/(.*) on Instagram/i);
      if (usernameMatch && usernameMatch[1]) return usernameMatch[1];
    }
    
    // Look for username in JSON data
    const scriptTags = $('script[type="application/ld+json"]').toArray();
    for (let i = 0; i < scriptTags.length; i++) {
      try {
        const jsonData = JSON.parse($(scriptTags[i]).html() || '{}');
        if (jsonData.author?.identifier?.value) {
          return jsonData.author.identifier.value;
        }
      } catch {
        // Skip if JSON parsing fails
      }
    }
  }
  
  // If all methods fail, return unknown
  return 'unknown_user';
}

/**
 * Parses the HTML to extract media URLs and metadata
 */
export function parseHtml(html: string, url: string): ParsingResult {
  const $ = cheerio.load(html);
  const mediaItems: MediaItem[] = [];
  const contentType = getContentType(url);
  let caption = '';
  let likesCount: number | undefined;
  let commentsCount: number | undefined;
  let isCarousel = false;
  
  try {
    // Try to extract caption
    caption = $('meta[property="og:description"]').attr('content') || '';
    
    // Extract video URLs
    const videoUrl = $('meta[property="og:video"]').attr('content');
    const videoThumbnail = $('meta[property="og:image"]').attr('content');
    
    if (videoUrl) {
      mediaItems.push({
        type: 'video',
        url: videoUrl,
        thumbnailUrl: videoThumbnail
      });
    } else {
      // If no video, look for images
      const imageUrl = $('meta[property="og:image"]').attr('content');
      if (imageUrl) {
        mediaItems.push({
          type: 'image',
          url: imageUrl
        });
      }
    }
    
    // Check for additional media (carousel)
    // This requires additional parsing of Instagram's embedded JSON data
    const scriptTags = $('script:not([src])').toArray().filter(elem => {
      return $(elem).html()?.includes('window._sharedData =') || false;
    });
    
    if (scriptTags.length > 0) {
      const scriptContent = $(scriptTags[0]).html() || '';
      const dataMatch = scriptContent.match(/window\._sharedData = (.+);/);
      
      if (dataMatch && dataMatch[1]) {
        try {
          const jsonData = JSON.parse(dataMatch[1]);
          const mediaData = jsonData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
          
          if (mediaData) {
            if (mediaData.edge_media_preview_like?.count) {
              likesCount = mediaData.edge_media_preview_like.count;
            }
            
            if (mediaData.edge_media_to_comment?.count) {
              commentsCount = mediaData.edge_media_to_comment.count;
            }
            
            if (mediaData.edge_sidecar_to_children?.edges) {
              isCarousel = true;
              mediaData.edge_sidecar_to_children.edges.forEach((edge: { 
                node: { 
                  is_video?: boolean; 
                  video_url?: string;
                  display_url?: string;
                } 
              }) => {
                const node = edge.node;
                if (node.is_video && node.video_url) {
                  mediaItems.push({
                    type: 'video',
                    url: node.video_url,
                    thumbnailUrl: node.display_url
                  });
                } else if (node.display_url) {
                  mediaItems.push({
                    type: 'image',
                    url: node.display_url
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error('Error parsing Instagram JSON data:', e);
        }
      }
    }
  } catch (e) {
    console.error('Error parsing Instagram HTML:', e);
  }
  
  // Fallback: If no media items found, add the og:image as a fallback
  if (mediaItems.length === 0) {
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      mediaItems.push({
        type: 'image',
        url: ogImage
      });
    }
  }
  
  const postId = extractPostId(url);
  const username = extractUsername(url, html);
  
  const postInfo: InstagramPostInfo = {
    postId,
    username,
    caption,
    likesCount,
    commentsCount,
    isCarousel,
    mediaItems
  };
  
  return {
    contentType,
    postInfo
  };
}

/**
 * Fetches and parses Instagram content from a URL
 */
export async function parseInstagramUrl(url: string): Promise<ParsingResult> {
  try {
    // Make the request with a browser-like user agent
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Referer': 'https://www.google.com/',
        'sec-ch-ua': '"Safari";v="17", "Chromium";v="125", "Not.A/Brand";v="8"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'DNT': '1'
      },
      timeout: 15000 // 15 seconds timeout for fetching Instagram content
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch Instagram URL, status code: ${response.status}`);
    }
    
    return parseHtml(response.data, url);
  } catch (error) {
    console.error('Error fetching Instagram content:', error);
    
    // If the first method fails, try alternate methods
    return await parseWithAlternateMethod(url);
  }
}

/**
 * Alternative parsing method using a different approach
 * This serves as a fallback if the primary method fails
 */
async function parseWithAlternateMethod(url: string): Promise<ParsingResult> {
  try {
    // Try using an Instagram oEmbed endpoint
    const oEmbedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    const response = await axios.get(oEmbedUrl);
    
    if (response.status === 200 && response.data) {
      const contentType = getContentType(url);
      const postId = extractPostId(url);
      
      const postInfo: InstagramPostInfo = {
        postId,
        username: response.data.author_name || 'unknown_user',
        caption: response.data.title || '',
        isCarousel: false,
        mediaItems: [
          {
            type: contentType === 'reel' ? 'video' : 'image',
            url: response.data.thumbnail_url || '',
            thumbnailUrl: response.data.thumbnail_url
          }
        ]
      };
      
      return {
        contentType,
        postInfo
      };
    }
  } catch (error) {
    console.error('Error in alternate parsing method:', error);
  }
  
  // If all methods fail, return a minimal result
  const contentType = getContentType(url);
  const postId = extractPostId(url);
  
  return {
    contentType,
    postInfo: {
      postId,
      username: 'unknown_user',
      isCarousel: false,
      mediaItems: []
    }
  };
}
