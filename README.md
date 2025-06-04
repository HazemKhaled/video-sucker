# Video Sucker Monorepo

A monorepo for video downloading applications, built with Next.js and PNPM workspaces.

## Repository Structure

```
video-sucker/
├── packages/                     # Shared packages
│   ├── tiktok-video-downloader/  # Standalone package for TikTok video downloading
│   │   ├── src/                  # Package source code
│   │   └── package.json          # Package configuration
│   └── instagram-video-downloader/ # Standalone package for Instagram video downloading
│       ├── src/                  # Package source code
│       └── package.json          # Package configuration
├── public/                       # Public assets
│   ├── tiktok/                   # Downloaded TikTok videos and thumbnails
│   │   └── {videoId}/            # Individual video directories
│   │       ├── video.mp4         # Downloaded video file
│   │       └── thumbnail.jpg     # Downloaded thumbnail
│   └── instagram/                # Downloaded Instagram reels and media
│       └── {reelId}/             # Individual reel directories
│           ├── video.mp4         # Downloaded video file
│           └── thumbnail.jpg     # Downloaded thumbnail
├── src/                          # Main Next.js application source
│   └── app/                      # App router pages and API routes
│       ├── api/                  # API endpoints
│       │   ├── tiktok/           # TikTok API endpoint
│       │   └── instagram/        # Instagram API endpoint
│       ├── tiktok/               # TikTok video downloader page
│       └── instagram/            # Instagram video downloader page
└── package.json                 # Main workspace configuration
```

## Packages

### tiktok-video-downloader

A standalone Node.js package for downloading TikTok videos with multiple fallback methods to ensure reliability. This package can be used independently in other projects.

#### Features:
- Extract video ID and username from TikTok URLs
- Download videos and thumbnails
- Multiple fallback methods for better reliability
- TypeScript support

### instagram-video-downloader

A standalone Node.js package for downloading Instagram reels with multiple extraction methods to handle Instagram's anti-bot measures. This package can be used independently in other projects.

#### Features:
- Extract reel ID and metadata from Instagram URLs
- Download videos and thumbnails
- 5 different extraction methods for maximum reliability
- Advanced anti-bot evasion techniques
- TypeScript support
- Organized file structure matching TikTok pattern

## Getting Started

### Prerequisites

- Node.js 16+
- PNPM

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm run build:packages
```

### Development

```bash
# Start the development server
pnpm run dev
```

Open [http://localhost:3000/tiktok](http://localhost:3000/tiktok) with your browser to see the TikTok downloader.
Open [http://localhost:3000/instagram](http://localhost:3000/instagram) with your browser to see the Instagram downloader.

### Build

```bash
# Build the entire project (packages + Next.js app)
pnpm run build
```

### Production

```bash
# Start the production server
pnpm run start
```

## Usage

### TikTok Downloader
1. Open the TikTok page at `/tiktok`
2. Enter a TikTok URL or click the example link
3. The video will be downloaded and displayed
4. You can download the video and thumbnail

### Instagram Downloader
1. Open the Instagram page at `/instagram`
2. Enter an Instagram reel URL
3. The reel will be downloaded and displayed
4. You can download the video and thumbnail

## Features

- Download TikTok videos from URL
- Download Instagram reels from URL
- View videos in the browser
- Download video files
- Preview and download thumbnails
- Multiple fallback methods for reliable downloads
- Advanced anti-bot evasion for Instagram
- Clean UI with responsive design
- Organized file structure: `public/{platform}/{id}/`

## Using the Package in Other Projects

```bash
# Install TikTok downloader
npm install tiktok-video-downloader

# Install Instagram downloader
npm install instagram-video-downloader

# Or from GitHub
npm install github:username/video-sucker#packages/tiktok-video-downloader
npm install github:username/video-sucker#packages/instagram-video-downloader
```

```javascript
// TikTok Example
import { downloadTikTokVideo } from 'tiktok-video-downloader';

const tikTokResult = await downloadTikTokVideo('https://www.tiktok.com/@username/video/1234567890', {
  outputDir: './downloads'
});

console.log('TikTok video downloaded to:', tikTokResult.video);
console.log('TikTok thumbnail downloaded to:', tikTokResult.thumbnail);

// Instagram Example
import { downloadInstagramMedia } from 'instagram-video-downloader';

const instagramResult = await downloadInstagramMedia('https://www.instagram.com/reel/ABC123/', {
  outputDir: './downloads'
});

console.log('Instagram reel downloaded:', instagramResult.savedFiles);
console.log('Reel by:', instagramResult.username);
```

## Learn More

- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
