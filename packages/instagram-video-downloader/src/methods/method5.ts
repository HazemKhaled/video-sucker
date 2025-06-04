import axios from "axios";
import { InstagramPostInfo, DownloadOptions } from "../types.js";
import {
  downloadMediaItems,
  extractShortcode,
  getDefaultOutputDir,
  VIDEO_PATTERNS,
  cleanVideoUrl,
  filterValidVideoUrls,
  createPostInfo,
  addMediaItem,
} from "./common.js";

/**
 * Fifth method to download Instagram media
 * This method uses a different approach with session management and modern headers
 */
export async function downloadInstagramMediaMethod5(
  url: string,
  options: DownloadOptions = {},
): Promise<InstagramPostInfo> {
  const { outputDir = getDefaultOutputDir() } = options;

  try {
    console.log("Attempting method 5 with session management");

    // Extract shortcode from URL
    const shortcode = extractShortcode(url);

    // First establish a session with Instagram
    const sessionResponse = await axios.get("https://www.instagram.com/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
      timeout: 15000,
    });

    // Extract cookies from session
    const cookies = sessionResponse.headers["set-cookie"] || [];
    const cookieString = cookies
      .map((cookie) => cookie.split(";")[0])
      .join("; ");

    // Now try to access the reel with the session
    const reelResponse = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        Referer: "https://www.instagram.com/",
        Cookie: cookieString,
        "Cache-Control": "max-age=0",
      },
      timeout: 20000,
    });

    if (reelResponse.status !== 200 || !reelResponse.data) {
      throw new Error("Failed to fetch reel content");
    }

    const html = reelResponse.data;

    // Try to extract video URL using multiple patterns
    let videoUrl = null;
    const allMatches: string[] = [];

    for (const pattern of VIDEO_PATTERNS) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const cleanUrl = cleanVideoUrl(match[1]);
          allMatches.push(cleanUrl);
        }
      }
    }

    // Filter and select the best video URL
    const validVideoUrls = filterValidVideoUrls(allMatches);

    if (validVideoUrls.length > 0) {
      // Prefer higher quality URLs (usually longer URLs with more parameters)
      videoUrl = validVideoUrls.sort((a, b) => b.length - a.length)[0];
      console.log("Found video URL:", videoUrl);
    }

    // Extract metadata
    let thumbnailUrl = null;
    let username = "unknown_user";
    let caption = "";

    // Extract thumbnail
    const thumbnailPatterns = [
      /"display_url":"([^"]+)"/,
      /"thumbnail_url":"([^"]+)"/,
      /property="og:image"\s+content="([^"]+)"/,
    ];

    for (const pattern of thumbnailPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        thumbnailUrl = match[1].replace(/\\\//g, "/");
        break;
      }
    }

    // Extract username
    const usernamePatterns = [
      /"username":"([^"]+)"/,
      /"owner":\s*{\s*"username":"([^"]+)"/,
      /property="og:title"\s+content="([^"•]+)/,
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
      /property="og:description"\s+content="([^"]+)"/,
    ];

    for (const pattern of captionPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        caption = match[1];
        break;
      }
    }

    if (!videoUrl && !thumbnailUrl) {
      throw new Error("Could not find any media URLs in the content");
    }

    const postInfo = createPostInfo(shortcode, username, caption);
    addMediaItem(
      postInfo,
      "video",
      videoUrl || thumbnailUrl || "",
      thumbnailUrl,
    );

    await downloadMediaItems(postInfo, outputDir);
    return postInfo;
  } catch (error) {
    console.error("Error in method 5:", error);
    throw error;
  }
}
