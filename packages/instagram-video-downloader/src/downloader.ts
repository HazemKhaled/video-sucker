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
 * This is an advanced method specifically for the latest Reel format using modern techniques
 */
export async function downloadInstagramMediaMethod4(
  url: string,
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const { outputDir = path.join(process.cwd(), 'public') } = options;

  try {
    console.log('Attempting advanced method for Instagram Reel extraction');

    // Extract shortcode from URL
    const shortcodeMatch = url.match(/\/reel\/([^\/\?]+)/);
    if (!shortcodeMatch || !shortcodeMatch[1]) {
      throw new Error('Could not extract shortcode from URL');
    }
    const shortcode = shortcodeMatch[1];

    // Try the Instagram embed endpoint first - this often works better
    try {
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
      const embedResponse = await axios.get(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.instagram.com/',
          'Connection': 'keep-alive',
        },
        timeout: 15000
      });

      if (embedResponse.status === 200 && embedResponse.data) {
        const embedHtml = embedResponse.data;

        // Look for video URL in embed page
        const videoPatterns = [
          /"video_url":"([^"]+)"/,
          /"src":"(https:\/\/[^"]+\.mp4[^"]*)"/,
          /video_url":\s*"([^"]+)"/,
          /"contentUrl":"([^"]+)"/
        ];

        let videoUrl = null;
        for (const pattern of videoPatterns) {
          const match = embedHtml.match(pattern);
          if (match && match[1]) {
            videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
            break;
          }
        }

        if (videoUrl) {
          console.log('Found video URL in embed page:', videoUrl);

          // Extract other metadata
          let thumbnailUrl = null;
          let username = 'unknown_user';
          let caption = '';

          const thumbnailMatch = embedHtml.match(/"display_url":"([^"]+)"/);
          if (thumbnailMatch) {
            thumbnailUrl = thumbnailMatch[1].replace(/\\\//g, '/');
          }

          const usernameMatch = embedHtml.match(/"username":"([^"]+)"/);
          if (usernameMatch) {
            username = usernameMatch[1];
          }

          const captionMatch = embedHtml.match(/"caption":"([^"]+)"/);
          if (captionMatch) {
            caption = captionMatch[1];
          }

          const postInfo: InstagramPostInfo = {
            reelId: shortcode,
            username,
            caption,
            mediaItems: [{
              type: 'video',
              url: videoUrl,
              thumbnailUrl: thumbnailUrl
            }]
          };

          await downloadMediaItems(postInfo, outputDir);
          return postInfo;
        }
      }
    } catch (embedError) {
      console.log('Embed method failed, trying alternative approach:', embedError instanceof Error ? embedError.message : 'Unknown error');
    }

    // Try the oEmbed API as a fallback
    try {
      const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
      const oembedResponse = await axios.get(oembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000
      });

      if (oembedResponse.status === 200 && oembedResponse.data) {
        const oembedData = oembedResponse.data;

        // oEmbed gives us basic metadata, but we need to extract video URL from the HTML
        if (oembedData.html) {
          const videoUrlMatch = oembedData.html.match(/src="([^"]+)"/);
          if (videoUrlMatch && videoUrlMatch[1]) {
            // This is usually an iframe src, we need to fetch it to get the actual video
            try {
              const iframeResponse = await axios.get(videoUrlMatch[1], {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
                  'Referer': 'https://www.instagram.com/',
                },
                timeout: 10000
              });

              if (iframeResponse.status === 200) {
                const iframeHtml = iframeResponse.data;

                // Look for video URL in iframe content
                const videoPatterns = [
                  /"video_url":"([^"]+)"/,
                  /"src":"(https:\/\/[^"]+\.mp4[^"]*)"/,
                  /video_url":\s*"([^"]+)"/,
                  /"contentUrl":"([^"]+)"/,
                  /"playback_url":"([^"]+)"/
                ];

                let videoUrl = null;
                for (const pattern of videoPatterns) {
                  const match = iframeHtml.match(pattern);
                  if (match && match[1]) {
                    videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
                    break;
                  }
                }

                if (videoUrl) {
                  console.log('Found video URL via oEmbed iframe:', videoUrl);

                  const postInfo: InstagramPostInfo = {
                    reelId: shortcode,
                    username: oembedData.author_name || 'unknown_user',
                    caption: oembedData.title || '',
                    mediaItems: [{
                      type: 'video',
                      url: videoUrl,
                      thumbnailUrl: oembedData.thumbnail_url
                    }]
                  };

                  await downloadMediaItems(postInfo, outputDir);
                  return postInfo;
                }
              }
            } catch (iframeError) {
              console.log('Failed to fetch iframe content:', iframeError instanceof Error ? iframeError.message : 'Unknown error');
            }
          }
        }
      }
    } catch (oembedError) {
      console.log('oEmbed method failed:', oembedError instanceof Error ? oembedError.message : 'Unknown error');
    }

    // If all methods fail, throw an error
    throw new Error('Could not extract video URL using any available method. Instagram may have updated their anti-bot measures.');
  } catch (error) {
    console.error('Error in method 4:', error);
    throw error;
  }
}

/**
 * Fifth method to download Instagram media
 * This method uses a different approach with session management and modern headers
 */
export async function downloadInstagramMediaMethod5(
  url: string,
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const { outputDir = path.join(process.cwd(), 'public') } = options;

  try {
    console.log('Attempting method 5 with session management');

    // Extract shortcode from URL
    const shortcodeMatch = url.match(/\/reel\/([^\/\?]+)/);
    if (!shortcodeMatch || !shortcodeMatch[1]) {
      throw new Error('Could not extract shortcode from URL');
    }
    const shortcode = shortcodeMatch[1];

    // First establish a session with Instagram
    const sessionResponse = await axios.get('https://www.instagram.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 15000
    });

    // Extract cookies from session
    const cookies = sessionResponse.headers['set-cookie'] || [];
    const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');

    // Now try to access the reel with the session
    const reelResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Referer': 'https://www.instagram.com/',
        'Cookie': cookieString,
        'Cache-Control': 'max-age=0'
      },
      timeout: 20000
    });

    if (reelResponse.status !== 200 || !reelResponse.data) {
      throw new Error('Failed to fetch reel content');
    }

    const html = reelResponse.data;

    // Try to extract video URL using multiple patterns
    const videoPatterns = [
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

    let videoUrl = null;
    let allMatches: string[] = [];

    for (const pattern of videoPatterns) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const cleanUrl = match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
          allMatches.push(cleanUrl);
        }
      }
    }

    // Filter and select the best video URL
    const validVideoUrls = allMatches.filter(url =>
      url.includes('.mp4') &&
      (url.includes('scontent') || url.includes('cdninstagram') || url.includes('fbcdn'))
    );

    if (validVideoUrls.length > 0) {
      // Prefer higher quality URLs (usually longer URLs with more parameters)
      videoUrl = validVideoUrls.sort((a, b) => b.length - a.length)[0];
      console.log('Found video URL:', videoUrl);
    }

    // Extract metadata
    let thumbnailUrl = null;
    let username = 'unknown_user';
    let caption = '';

    // Extract thumbnail
    const thumbnailPatterns = [
      /"display_url":"([^"]+)"/,
      /"thumbnail_url":"([^"]+)"/,
      /property="og:image"\s+content="([^"]+)"/
    ];

    for (const pattern of thumbnailPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        thumbnailUrl = match[1].replace(/\\\//g, '/');
        break;
      }
    }

    // Extract username
    const usernamePatterns = [
      /"username":"([^"]+)"/,
      /"owner":\s*{\s*"username":"([^"]+)"/,
      /property="og:title"\s+content="([^"•]+)/
    ];

    for (const pattern of usernamePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        username = match[1].trim();
        break;
      }
    }

    // Extract caption
    const captionPatterns = [
      /"caption":"([^"]+)"/,
      /"text":"([^"]+)"/,
      /property="og:description"\s+content="([^"]+)"/
    ];

    for (const pattern of captionPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        caption = match[1];
        break;
      }
    }

    if (!videoUrl && !thumbnailUrl) {
      throw new Error('Could not find any media URLs in the content');
    }

    const postInfo: InstagramPostInfo = {
      reelId: shortcode,
      username,
      caption,
      mediaItems: [{
        type: 'video',
        url: videoUrl || thumbnailUrl || '',
        thumbnailUrl: thumbnailUrl
      }]
    };

    await downloadMediaItems(postInfo, outputDir);
    return postInfo;
  } catch (error) {
    console.error('Error in method 5:', error);
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
            // For Reels, try Method5 as a final attempt
            return await downloadInstagramMediaMethod5(normalizedUrl, options);
          }
        } catch (fourthError) {
          console.warn('Fourth method failed, trying fifth method...',
            fourthError instanceof Error ? fourthError.message : 'Unknown error');

          try {
            // Try Method5 as the final fallback
            return await downloadInstagramMediaMethod5(normalizedUrl, options);
          } catch (fifthError) {
            // If all methods fail, provide helpful error message with guidance
            const errorMessage = isReelUrl
              ? 'Instagram Reel download failed. Instagram has implemented strong anti-bot measures that prevent automated downloads. ' +
                'This may be due to:\n' +
                '• Instagram requiring user login\n' +
                '• Rate limiting or IP blocking\n' +
                '• Geographic restrictions\n' +
                '• The content being private or deleted\n' +
                '• Recent changes to Instagram\'s security measures\n\n' +
                'Suggestions:\n' +
                '• Try again later (rate limits may reset)\n' +
                '• Use a different network/IP address\n' +
                '• Check if the content is publicly accessible\n' +
                '• Consider using Instagram\'s official tools or browser-based solutions'
              : 'Instagram post download failed. All available methods have been exhausted. ' +
                'This may be due to Instagram\'s anti-bot measures or the content being private/unavailable.\n\n' +
                'Suggestions:\n' +
                '• Verify the URL is correct and publicly accessible\n' +
                '• Try again later\n' +
                '• Check if the content requires login to view';

            throw new Error(errorMessage + '\n\nTechnical details: ' +
              (fifthError instanceof Error ? fifthError.message : 'Unknown error'));
          }
        }
      }
    }
  }
}
