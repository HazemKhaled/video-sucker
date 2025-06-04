import axios from "axios";
import { InstagramPostInfo, DownloadOptions } from "../types.js";
import {
  downloadMediaItems,
  extractShortcode,
  getDefaultOutputDir,
  getDesktopHeaders,
  createPostInfo,
  addMediaItem,
} from "./common.js";

/**
 * Second method to download Instagram media
 * This uses an alternative approach as a fallback
 */
export async function downloadInstagramMediaMethod2(
  url: string,
  options: DownloadOptions = {},
): Promise<InstagramPostInfo> {
  const { outputDir = getDefaultOutputDir() } = options;

  try {
    console.log("Attempting method 2: Alternative extraction");

    // Use a different approach with a modern desktop browser user agent and additional headers
    const response = await axios.get(url, {
      headers: getDesktopHeaders(),
      maxRedirects: 5,
      timeout: 30000,
    });

    if (!response.data) {
      throw new Error("Empty response from Instagram URL");
    }

    const html = response.data;

    // Initialize variables
    let videoUrl = null;
    let thumbnailUrl = null;
    let username = "unknown_user";
    let caption = "";

    // Try to extract from script tags with different patterns
    const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];

    for (const script of scriptMatches) {
      // Look for JSON data in scripts
      const jsonMatches =
        script.match(/(\{[^{}]*"video_url"[^{}]*\})/g) ||
        script.match(/(\{[^{}]*"playback_url"[^{}]*\})/g) ||
        script.match(/(\{[^{}]*"video_versions"[^{}]*\})/g);

      if (jsonMatches) {
        for (const jsonMatch of jsonMatches) {
          try {
            const data = JSON.parse(jsonMatch);
            if (data.video_url) {
              videoUrl = data.video_url;
              thumbnailUrl = data.display_url || thumbnailUrl;
              username =
                data.owner?.username || data.user?.username || username;
              caption = data.caption?.text || caption;
              break;
            }
            if (data.video_versions && data.video_versions.length > 0) {
              videoUrl = data.video_versions[0].url;
              thumbnailUrl =
                data.image_versions2?.candidates?.[0]?.url || thumbnailUrl;
              username =
                data.owner?.username || data.user?.username || username;
              caption = data.caption?.text || caption;
              break;
            }
          } catch {
            // Continue to next match
          }
        }
        if (videoUrl) break;
      }
    }

    // If no video URL found, try regex patterns on the entire HTML
    if (!videoUrl) {
      const videoPatterns = [
        /"video_url":\s*"([^"]+)"/,
        /"playback_url":\s*"([^"]+)"/,
        /"src":\s*"(https:\/\/[^"]+\.mp4[^"]*)"/,
        /video_url["']?\s*:\s*["']([^"']+)["']/,
        /"contentUrl":\s*"([^"]+)"/,
      ];

      for (const pattern of videoPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          videoUrl = match[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
          break;
        }
      }
    }

    // Search for special Instagram embed patterns
    if (!videoUrl) {
      const embedPatterns = [
        /instgrm\.Embeds\.process\(\)/,
        /instagram-media/,
        /instagram\.com\/embed\.js/,
      ];

      let hasEmbedPattern = false;
      for (const pattern of embedPatterns) {
        if (pattern.test(html)) {
          hasEmbedPattern = true;
          break;
        }
      }

      if (hasEmbedPattern) {
        // Try to extract from embed-specific patterns
        const embedVideoMatch = html.match(/data-video-url="([^"]+)"/);
        if (embedVideoMatch) {
          videoUrl = embedVideoMatch[1];
        }
      }
    }

    // Extract metadata
    if (!thumbnailUrl) {
      const thumbnailPatterns = [
        /property="og:image"\s+content="([^"]+)"/,
        /name="twitter:image"\s+content="([^"]+)"/,
        /"display_url":\s*"([^"]+)"/,
        /"thumbnail_url":\s*"([^"]+)"/,
      ];

      for (const pattern of thumbnailPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          thumbnailUrl = match[1].replace(/\\\//g, "/");
          break;
        }
      }
    }

    if (username === "unknown_user") {
      const usernamePatterns = [
        /property="og:title"\s+content="([^"•]+)/,
        /"username":\s*"([^"]+)"/,
        /"owner":\s*{\s*"username":\s*"([^"]+)"/,
      ];

      for (const pattern of usernamePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          username = match[1].trim();
          break;
        }
      }
    }

    if (!caption) {
      const captionPatterns = [
        /property="og:description"\s+content="([^"]+)"/,
        /"caption":\s*{\s*"text":\s*"([^"]+)"/,
        /"text":\s*"([^"]+)"/,
      ];

      for (const pattern of captionPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          caption = match[1];
          break;
        }
      }
    }

    // Try to get thumbnail from image selectors if still not found
    if (!thumbnailUrl) {
      const imageSelectors = [
        'meta[property="og:image"]',
        'meta[property="og:image:secure_url"]',
        'img[class*="Sqi2_"]',
        'img[class*="_aagt"]',
        "img.FFVAD",
        'img[class*="EmbeddedMediaImage"]',
        'img[class*="tWeCl"]',
      ];

      // Since we're working with HTML string, we'll use regex to find these
      for (const selector of imageSelectors) {
        let pattern;
        if (selector.includes("meta")) {
          pattern = new RegExp(
            `<meta[^>]*property="${selector.match(/property="([^"]+)"/)?.[1]}"[^>]*content="([^"]+)"`,
            "i",
          );
        } else {
          const className = selector.match(/class[*=]*"([^"]+)"/)?.[1];
          if (className) {
            pattern = new RegExp(
              `<img[^>]*class="[^"]*${className}[^"]*"[^>]*src="([^"]+)"`,
              "i",
            );
          }
        }

        if (pattern) {
          const match = html.match(pattern);
          if (match && (match[2] || match[1])) {
            thumbnailUrl = match[2] || match[1];
            break;
          }
        }
      }
    }

    if (!videoUrl && !thumbnailUrl) {
      throw new Error("Could not find media URLs in Instagram content");
    }

    // Extract the post ID from the URL
    const shortcode = extractShortcode(url);

    // Create post info object
    const postInfo = createPostInfo(shortcode, username, caption);

    // Add video or image
    if (videoUrl) {
      addMediaItem(postInfo, "video", videoUrl, thumbnailUrl);
    } else if (thumbnailUrl) {
      addMediaItem(postInfo, "image", thumbnailUrl, thumbnailUrl);
    }

    // Download all media items
    await downloadMediaItems(postInfo, outputDir);

    return postInfo;
  } catch (error) {
    console.error("Error in method 2:", error);
    throw error;
  }
}
