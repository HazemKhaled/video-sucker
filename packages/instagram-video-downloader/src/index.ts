// Export the main functions and types from the package
export { downloadInstagramMedia } from './downloader.js';
export { 
  downloadInstagramMediaMethod1,
  downloadInstagramMediaMethod2,
  downloadInstagramMediaMethod3,
  downloadInstagramMediaMethod4
} from './downloader.js';
export { parseInstagramUrl, getContentType, extractPostId } from './parser.js';
export { normalizeInstagramUrl, isValidInstagramUrl, getContentIdFromPath } from './url-utils.js';

// Export types
export type {
  DownloadOptions,
  MediaItem,
  InstagramPostInfo,
  InstagramContentType,
  ParsingResult
} from './types.js';
