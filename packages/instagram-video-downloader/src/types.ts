// Types for Instagram video downloader

export interface DownloadOptions {
  outputDir?: string;
  userAgent?: string;
}

export interface MediaItem {
  type: 'video' | 'image';  // Instagram can have videos or images
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
}

export interface InstagramPostInfo {
  reelId: string;     // Renamed from postId to reelId
  username: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  mediaItems: MediaItem[];
  savedFiles?: {
    mediaPath: string;
    thumbnailPath?: string;
  }[];
}

export type InstagramContentType = 'reel' | 'unknown';

export interface ParsingResult {
  contentType: InstagramContentType;
  postInfo: InstagramPostInfo;
}
