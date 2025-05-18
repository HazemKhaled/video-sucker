# Instagram Video Downloader

A powerful and flexible utility for downloading Instagram reels. This package provides multiple methods for downloading Instagram content and includes fallback options to handle anti-scraping measures.

## Features

- Download reels
- Extract metadata including username, caption, likes, and comments count
- Handle multi-media carousel posts
- Multiple fallback methods for increased reliability
- Advanced techniques to bypass Instagram's protection mechanisms
- TypeScript support with comprehensive types
- Save videos, images, and thumbnails
- Built-in error handling

## Installation

```bash
npm install instagram-video-downloader
# or
yarn add instagram-video-downloader
# or
pnpm add instagram-video-downloader
```

## Usage

```typescript
import { downloadInstagramMedia } from 'instagram-video-downloader';

async function downloadContent() {
  try {
    const result = await downloadInstagramMedia('https://www.instagram.com/p/EXAMPLE_POST_ID/', {
      outputDir: './downloads'
    });
    
    console.log('Download successful!');
    console.log('Username:', result.username);
    console.log('Caption:', result.caption);
    console.log('Media items:', result.mediaItems.length);
    
    // Access saved file paths
    if (result.savedFiles) {
      result.savedFiles.forEach((file, index) => {
        console.log(`Media ${index + 1}:`, file.mediaPath);
        if (file.thumbnailPath) {
          console.log(`Thumbnail ${index + 1}:`, file.thumbnailPath);
        }
      });
    }
  } catch (error) {
    console.error('Error downloading Instagram content:', error);
  }
}

downloadContent();
```

## Instagram Reels Support

Instagram frequently updates their platform to make it more difficult to extract video content. This package includes advanced techniques to handle these changes, particularly for Instagram Reels which use different embedding methods than regular posts.

Our latest update (Method 4) provides:
- Session-based authentication to bypass basic anti-bot measures
- Advanced meta tag and script pattern extraction
- Multiple fallback mechanisms
- Support for Instagram's latest changes to how they serve video content
- GraphQL API querying for direct content access
- OEmbed API integration

This makes the package more robust against Instagram's frequent updates to their content protection mechanisms.

## API Reference

### `downloadInstagramMedia(url, options)`

Main function to download Instagram media. Tries multiple methods in sequence.

#### Parameters

- `url` (string): Instagram URL to download from
- `options` (object, optional): Options for downloading
  - `outputDir` (string, optional): Output directory (default: './public')
  - `fileName` (string, optional): Custom file name
  - `saveMetadata` (boolean, optional): Whether to save metadata (default: true)
  - `userAgent` (string, optional): Custom user agent

#### Returns

Promise resolving to an `InstagramPostInfo` object containing:

- `postId` (string): Instagram post ID
- `username` (string): Instagram username
- `caption` (string): Post caption
- `timestamp` (string, optional): Post timestamp
- `isCarousel` (boolean): Whether the post is a carousel
- `likesCount` (number, optional): Number of likes
- `commentsCount` (number, optional): Number of comments
- `mediaItems` (array): Array of media items
- `savedFiles` (array, optional): Array of saved file paths

### Additional Functions

- `downloadInstagramMediaMethod1(url, options)`: Primary method using direct extraction
- `downloadInstagramMediaMethod2(url, options)`: Secondary method using an API service
- `downloadInstagramMediaMethod3(url, options)`: Tertiary method using a web scraper
- `downloadInstagramMediaMethod4(url, options)`: Advanced method with multi-layered extraction strategies, optimized for modern Instagram Reels
- `parseInstagramUrl(url)`: Parses an Instagram URL to extract content information
- `getContentType(url)`: Determines the type of Instagram content from a URL
- `extractPostId(url)`: Extracts the post ID from an Instagram URL

## License

MIT
