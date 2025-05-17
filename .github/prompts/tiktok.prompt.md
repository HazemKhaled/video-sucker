---
mode: "agent"
---

# TikTok Video Downloader Implementation Guide

## Objective

Create a full-featured TikTok video downloader with a user-friendly interface that allows users to paste TikTok links, view videos directly in the browser, and download them for offline viewing.

## Architecture Requirements

1. Implement as part of a monorepo structure using PNPM workspaces
2. Create a standalone package `tiktok-video-downloader` that can be published to npm
3. Build a Next.js page to showcase the downloader functionality

## Package Implementation (`tiktok-video-downloader`)

1. Create a new package in the `packages/` directory with the following files:

   - `package.json` - Configure as ESM module with proper dependencies
   - `tsconfig.json` - Set up TypeScript configuration for the package
   - `src/downloader.ts` - Implement multiple fallback methods for video download
   - `src/index.ts` - Export the public API
   - `README.md` - Document usage and installation instructions

2. Core functionality should include:
   - Extracting video ID and metadata from TikTok URLs
   - Multiple fallback methods to handle TikTok's anti-scraping protections
   - Saving video and thumbnail files to a specified location
   - Proper error handling with descriptive messages
   - TypeScript interfaces for all inputs and outputs

## Next.js Frontend Implementation

1. Create a new route at `/tiktok` with a clean, modern UI
2. Implement the following features:

   - Input field for TikTok URLs with validation
   - Submit button with loading state
   - Error handling with user-friendly messages
   - Video player that displays the downloaded video
   - Thumbnail preview with click-to-enlarge functionality
   - Metadata display (username, description)
   - Download buttons for both video and thumbnail
   - Example TikTok link for users to test functionality

3. API Implementation:
   - Create a new API route at `/api/tiktok`
   - Accept POST requests with TikTok URLs
   - Use the `tiktok-video-downloader` package to process the videos
   - Return video paths, thumbnail paths, and metadata
   - Handle errors gracefully with descriptive messages

## Styling and User Experience

1. Implement responsive design that works well on all devices
2. Add subtle animations for loading states and interactions
3. Provide clear feedback on success and error states
4. Include helpful instructions for users
5. Create CSS modules for component styling

## Build and Deployment

1. Update build scripts to support the monorepo structure
2. Ensure the package is built before the main application
3. Configure proper TypeScript settings for both package and application
4. Implement proper Next.js Image component usage for thumbnails

## Testing Instructions

1. Test with various TikTok links to ensure robustness
2. Verify that all fallback methods work correctly
3. Test error scenarios and ensure they're handled gracefully
4. Check browser compatibility across Chrome, Firefox, and Safari

## Unit Testing

1. Write unit tests for the `tiktok-video-downloader` package
2. Test all functions, especially the video download methods
3. Use Jest
4. Ensure all tests pass before merging changes
