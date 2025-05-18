import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import * as cheerio from 'cheerio';
import { DownloadOptions, InstagramPostInfo } from './types.js';
import { parseInstagramUrl } from './parser.js';
import { normalizeInstagramUrl, isValidInstagramUrl } from './url-utils.js';

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
 * Get a random user agent from the list
 */
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Downloads a file from a URL and saves it to disk
 */
async function downloadFile(url: string, outputPath: string, userAgent?: string): Promise<void> {
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
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      maxRedirects: 5,
      timeout: 30000 // 30 seconds timeout
    });

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, Buffer.from(response.data, 'binary'));
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error);
    throw new Error(`Failed to download file from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Downloads all media items from an Instagram reel
 */
async function downloadMediaItems(
  postInfo: InstagramPostInfo, 
  outputDir: string
): Promise<void> {
  const { reelId, mediaItems } = postInfo;
  const reelDir = path.join(outputDir, 'instagram', reelId);
  
  // Ensure the output directory exists
  await fs.ensureDir(reelDir);
  
  // Save metadata
  await fs.writeJson(
    path.join(reelDir, 'metadata.json'), 
    {
      ...postInfo,
      downloadedAt: new Date().toISOString()
    },
    { spaces: 2 }
  );
  
  // Download each media item
  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];
    const fileIndex = mediaItems.length > 1 ? `_${i + 1}` : '';
    const mediaFileName = `video${fileIndex}.mp4`;
    const mediaPath = path.join(reelDir, mediaFileName);
    
    // Add the file name to the media item for reference
    item.fileName = mediaFileName;
    
    // Download the media
    await downloadFile(item.url, mediaPath);
    
    // Download the thumbnail if it exists and is different from the media URL
    if (item.thumbnailUrl && item.thumbnailUrl !== item.url) {
      const thumbnailFileName = `thumbnail${fileIndex}.jpg`;
      const thumbnailPath = path.join(reelDir, thumbnailFileName);
      await downloadFile(item.thumbnailUrl, thumbnailPath);
    }
  }
  
  // Update the postInfo with file paths
  postInfo.savedFiles = mediaItems.map((item, index) => {
    const fileIndex = mediaItems.length > 1 ? `_${index + 1}` : '';
    return {
      mediaPath: `/instagram/${reelId}/${item.fileName}`,
      thumbnailPath: item.thumbnailUrl ? `/instagram/${reelId}/thumbnail${fileIndex}.jpg` : undefined
    };
  });
}

/**
 * First method to download Instagram media
 * This is the primary method using direct extraction
 */
export async function downloadInstagramMediaMethod1(
  url: string, 
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const { outputDir = path.join(process.cwd(), 'public') } = options;
  
  try {
    // Parse the Instagram URL to get content info
    const { postInfo } = await parseInstagramUrl(url);
    
    // If no media items found, throw an error
    if (postInfo.mediaItems.length === 0) {
      throw new Error('No media found in the Instagram post');
    }
    
    // Download all media items
    await downloadMediaItems(postInfo, outputDir);
    
    return postInfo;
  } catch (error) {
    console.error('Error in method 1:', error);
    throw error;
  }
}

/**
 * Second method to download Instagram media
 * This uses an alternative approach as a fallback
 */
export async function downloadInstagramMediaMethod2(
  url: string, 
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const { outputDir = path.join(process.cwd(), 'public') } = options;
  
  try {
    // Make a direct request to Instagram with a modern mobile user agent
    const response = await axios.get(url, {
      headers: {
        'User-Agent': options.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="125", "Chromium";v="125"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"iOS"',
        'sec-fetch-site': 'none',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-user': '?1',
        'sec-fetch-dest': 'document',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000 // 15 seconds timeout
    });
    
    if (!response.data || response.status !== 200) {
      throw new Error('Failed to fetch Instagram content');
    }
    
    // Parse the HTML manually to extract video URLs
    const html = response.data;
    let videoUrl = null;
    let thumbnailUrl = null;
    let username = 'unknown_user';
    let caption = '';
    
    // Approach 1: Modern Instagram JSON data patterns
    // Instagram now embeds data in various script patterns
    // Try to find shared data in the HTML (classic approach)
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*(\{.+?\});<\/script>/);
    
    // Additional data can be in multiple formats now
    const additionalDataMatch = html.match(/window\.__additionalDataLoaded\s*\(\s*['"](feed|reel)['"]\s*,\s*(\{.+?\})\);<\/script>/);
    
    // New data format that Instagram uses in 2025
    const reelDataMatch = html.match(/window\.__REELDATA__\s*=\s*(\{.+?\});<\/script>/) || 
                         html.match(/window\.__APOLLO_STATE__\s*=\s*(\{.+?\});<\/script>/) ||
                         html.match(/window\.__APOLLO_PROPS__\s*=\s*(\{.+?\});<\/script>/);
    
    // Try to extract from sharedData (old format but sometimes still works)
    if (sharedDataMatch && sharedDataMatch[1]) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const mediaData = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
        
        if (mediaData) {
          videoUrl = mediaData.video_url;
          thumbnailUrl = mediaData.display_url;
          username = mediaData.owner?.username || 'unknown_user';
          caption = mediaData.edge_media_to_caption?.edges?.[0]?.node?.text || '';
        } else {
          // Alternative path for reels in newer sharedData format
          const reelPath = sharedData?.entry_data?.ReelsPageContainer?.[0]?.reels_data?.reels;
          if (reelPath) {
            const reelId = Object.keys(reelPath)[0];
            const reelData = reelPath[reelId];
            if (reelData) {
              videoUrl = reelData.media?.video_versions?.[0]?.url;
              thumbnailUrl = reelData.media?.image_versions2?.candidates?.[0]?.url;
              username = reelData.media?.user?.username || 'unknown_user';
              caption = reelData.media?.caption?.text || '';
            }
          }
        }
      } catch (e) {
        console.error('Error parsing Instagram shared data:', e);
      }
    }
    
    // Try to extract from additional data (newer format)
    if (!videoUrl && additionalDataMatch && additionalDataMatch[2]) {
      try {
        const additionalData = JSON.parse(additionalDataMatch[2]);
        
        // Different paths to the media data depending on the format
        const mediaData = additionalData?.items?.[0] || 
                        additionalData?.data?.shortcode_media || 
                        additionalData?.graphql?.shortcode_media;
        
        if (mediaData) {
          videoUrl = mediaData.video_versions?.[0]?.url || 
                   mediaData.video_url ||
                   mediaData.media?.video_versions?.[0]?.url;
          
          thumbnailUrl = mediaData.image_versions2?.candidates?.[0]?.url || 
                       mediaData.display_url ||
                       mediaData.media?.image_versions2?.candidates?.[0]?.url;
          
          username = mediaData.user?.username || 
                   mediaData.owner?.username || 
                   'unknown_user';
          
          caption = mediaData.caption?.text || 
                  mediaData.edge_media_to_caption?.edges?.[0]?.node?.text || 
                  '';
        }
      } catch (e) {
        console.error('Error parsing Instagram additional data:', e);
      }
    }
    
    // Try new REELDATA format from 2025
    if (!videoUrl && reelDataMatch && reelDataMatch[1]) {
      try {
        const reelData = JSON.parse(reelDataMatch[1]);
        
        // Look for video URL in all possible paths that Instagram might use
        const possiblePaths = [
          reelData?.gql_data?.shortcode_media,
          reelData?.clips_data?.clips?.[0],
          reelData?.data?.xdt_api__v1__clips__viewer?.clips?.edges?.[0]?.node,
          reelData?.data?.xdt_api__v1__reels__viewer?.reels?.edges?.[0]?.node,
          reelData?.data?.xdt_api__v1__media__shortcode?.shortcode_media
        ];
        
        for (const mediaData of possiblePaths) {
          if (!mediaData) continue;
          
          videoUrl = videoUrl || 
                   mediaData.video_url || 
                   mediaData.video_versions?.[0]?.url ||
                   mediaData.playback_video_url ||
                   mediaData.clips_media?.video_versions?.[0]?.url;
                   
          thumbnailUrl = thumbnailUrl || 
                       mediaData.display_url || 
                       mediaData.image_versions2?.candidates?.[0]?.url ||
                       mediaData.clips_media?.image_versions2?.candidates?.[0]?.url;
                       
          username = username !== 'unknown_user' ? 
                   username : 
                   (mediaData.owner?.username || 
                   mediaData.user?.username || 
                   'unknown_user');
                   
          caption = caption || 
                  mediaData.edge_media_to_caption?.edges?.[0]?.node?.text || 
                  mediaData.caption?.text || 
                  '';
          
          if (videoUrl) break;
        }
      } catch (e) {
        console.error('Error parsing Instagram reel data:', e);
      }
    }
    
    // Approach 2: Direct HTML parsing for video tags
    if (!videoUrl) {
      // Modern Instagram can use multiple formats for video elements
      const videoMatches = [
        // Standard video tag
        html.match(/<video[^>]+src="([^"]+)"/),
        // Video tag with data-src attribute
        html.match(/<video[^>]+data-src="([^"]+)"/),
        // Source tag inside video element
        html.match(/<video[^>]+>[\s\S]*?<source[^>]+src="([^"]+)"/),
        // Newer Instagram embeds video URL in a property
        html.match(/property="og:video"\s+content="([^"]+)"/),
        // Video in meta tag
        html.match(/<meta[^>]+property="og:video:secure_url"[^>]+content="([^"]+)"/),
        // Some Instagram reels use media embeds
        html.match(/playback_url":\s*"([^"]+)"/),
        // Fallback to any URL pattern that looks like a video
        html.match(/(?:https?:\/\/[^"']+\.(?:mp4|mov)[^"']*)/i)
      ];
      
      for (const match of videoMatches) {
        if (match && match[1]) {
          videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>');
          break;
        }
      }
      
      // Try to find thumbnail if we have a video but no thumbnail
      if (videoUrl && !thumbnailUrl) {
        const thumbnailMatches = [
          html.match(/property="og:image"\s+content="([^"]+)"/),
          html.match(/<img[^>]+class="[^"]*tWeCl[^"]*"[^>]+src="([^"]+)"/),
          html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*FFVAD/),
          html.match(/<img[^>]+sizer_element--cover[^>]+src="([^"]+)"/)
        ];
        
        for (const match of thumbnailMatches) {
          if (match && match[1]) {
            thumbnailUrl = match[1].replace(/\\u0026/g, '&');
            break;
          }
        }
      }
    }
    
    const postIdMatch = url.match(/\/reel\/([^\/\?]+)/i);
    
    if (!videoUrl && !thumbnailUrl) {
      throw new Error('Could not find media URLs in Instagram content');
    }
    
    // Try to extract username and caption from meta tags if not found earlier
    if (username === 'unknown_user') {
      const titleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
      if (titleMatch && titleMatch[1]) {
        const usernameMatch = titleMatch[1].match(/([^•]+)•/);
        username = usernameMatch ? usernameMatch[1].trim() : 'unknown_user';
      }
    }
    
    if (!caption) {
      const descMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/);
      if (descMatch && descMatch[1]) {
        caption = descMatch[1].replace(/^[^:]+: /, '');
      }
    }
    
    // Create post info object
    const postInfo: InstagramPostInfo = {
      reelId: postIdMatch?.[1] || 'unknown',
      username,
      caption,
      mediaItems: []
    };
    
    // Add video
    if (videoUrl) {
      postInfo.mediaItems.push({
        type: 'video',
        url: videoUrl,
        thumbnailUrl: thumbnailUrl
      });
    } else if (thumbnailUrl) {
      postInfo.mediaItems.push({
        type: 'video',
        url: thumbnailUrl,
        thumbnailUrl: thumbnailUrl
      });
    }
    
    // Download all media items
    await downloadMediaItems(postInfo, outputDir);
    
    return postInfo;
  } catch (error) {
    console.error('Error in method 2:', error);
    throw error;
  }
}

/**
 * Third method to download Instagram media
 * This uses a web-based scraper as a last resort
 */
export async function downloadInstagramMediaMethod3(
  url: string, 
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const { outputDir = path.join(process.cwd(), 'public') } = options;
  
  try {
    // Use a different approach with a modern desktop browser user agent and additional headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="8"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/',
        'Priority': 'u=0, i',
        'DNT': '1'
      },
      timeout: 20000 // 20 seconds timeout
    });
    
    if (!response.data || response.status !== 200) {
      throw new Error('Failed to fetch Instagram content');
    }
    
    // Parse the HTML
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Modern Instagram embeds the main data in a script with type="application/ld+json"
    const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
    let videoUrl = null;
    let thumbnailUrl = null;
    let username = null;
    let caption = null;
    
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse($(script).html() || '{}');
        
        // Check if this is the video content script
        if (data['@type'] === 'VideoObject' || data['@type'] === 'ImageObject') {
          videoUrl = data.contentUrl || data.url;
          thumbnailUrl = data.thumbnailUrl || data.image;
          username = data.author?.name || 'unknown_user';
          caption = data.description || '';
          break;
        }
      } catch (e) {
        console.error('Error parsing JSON-LD:', e);
      }
    }
    
    // If JSON-LD approach fails, try other methods
    if (!videoUrl) {
      // Try getting from special meta tags that Instagram uses
      videoUrl = $('meta[property="og:video"]').attr('content') || 
                 $('meta[property="og:video:secure_url"]').attr('content') ||
                 $('meta[property="og:video:url"]').attr('content');
                 
      thumbnailUrl = $('meta[property="og:image"]').attr('content') ||
                    $('meta[property="og:image:secure_url"]').attr('content');
      
      username = $('meta[property="og:title"]').attr('content')?.split(' on Instagram')[0] || 'unknown_user';
      caption = $('meta[property="og:description"]').attr('content') || '';
    }
    
    // Look for video elements directly
    if (!videoUrl) {
      // Look for all video elements and sources
      const videoElements = $('video');
      if (videoElements.length > 0) {
        // First try looking for video sources
        const sources = $('video source');
        if (sources.length > 0) {
          videoUrl = $(sources[0]).attr('src');
        }
        
        // If no sources found, try the video element itself
        if (!videoUrl) {
          videoUrl = $(videoElements[0]).attr('src');
        }
        
        // Also try data-src attribute which Instagram sometimes uses
        if (!videoUrl) {
          videoUrl = $(videoElements[0]).attr('data-src');
        }
      }
    }
    
    // Search for special Instagram embed patterns
    if (!videoUrl) {
      const embedPatterns = [
        /instgrm\.Embeds\.process\(\)/,
        /instagram-media/,
        /instagram\.com\/embed\.js/
      ];
      
      for (const pattern of embedPatterns) {
        if (pattern.test(html)) {
          // Try to use an alternative approach with JSON in the script tags
          const scripts = $('script:not([src])').toArray();
          for (const script of scripts) {
            const content = $(script).html() || '';
            
            // Check for JSON data patterns
            const jsonPatterns = [
              /"video_url":\s*"([^"]+)"/,
              /"playbackUrl":\s*"([^"]+)"/,
              /"playback_url":\s*"([^"]+)"/,
              /"contentUrl":\s*"([^"]+)"/
            ];
            
            for (const pattern of jsonPatterns) {
              const match = content.match(pattern);
              if (match && match[1]) {
                videoUrl = match[1].replace(/\\u0026/g, '&');
                break;
              }
            }
            
            if (videoUrl) break;
          }
        }
        
        if (videoUrl) break;
      }
    }
    
    // Last resort: Parse inline script blocks for media data
    if (!videoUrl) {
      const scriptDataPatterns = [
        /\\"video_url\\":\s*\\"([^\\]+)\\"/,
        /\\"video\\":\s*\{[^\}]*\\"src\\":\s*\\"([^\\]+)\\"/,
        /video_url"?:\s*"([^"]+)"/,
        /"playbackUrl":"([^"]+)"/,
        /"contentUrl":"([^"]+)"/,
        /"src":"(https:\/\/[^"]+\.mp4[^"]*)"/ 
      ];
      
      const allScripts = $('script:not([src])').toArray();
      for (const script of allScripts) {
        const content = $(script).html() || '';
        
        for (const pattern of scriptDataPatterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
            break;
          }
        }
        
        if (videoUrl) break;
      }
    }
    
    // Try to extract image if all video extraction failed
    if (!thumbnailUrl) {
      const imgSelectors = [
        'meta[property="og:image"]',
        'meta[property="og:image:secure_url"]',
        'img[class*="Sqi2_"]',
        'img[class*="_aagt"]',
        'img.FFVAD',
        'img[class*="EmbeddedMediaImage"]',
        'img[class*="tWeCl"]'
      ];
      
      for (const selector of imgSelectors) {
        const img = $(selector);
        if (img.length > 0) {
          thumbnailUrl = img.attr('content') || img.attr('src');
          if (thumbnailUrl) break;
        }
      }
    }
    
    // Extract the post ID from the URL
    const postIdMatch = url.match(/\/reel\/([^\/\?]+)/i);
    
    if (!videoUrl && !thumbnailUrl) {
      throw new Error('Could not find media URLs in Instagram content');
    }
    
    // Create post info object
    const postInfo: InstagramPostInfo = {
      reelId: postIdMatch?.[1] || 'unknown',
      username: username || 'unknown_user',
      caption: caption || '',
      mediaItems: []
    };
    
    // Add video
    if (videoUrl) {
      postInfo.mediaItems.push({
        type: 'video',
        url: videoUrl,
        thumbnailUrl: thumbnailUrl
      });
    } else if (thumbnailUrl) {
      postInfo.mediaItems.push({
        type: 'video',
        url: thumbnailUrl,
        thumbnailUrl: thumbnailUrl
      });
    }
    
    // Download all media items
    await downloadMediaItems(postInfo, outputDir);
    
    return postInfo;
  } catch (error) {
    console.error('Error in method 3:', error);
    throw error;
  }
}

/**
 * Fourth method to download Instagram media
 * This is an advanced method specifically for the latest Reel format
 */
export async function downloadInstagramMediaMethod4(
  url: string, 
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const { outputDir = path.join(process.cwd(), 'public') } = options;
  
  try {
    console.log('Attempting advanced method for Instagram Reel extraction');
    
    // First, we need to establish a proper session with Instagram
    // Instagram's anti-bot measures have become more sophisticated
    const initialSessionResponse = await axios.get('https://www.instagram.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 5
    });
    
    // Extract cookies from the initial session
    const cookies = initialSessionResponse.headers['set-cookie'] || [];
    const cookieJar: Record<string, string> = {};
    
    cookies.forEach(cookie => {
      const [keyValue] = cookie.split(';');
      const [key, value] = keyValue.split('=');
      cookieJar[key] = value;
    });
    
    // Format cookies for the next request
    const cookieString = Object.entries(cookieJar)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    // Now, make the actual request to the reel URL with these cookies
    // and Instagram-specific mobile headers that mimic the app
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'sec-ch-ua': '"Safari";v="17", "Chromium";v="125", "Not.A/Brand";v="8"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"iOS"',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Cookie': cookieString,
        'X-IG-App-ID': '936619743392459',
        'X-ASBD-ID': '129477',
        'X-IG-WWW-Claim': '0',
        'X-Requested-With': 'XMLHttpRequest'
      },
      maxRedirects: 5,
      timeout: 30000
    });
    
    if (!response.data) {
      throw new Error('Empty response from Instagram Reel URL');
    }
    
    // Parse the HTML with cheerio
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Modern approach for 2025: Extract video URL from embedded data
    // Instagram now often embeds video URL in script blocks with specific patterns
    
    // First, try the direct approach with meta tags
    let videoUrl = $('meta[property="og:video"]').attr('content');
    let thumbnailUrl = $('meta[property="og:image"]').attr('content');
    let username = $('meta[property="og:title"]').attr('content')?.split(' on Instagram')[0] || 'unknown_user';
    let caption = $('meta[property="og:description"]').attr('content') || '';
    
    if (!videoUrl) {
      // Search for the new data format in scripts
      // Instagram now embeds a lot of data in __APOLLO_STATE__ or similar objects
      const scriptTags = $('script').toArray();
      
      for (const script of scriptTags) {
        const content = $(script).html() || '';
        
        // Check for various data patterns in modern Instagram
        const patterns = [
          // The 2025 format often includes these patterns
          /\\"video_url\\":\s*\\"([^\\]+)\\"/,
          /"video_url":\s*"([^"]+)"/,
          /"playback_url":\s*"([^"]+)"/,
          /"video_versions":\s*\[\s*{\s*"type":\s*\d+,\s*"url":\s*"([^"]+)"/,
          /"is_unified_video":\s*true,[\s\S]*?"video_url":\s*"([^"]+)"/,
          /videoUrl["']?\s*:\s*["']([^"']+)["']/,
          /"src"\s*:\s*"(https:\/\/[^"]+\.mp4[^"]*)"/, 
          // For .mov videos
          /"src"\s*:\s*"(https:\/\/[^"]+\.mov[^"]*)"/ 
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
            console.log('Found video URL in script pattern:', pattern);
            break;
          }
        }
        
        // If we found a video URL, we can break out of the loop
        if (videoUrl) break;
        
        // Look for additional metadata in the scripts
        if (!username || username === 'unknown_user') {
          const usernamePatterns = [
            /"username":\s*"([^"]+)"/,
            /\\"username\\":\s*\\"([^\\]+)\\"/
          ];
          
          for (const pattern of usernamePatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              username = match[1];
              break;
            }
          }
        }
        
        if (!caption) {
          const captionPatterns = [
            /"caption":\s*"([^"]+)"/,
            /"edge_media_to_caption":\s*{\s*"edges":\s*\[\s*{\s*"node":\s*{\s*"text":\s*"([^"]+)"/,
            /\\"caption\\":\s*\\"([^\\]+)\\"/
          ];
          
          for (const pattern of captionPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              caption = match[1].replace(/\\n/g, '\n');
              break;
            }
          }
        }
      }
    }
    
    // Last resort: Try to extract from the HTML directly using more advanced patterns
    if (!videoUrl) {
      const htmlVideoPatterns = [
        // URL-encoded video patterns
        /(?:https?:\\\/\\\/[^"'\s]+\.mp4[^"'\s]*)/g,
        // Direct mp4 URLs
        /(?:https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g,
        // Escaped URL patterns
        /\\["'](?:https?:\\\/\\\/[^"'\s]+\.mp4[^"'\s]*)\\["']/g
      ];
      
      for (const pattern of htmlVideoPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          // Sometimes these patterns can match multiple URLs, so find the most suitable one
          // (usually the longest and the one with highest quality)
          let bestUrl = matches[0];
          for (const match of matches) {
            // Prefer URLs with higher quality indicators
            if (match.includes('high') || match.includes('1080') || match.length > bestUrl.length) {
              bestUrl = match;
            }
          }
          
          videoUrl = bestUrl.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
          console.log('Found video URL in HTML pattern:', pattern);
          break;
        }
      }
    }
    
    // New in 2025: Try the GraphQL API as a last resort
    if (!videoUrl) {
      try {
        // Extract the media shortcode from the URL
        const shortcodeMatch = url.match(/\/reel\/([^\/\?]+)/);
        if (shortcodeMatch && shortcodeMatch[1]) {
          const shortcode = shortcodeMatch[1];
          
          // Use the Instagram GraphQL API directly
          const graphqlResponse = await axios.get(`https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables={"shortcode":"${shortcode}"}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
              'X-IG-App-ID': '936619743392459',
              'X-Requested-With': 'XMLHttpRequest',
              'Cookie': cookieString
            }
          });
          
          if (graphqlResponse.data && graphqlResponse.data.data && graphqlResponse.data.data.shortcode_media) {
            const mediaData = graphqlResponse.data.data.shortcode_media;
            videoUrl = mediaData.video_url;
            thumbnailUrl = thumbnailUrl || mediaData.display_url;
            username = username !== 'unknown_user' ? username : (mediaData.owner?.username || 'unknown_user');
            caption = caption || mediaData.edge_media_to_caption?.edges?.[0]?.node?.text || '';
          }
        }
      } catch (e) {
        console.error('Error fetching from GraphQL API:', e);
      }
    }
    
    // As a final fallback, try a more direct approach with the OEmbed API
    if (!videoUrl) {
      try {
        const oembedResponse = await axios.get(`https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
          }
        });
        
        if (oembedResponse.data) {
          // We still don't have the video URL directly, but we have better metadata
          thumbnailUrl = oembedResponse.data.thumbnail_url;
          username = oembedResponse.data.author_name || username;
          
          // For oEmbed, if we have a thumbnail but no video, try one more approach
          if (thumbnailUrl && !videoUrl) {
            // Instagram thumbnails often follow a pattern, try to derive video URL
            // This is a bit of a hack, but sometimes works as a last resort
            videoUrl = thumbnailUrl.replace(/\/[^\/]+\.jpg/, '/video.mp4');
          }
        }
      } catch (e) {
        console.error('Error fetching from OEmbed API:', e);
      }
    }
    
    if (!videoUrl && !thumbnailUrl) {
      throw new Error('Could not find any media URLs in Instagram content after multiple attempts');
    }
    
    // Extract the reel ID from the URL
    const postIdMatch = url.match(/\/reel\/([^\/\?]+)/i);
    const reelId = postIdMatch?.[1] || 'unknown';
    
    // Create post info object
    const postInfo: InstagramPostInfo = {
      reelId,
      username,
      caption,
      mediaItems: []
    };
    
    // Add video or image
    if (videoUrl) {
      // Make sure the URL is properly formatted
      if (videoUrl.startsWith('//')) {
        videoUrl = `https:${videoUrl}`;
      } else if (videoUrl.startsWith('/')) {
        videoUrl = `https://www.instagram.com${videoUrl}`;
      }
      
      // Clean up any encoded characters
      videoUrl = videoUrl.replace(/\\u0026/g, '&')
                         .replace(/\\u003c/g, '<')
                         .replace(/\\u003e/g, '>')
                         .replace(/\\\//g, '/');
      
      postInfo.mediaItems.push({
        type: 'video',
        url: videoUrl,
        thumbnailUrl: thumbnailUrl
      });
    } else if (thumbnailUrl) {
      if (thumbnailUrl.startsWith('//')) {
        thumbnailUrl = `https:${thumbnailUrl}`;
      }
      
      postInfo.mediaItems.push({
        type: 'video',
        url: thumbnailUrl,
        thumbnailUrl: thumbnailUrl
      });
    }
    
    // Download all media items
    await downloadMediaItems(postInfo, outputDir);
    
    return postInfo;
  } catch (error) {
    console.error('Error in method 4:', error);
    throw error;
  }
}

/**
 * Main function to download Instagram media
 * This tries multiple methods in sequence
 */
export async function downloadInstagramMedia(
  url: string, 
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  // Validate the URL
  if (!isValidInstagramUrl(url)) {
    throw new Error('Invalid Instagram URL. Please provide a valid Instagram URL.');
  }
  
  // Normalize the URL to remove tracking parameters, etc.
  const normalizedUrl = normalizeInstagramUrl(url);
  
  // Determine if this is a Reel URL - if so, prioritize Method4 which is optimized for Reels
  const isReelUrl = normalizedUrl.includes('/reel/');
  
  if (isReelUrl) {
    try {
      // For Reels, try Method4 first as it's optimized for modern Reel formats
      console.log('Detected Reel URL, using optimized method...');
      return await downloadInstagramMediaMethod4(normalizedUrl, options);
    } catch (method4Error) {
      console.warn('Optimized Reel method failed, falling back to standard methods...', 
        method4Error instanceof Error ? method4Error.message : 'Unknown error');
    }
  }
  
  // Standard fallback sequence for all Instagram content
  try {
    // Try the first method
    return await downloadInstagramMediaMethod1(normalizedUrl, options);
  } catch (downloadError) {
    console.warn('First method failed, trying second method...', 
      downloadError instanceof Error ? downloadError.message : 'Unknown error');
    
    try {
      // Try the second method
      return await downloadInstagramMediaMethod2(normalizedUrl, options);
    } catch (secondError) {
      console.warn('Second method failed, trying third method...', 
        secondError instanceof Error ? secondError.message : 'Unknown error');
      
      try {
        // Try the third method
        return await downloadInstagramMediaMethod3(normalizedUrl, options);
      } catch (thirdError) {
        console.warn('Third method failed, trying fourth method...', 
          thirdError instanceof Error ? thirdError.message : 'Unknown error');
        
        try {
          // Only try Method4 again if we haven't already (for non-Reel content)
          if (!isReelUrl) {
            return await downloadInstagramMediaMethod4(normalizedUrl, options);
          } else {
            throw thirdError; // We already tried Method4 for Reels
          }
        } catch (fourthError) {
          // If all methods fail, throw a comprehensive error
          throw new Error(
            'All download methods failed. Instagram may have updated their website ' +
            'or the URL may be invalid. Please try again later. ' +
            'Error: ' + (fourthError instanceof Error ? fourthError.message : 'Unknown error')
          );
        }
      }
    }
  }
}
