import axios from "axios";
import * as cheerio from "cheerio";
import { InstagramPostInfo, DownloadOptions } from "../types.js";
import {
  downloadMediaItems,
  extractShortcode,
  getDefaultOutputDir,
  getFirefoxHeaders,
  createPostInfo,
  addMediaItem,
} from "./common.js";

/**
 * Third method to download Instagram media
 * This uses a web-based scraper as a last resort
 */
export async function downloadInstagramMediaMethod3(
  url: string,
  options: DownloadOptions = {},
): Promise<InstagramPostInfo> {
  const { outputDir = getDefaultOutputDir() } = options;

  try {
    console.log("Attempting method 3: Web scraper approach");

    // Use a different user agent and headers to mimic a different browser
    const response = await axios.get(url, {
      headers: getFirefoxHeaders(),
      maxRedirects: 5,
      timeout: 30000,
    });

    if (!response.data) {
      throw new Error("Empty response from Instagram URL");
    }

    const html = response.data;
    const $ = cheerio.load(html);

    // Initialize variables
    let videoUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    let username = "unknown_user";
    let caption = "";

    // Try to extract from meta tags first
    videoUrl =
      $('meta[property="og:video"]').attr("content") ||
      $('meta[property="og:video:url"]').attr("content") ||
      $('meta[property="og:video:secure_url"]').attr("content") ||
      null;

    thumbnailUrl =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[property="og:image:url"]').attr("content") ||
      $('meta[property="og:image:secure_url"]').attr("content") ||
      null;

    username =
      $('meta[property="og:title"]')
        .attr("content")
        ?.split(" on Instagram")[0] || "unknown_user";
    caption = $('meta[property="og:description"]').attr("content") || "";

    // If meta tags didn't work, try script tag extraction with cheerio
    if (!videoUrl) {
      $("script").each((_, script) => {
        const content = $(script).html() || "";

        // Look for various video URL patterns
        const patterns = [
          /"video_url":\s*"([^"]+)"/,
          /"playback_url":\s*"([^"]+)"/,
          /"src":\s*"(https:\/\/[^"]+\.mp4[^"]*)"/,
          /"contentUrl":\s*"([^"]+)"/,
          /video_url["']?\s*:\s*["']([^"']+)["']/,
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            videoUrl = match[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
            return false; // Break out of each loop
          }
        }
      });
    }

    // Try to extract additional metadata from scripts
    if (!thumbnailUrl || username === "unknown_user" || !caption) {
      $("script").each((_, script) => {
        const content = $(script).html() || "";

        // Look for thumbnail URL
        if (!thumbnailUrl) {
          const thumbnailPatterns = [
            /"display_url":\s*"([^"]+)"/,
            /"thumbnail_url":\s*"([^"]+)"/,
            /"image_versions2":\s*{\s*"candidates":\s*\[\s*{\s*"url":\s*"([^"]+)"/,
          ];

          for (const pattern of thumbnailPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              thumbnailUrl = match[1].replace(/\\\//g, "/");
              break;
            }
          }
        }

        // Look for username
        if (username === "unknown_user") {
          const usernamePatterns = [
            /"username":\s*"([^"]+)"/,
            /"owner":\s*{\s*"username":\s*"([^"]+)"/,
          ];

          for (const pattern of usernamePatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              username = match[1];
              break;
            }
          }
        }

        // Look for caption
        if (!caption) {
          const captionPatterns = [
            /"caption":\s*{\s*"text":\s*"([^"]+)"/,
            /"text":\s*"([^"]+)"/,
            /"edge_media_to_caption":\s*{\s*"edges":\s*\[\s*{\s*"node":\s*{\s*"text":\s*"([^"]+)"/,
          ];

          for (const pattern of captionPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              caption = match[1].replace(/\\n/g, "\n");
              break;
            }
          }
        }
      });
    }

    // Try to extract from HTML attributes and data attributes
    if (!videoUrl) {
      const videoElements = $('video, [data-video-url], [data-src*=".mp4"]');
      videoElements.each((_, element) => {
        const $el = $(element);
        videoUrl =
          $el.attr("src") ||
          $el.attr("data-src") ||
          $el.attr("data-video-url") ||
          $el.find("source").attr("src") ||
          null;

        if (videoUrl) {
          return false; // Break
        }
      });
    }

    // Try to extract thumbnail from img tags if not found
    if (!thumbnailUrl) {
      const imgSelectors = [
        'img[class*="FFVAD"]',
        'img[class*="_aagt"]',
        'img[class*="tWeCl"]',
        'img[class*="EmbeddedMediaImage"]',
        'img[alt*="Photo"]',
        'img[alt*="Video"]',
      ];

      for (const selector of imgSelectors) {
        const $img = $(selector).first();
        if ($img.length) {
          thumbnailUrl = $img.attr("src") || $img.attr("data-src") || null;
          if (thumbnailUrl) break;
        }
      }
    }

    // Last resort: try to find any mp4 URLs in the HTML
    if (!videoUrl) {
      const mp4Matches = html.match(/(https:\/\/[^"'\s]+\.mp4[^"'\s]*)/g);
      if (mp4Matches && mp4Matches.length > 0) {
        // Filter for Instagram CDN URLs
        const instagramMp4s = mp4Matches.filter(
          (url: string) =>
            url.includes("scontent") ||
            url.includes("cdninstagram") ||
            url.includes("fbcdn"),
        );

        if (instagramMp4s.length > 0) {
          videoUrl = instagramMp4s[0];
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
    console.error("Error in method 3:", error);
    throw error;
  }
}
