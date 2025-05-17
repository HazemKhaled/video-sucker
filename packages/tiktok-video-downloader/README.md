# TikTok Video Downloader

A Node.js package to download TikTok videos and thumbnails.

## Installation

```bash
npm install tiktok-video-downloader
# or
yarn add tiktok-video-downloader
# or
pnpm add tiktok-video-downloader
```

## Usage

```typescript
import { downloadTikTokVideo } from 'tiktok-video-downloader';

// Define download options
const options = {
  outputDir: './downloads' // Directory where videos will be saved
};

// Download a TikTok video
async function downloadVideo() {
  try {
    const result = await downloadTikTokVideo('https://www.tiktok.com/@username/video/1234567890', options);
    
    console.log('Video downloaded successfully!');
    console.log('Video path:', result.video);
    console.log('Thumbnail path:', result.thumbnail);
    console.log('Username:', result.username);
    console.log('Description:', result.description);
  } catch (error) {
    console.error('Error downloading video:', error);
  }
}

downloadVideo();
```

## API

### `downloadTikTokVideo(url, options)`

Downloads a TikTok video from the given URL.

#### Parameters

- `url` (string): The TikTok video URL
- `options` (object, optional):
  - `outputDir` (string): The directory where videos will be saved (default: `./tiktok`)
  - `customFilename` (string, optional): Custom filename for the downloaded video

#### Returns

Promise that resolves to an object with the following properties:

- `video` (string): Path to the downloaded video file
- `thumbnail` (string): Path to the downloaded thumbnail file
- `username` (string): TikTok username of the video creator
- `description` (string): Video description/title
- `downloadUrl` (string): Path to the downloaded video file
- `videoId` (string): TikTok video ID

### `extractTikTokInfo(url)`

Extracts the video ID and username from a TikTok URL.

#### Parameters

- `url` (string): The TikTok video URL

#### Returns

An object with:
- `videoId` (string): The TikTok video ID
- `username` (string): The TikTok username

## License

MIT
