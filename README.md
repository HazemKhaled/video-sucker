# Video Sucker Monorepo

A monorepo for video downloading applications, built with Next.js and PNPM workspaces.

## Repository Structure

```
video-sucker/
├── packages/                 # Shared packages
│   ├── tiktok-video-downloader/  # Standalone package for TikTok video downloading
│   │   ├── src/                  # Package source code
│   │   └── package.json          # Package configuration
├── public/                   # Public assets
│   └── tiktok/               # Downloaded TikTok videos and thumbnails
├── src/                      # Main Next.js application source
│   └── app/                  # App router pages and API routes
│       ├── api/              # API endpoints
│       │   └── tiktok/       # TikTok API endpoint
│       └── tiktok/           # TikTok video downloader page
└── package.json              # Main workspace configuration
```

## Packages

### tiktok-video-downloader

A standalone Node.js package for downloading TikTok videos with multiple fallback methods to ensure reliability. This package can be used independently in other projects.

#### Features:
- Extract video ID and username from TikTok URLs
- Download videos and thumbnails
- Multiple fallback methods for better reliability
- TypeScript support

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

1. Open the TikTok page at `/tiktok`
2. Enter a TikTok URL or click the example link
3. The video will be downloaded and displayed
4. You can download the video and thumbnail

## Features

- Download TikTok videos from URL
- View video in the browser
- Download video files
- Preview and download thumbnails
- Multiple fallback methods for reliable downloads
- Clean UI with responsive design

## Using the Package in Other Projects

```bash
# Install from the monorepo
npm install tiktok-video-downloader

# Or from GitHub
npm install github:username/video-sucker#packages/tiktok-video-downloader
```

```javascript
import { downloadTikTokVideo } from 'tiktok-video-downloader';

// Download a TikTok video
const result = await downloadTikTokVideo('https://www.tiktok.com/@username/video/1234567890', {
  outputDir: './downloads'
});

console.log('Video downloaded to:', result.video);
console.log('Thumbnail downloaded to:', result.thumbnail);
```

## Learn More

- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
