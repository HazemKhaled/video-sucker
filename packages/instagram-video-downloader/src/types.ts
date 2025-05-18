// Types for Instagram video downloader

export interface DownloadOptions {
  outputDir?: string;
  fileName?: string;
  saveMetadata?: boolean;
  userAgent?: string;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
}

export interface InstagramPostInfo {
  postId: string;
  username: string;
  caption?: string;
  timestamp?: string;
  isCarousel: boolean;
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
