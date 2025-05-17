import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { downloadTikTokVideo } from 'tiktok-video-downloader';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('tiktok.com')) {
      return NextResponse.json(
        { error: 'Invalid TikTok URL' },
        { status: 400 }
      );
    }

    try {
      // Use the tiktok-video-downloader package to download the video
      const result = await downloadTikTokVideo(url, {
        outputDir: path.join(process.cwd(), 'public', 'tiktok')
      });
      
      // Create public URLs for the video and thumbnail
      const videoPublicUrl = `/tiktok/${result.videoId}/video.mp4`;
      const thumbnailPublicUrl = result.thumbnail ? `/tiktok/${result.videoId}/thumbnail.jpg` : '';
      
      return NextResponse.json({
        video: videoPublicUrl,
        thumbnail: thumbnailPublicUrl,
        username: result.username,
        description: result.description,
        downloadUrl: videoPublicUrl
      });
    } catch (error) {
      console.error('Error downloading TikTok video:', error);
      
      return NextResponse.json({
        error: 'Could not download video',
        message: 'TikTok has strong protections against downloading videos. Try another URL or try again later.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in TikTok API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch TikTok data', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}