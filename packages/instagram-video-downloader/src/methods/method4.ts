import axios from 'axios';
import * as path from 'path';
import { InstagramPostInfo, DownloadOptions } from '../types.js';
import { downloadMediaItems, extractShortcode } from './common.js';

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
    const shortcode = extractShortcode(url);
    
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
