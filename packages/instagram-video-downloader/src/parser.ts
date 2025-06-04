import axios from "axios";
import * as cheerio from "cheerio";
import {
  ParsingResult,
  InstagramContentType,
  InstagramPostInfo,
  MediaItem,
} from "./types.js";

// Regex patterns for Instagram reel URL format
const REEL_PATTERN = /instagram\.com\/(?:reel|reels)\/([^\/\?#]+)/i;

/**
 * Determines the type of Instagram content from a URL
 * Will return 'reel' for valid URLs or 'unknown' for non-reel URLs
 */
export function getContentType(url: string): InstagramContentType {
  if (REEL_PATTERN.test(url)) return "reel";
  return "unknown";
}

/**
 * Extracts the reel ID from an Instagram reel URL
 */
export function extractReelId(url: string): string {
  // Match as a reel
  const reelMatch = url.match(REEL_PATTERN);
  if (reelMatch && reelMatch[1]) return reelMatch[1];

  throw new Error("Could not extract reel ID from Instagram URL");
}

/**
 * Extracts the username from an Instagram reel HTML content
 */
export function extractUsername(url: string, html?: string): string {
  // We only want to extract usernames from reel URLs
  if (!REEL_PATTERN.test(url)) {
    return "unknown_user";
  }

  // If HTML is provided, try to extract from it
  if (html) {
    const $ = cheerio.load(html);

    // Try multiple methods to find username
    const metaUsername = $('meta[property="og:title"]').attr("content");
    if (metaUsername) {
      const usernameMatch = metaUsername.match(/(.*) on Instagram/i);
      if (usernameMatch && usernameMatch[1]) return usernameMatch[1];
    }

    // Look for username in JSON data
    const scriptTags = $('script[type="application/ld+json"]').toArray();
    for (let i = 0; i < scriptTags.length; i++) {
      try {
        const jsonData = JSON.parse($(scriptTags[i]).html() || "{}");
        if (jsonData.author?.identifier?.value) {
          return jsonData.author.identifier.value;
        }
      } catch {
        // Skip if JSON parsing fails
      }
    }
  }

  // If all methods fail, return unknown
  return "unknown_user";
}

/**
 * Parses the HTML to extract media URLs and metadata
 */
export function parseHtml(html: string, url: string): ParsingResult {
  const $ = cheerio.load(html);
  const mediaItems: MediaItem[] = [];
  const contentType = getContentType(url);
  let caption = "";
  let likesCount: number | undefined;
  let commentsCount: number | undefined;

  try {
    // Try to extract caption
    caption = $('meta[property="og:description"]').attr("content") || "";

    // Extract video URLs - reels are always videos
    const videoUrl = $('meta[property="og:video"]').attr("content");
    const videoThumbnail = $('meta[property="og:image"]').attr("content");

    if (videoUrl) {
      mediaItems.push({
        type: "video",
        url: videoUrl,
        thumbnailUrl: videoThumbnail,
      });
    }

    // Check for additional metadata in embedded JSON data
    const scriptTags = $("script:not([src])")
      .toArray()
      .filter((elem) => {
        return $(elem).html()?.includes("window._sharedData =") || false;
      });

    if (scriptTags.length > 0) {
      const scriptContent = $(scriptTags[0]).html() || "";
      const dataMatch = scriptContent.match(/window\._sharedData = (.+);/);

      if (dataMatch && dataMatch[1]) {
        try {
          const jsonData = JSON.parse(dataMatch[1]);
          const mediaData =
            jsonData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;

          if (mediaData) {
            if (mediaData.edge_media_preview_like?.count) {
              likesCount = mediaData.edge_media_preview_like.count;
            }

            if (mediaData.edge_media_to_comment?.count) {
              commentsCount = mediaData.edge_media_to_comment.count;
            }
          }
        } catch (e) {
          console.error("Error parsing Instagram JSON data:", e);
        }
      }
    }
  } catch (e) {
    console.error("Error parsing Instagram HTML:", e);
  }

  const reelId = extractReelId(url);
  const username = extractUsername(url, html);

  const postInfo: InstagramPostInfo = {
    reelId,
    username,
    caption,
    likesCount,
    commentsCount,
    mediaItems,
  };

  return {
    contentType,
    postInfo,
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
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        Referer: "https://www.google.com/",
        "sec-ch-ua": '"Safari";v="17", "Chromium";v="125", "Not.A/Brand";v="8"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        DNT: "1",
      },
      timeout: 15000, // 15 seconds timeout for fetching Instagram content
    });

    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch Instagram URL, status code: ${response.status}`,
      );
    }

    return parseHtml(response.data, url);
  } catch (error) {
    console.error("Error fetching Instagram content:", error);

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
      const reelId = extractReelId(url);

      const postInfo: InstagramPostInfo = {
        reelId,
        username: response.data.author_name || "unknown_user",
        caption: response.data.title || "",
        mediaItems: [
          {
            type: "video",
            url: response.data.thumbnail_url || "",
            thumbnailUrl: response.data.thumbnail_url,
          },
        ],
      };

      return {
        contentType,
        postInfo,
      };
    }
  } catch (error) {
    console.error("Error in alternate parsing method:", error);
  }

  // If all methods fail, return a minimal result
  const contentType = getContentType(url);
  const reelId = extractReelId(url);

  return {
    contentType,
    postInfo: {
      reelId,
      username: "unknown_user",
      mediaItems: [],
    },
  };
}

// Keep backward compatibility with the old extractPostId function name
export const extractPostId = extractReelId;
