---
mode: "agent"
---

# Instagram Video Downloader Implementation Guide

## Objective

Create a comprehensive Instagram video downloader with a polished user interface that enables users to paste Instagram post links, preview videos directly in the browser, and download them for offline viewing. Support for reels, posts, and stories should be included.

## Architecture Requirements

1. Maintain the existing monorepo structure using PNPM workspaces
2. Create a standalone package `instagram-video-downloader` that can be published to npm
3. Build a Next.js page to showcase the Instagram downloader functionality
4. Ensure the package can be used independently of the frontend

## Package Implementation (`instagram-video-downloader`)

1. Create a new package in the `packages/` directory with the following files:

   - `package.json` - Configure as ESM module with proper dependencies
   - `tsconfig.json` - Set up TypeScript configuration for the package
   - `src/downloader.ts` - Implement multiple methods for video download with fallbacks
   - `src/parser.ts` - Extract metadata and media URLs from Instagram posts
   - `src/index.ts` - Export the public API
   - `README.md` - Document usage and installation instructions

2. Core functionality should include:
   - Parsing different types of Instagram URLs (posts, reels, stories)
   - Extracting video IDs, media URLs, and post metadata
   - Multiple approaches to bypass Instagram's download restrictions
   - Saving video, image, and thumbnail files to a specified location
   - Handling multi-media posts (carousels with multiple images/videos)
   - Comprehensive error handling with descriptive messages
   - TypeScript interfaces for all inputs and outputs

## Next.js Frontend Implementation

1. Create a new route at `/instagram` with a modern, Instagram-inspired UI
2. Implement the following features:

   - Clean input field for Instagram URLs with instant validation
   - Submit button with Instagram-themed loading state
   - Informative error handling with user-friendly messages
   - Video player with playback controls for previewing content
   - Media carousel for posts with multiple items
   - Thumbnail gallery with preview functionality
   - Metadata display (username, caption, likes, comments count if available)
   - Download buttons for video, images, and thumbnails
   - Example Instagram links for different content types (post, reel, story)

3. API Implementation:
   - Create a new API route at `/api/instagram`
   - Accept POST requests with Instagram URLs
   - Use the `instagram-video-downloader` package to process the media
   - Return media paths, thumbnail paths, and comprehensive metadata
   - Support batch processing for carousel posts
   - Handle rate limiting and errors gracefully with descriptive messages

## Styling and User Experience

1. Implement responsive design with Instagram-inspired aesthetics
2. Add elegant loading animations and smooth transitions
3. Provide clear visual feedback on success, progress, and error states
4. Include helpful instructions with visual examples
5. Create CSS modules for component styling with Instagram-like color palette
6. Ensure accessibility compliance for all interactive elements

## Build and Deployment

1. Update build scripts to include the new package
2. Ensure proper dependency management in the monorepo structure
3. Configure optimized asset handling for media files
4. Implement server-side caching to improve performance
5. Use Next.js Image component for optimized thumbnail rendering

## Security Considerations

1. Implement rate limiting to prevent abuse
2. Add user-agent rotation to prevent IP blocking
3. Consider adding a simple authentication layer for the API
4. Implement proper error handling to prevent information leakage
5. Add proper attribution and legal disclaimers regarding Instagram content usage

## Testing Instructions

1. Test with various Instagram links including posts, reels, stories, and carousels
2. Verify all fallback methods work correctly when primary methods fail
3. Test error scenarios including invalid URLs, deleted posts, and private accounts
4. Verify the downloader works with different media types (video, image, carousel)
5. Check browser compatibility across Chrome, Firefox, Safari, and mobile browsers

## Unit Testing

1. Write unit tests for the `tiktok-video-downloader` package
2. Test all functions, especially the video download methods
3. Use Jest
4. Ensure all tests pass before merging changes
