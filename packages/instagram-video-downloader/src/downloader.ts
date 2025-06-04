import { DownloadOptions, InstagramPostInfo } from './types.js';
import { normalizeInstagramUrl } from './url-utils.js';
import {
  downloadInstagramMediaMethod1,
  downloadInstagramMediaMethod2,
  downloadInstagramMediaMethod3,
  downloadInstagramMediaMethod4,
  downloadInstagramMediaMethod5
} from './methods/index.js';

// Re-export the individual methods for backward compatibility
export {
  downloadInstagramMediaMethod1,
  downloadInstagramMediaMethod2,
  downloadInstagramMediaMethod3,
  downloadInstagramMediaMethod4,
  downloadInstagramMediaMethod5
} from './methods/index.js';

/**
 * Main function to download Instagram media with multiple fallback methods
 */
export async function downloadInstagramMedia(
  url: string,
  options: DownloadOptions = {}
): Promise<InstagramPostInfo> {
  const normalizedUrl = normalizeInstagramUrl(url);
  console.log(`Attempting to download Instagram media from: ${normalizedUrl}`);

  // Check if it's a Reel URL to prioritize appropriate methods
  const isReelUrl = normalizedUrl.includes('/reel/');

  try {
    // For Reels, start with the newer methods that are more likely to work
    if (isReelUrl) {
      console.log('Detected Reel URL, using optimized methods...');
      return await downloadInstagramMediaMethod5(normalizedUrl, options);
    } else {
      // For regular posts, try Method 1 first
      return await downloadInstagramMediaMethod1(normalizedUrl, options);
    }
  } catch (firstError) {
    console.warn('First method failed, trying alternative methods...',
      firstError instanceof Error ? firstError.message : 'Unknown error');

    try {
      // Try Method 4 (embed approach)
      return await downloadInstagramMediaMethod4(normalizedUrl, options);
    } catch (secondError) {
      console.warn('Embed method failed, trying enhanced method...',
        secondError instanceof Error ? secondError.message : 'Unknown error');

      try {
        // Try Method 2 (enhanced approach)
        return await downloadInstagramMediaMethod2(normalizedUrl, options);
      } catch (thirdError) {
        console.warn('Enhanced method failed, trying alternative approach...',
          thirdError instanceof Error ? thirdError.message : 'Unknown error');

        try {
          // Try Method 3 (alternative approach)
          return await downloadInstagramMediaMethod3(normalizedUrl, options);
        } catch (fourthError) {
          console.warn('Alternative method failed, trying session-based method...',
            fourthError instanceof Error ? fourthError.message : 'Unknown error');

          try {
            // Try Method5 as the final fallback if not already tried
            if (!isReelUrl) {
              return await downloadInstagramMediaMethod5(normalizedUrl, options);
            } else {
              throw fourthError; // Re-throw the last error for Reels since we already tried Method5
            }
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