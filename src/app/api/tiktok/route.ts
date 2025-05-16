import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

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
      // Extract TikTok video ID from URL
      // Format is typically like: https://www.tiktok.com/@username/video/1234567890
      let username = '';
      let videoId = '';
      
      try {
        const urlParts = url.split('/');
        videoId = urlParts[urlParts.length - 1].split('?')[0];
        username = url.includes('@') ? url.split('@')[1]?.split('/')[0] || '' : '';
      } catch (e) {
        console.error('Error extracting video info:', e);
      }
      
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }

      // Create the directory for this specific TikTok video
      const tiktokDir = path.join(process.cwd(), 'public', 'tiktok', videoId);
      if (!fs.existsSync(tiktokDir)) {
        fs.mkdirSync(tiktokDir, { recursive: true });
      }

      // First, use TikTok's embed API to get metadata
      const embedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const embedResponse = await fetch(embedUrl);
      
      if (!embedResponse.ok) {
        throw new Error('Failed to fetch TikTok embed data');
      }
      
      const embedData = await embedResponse.json();
      
      // Now use TikTok downloader API to get the actual video file
      // We're using a pattern that works with TikTok's public APIs
      const tikApiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const tikApiResponse = await fetch(tikApiUrl);
      
      if (!tikApiResponse.ok) {
        throw new Error('Failed to fetch video download URL');
      }
      
      const tikApiData = await tikApiResponse.json();
      
      if (!tikApiData.data || !tikApiData.data.play) {
        throw new Error('No video URL found in response');
      }
      
      // Download the video file
      const videoUrl = tikApiData.data.play;
      const videoResponse = await fetch(videoUrl);
      
      if (!videoResponse.ok) {
        throw new Error('Failed to download video file');
      }
      
      // Save the video with the filename 'video.mp4' in the videoId folder
      const videoPath = path.join(tiktokDir, 'video.mp4');
      
      const videoBuffer = await videoResponse.arrayBuffer();
      await writeFile(videoPath, Buffer.from(videoBuffer));
      
      // Create a public URL for the video
      const videoPublicUrl = `/tiktok/${videoId}/video.mp4`;
      
      // Get thumbnail from the TikTok API response
      const thumbnailUrl = tikApiData.data.cover || embedData.thumbnail_url;
      
      // If we have a thumbnail URL, download it as well
      let thumbnailPublicUrl = '';
      if (thumbnailUrl) {
        const thumbnailResponse = await fetch(thumbnailUrl);
        if (thumbnailResponse.ok) {
          const thumbnailPath = path.join(tiktokDir, 'thumbnail.jpg');
          const thumbnailBuffer = await thumbnailResponse.arrayBuffer();
          await writeFile(thumbnailPath, Buffer.from(thumbnailBuffer));
          thumbnailPublicUrl = `/tiktok/${videoId}/thumbnail.jpg`;
        }
      }
      
      return NextResponse.json({
        video: videoPublicUrl,
        thumbnail: thumbnailPublicUrl || thumbnailUrl,
        username: tikApiData.data.author?.nickname || embedData.author_name || username || 'Unknown',
        description: tikApiData.data.title || embedData.title || 'TikTok Video',
        downloadUrl: videoPublicUrl
      });
    } catch (error) {
      console.error('Error downloading TikTok video:', error);
      
      // If the first approach fails, try a different API
      try {
        const videoId = url.split('/').pop()?.split('?')[0] || '';
        let username = '';
        try {
          username = url.includes('@') ? url.split('@')[1]?.split('/')[0] || '' : '';
        } catch (e) {
          console.error('Error extracting username:', e);
        }
        
        // Create the directory for this specific TikTok video
        const tiktokDir = path.join(process.cwd(), 'public', 'tiktok', videoId);
        if (!fs.existsSync(tiktokDir)) {
          fs.mkdirSync(tiktokDir, { recursive: true });
        }
        
        // Try an alternative API service (this is a fallback and may not always work)
        const ssstikUrl = `https://ssstik.io/api/1/downloader?url=${encodeURIComponent(url)}`;
        const ssstikResponse = await fetch(ssstikUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!ssstikResponse.ok) {
          throw new Error('Failed to fetch from backup service');
        }
        
        const ssstikData = await ssstikResponse.json();
        
        // Download video from the backup service
        const backupVideoUrl = ssstikData.video?.download_url;
        if (!backupVideoUrl) {
          throw new Error('No video URL in backup response');
        }
        
        const backupVideoResponse = await fetch(backupVideoUrl);
        if (!backupVideoResponse.ok) {
          throw new Error('Failed to download video from backup service');
        }
        
        // Save the video with the filename 'video.mp4' in the videoId folder
        const videoPath = path.join(tiktokDir, 'video.mp4');
        
        const videoBuffer = await backupVideoResponse.arrayBuffer();
        await writeFile(videoPath, Buffer.from(videoBuffer));
        
        // Create a public URL for the video
        const videoPublicUrl = `/tiktok/${videoId}/video.mp4`;
        
        // Try to get and save the thumbnail
        let thumbnailPublicUrl = '';
        if (ssstikData.thumbnail) {
          const thumbnailResponse = await fetch(ssstikData.thumbnail);
          if (thumbnailResponse.ok) {
            const thumbnailPath = path.join(tiktokDir, 'thumbnail.jpg');
            const thumbnailBuffer = await thumbnailResponse.arrayBuffer();
            await writeFile(thumbnailPath, Buffer.from(thumbnailBuffer));
            thumbnailPublicUrl = `/tiktok/${videoId}/thumbnail.jpg`;
          }
        }
        
        return NextResponse.json({
          video: videoPublicUrl,
          thumbnail: thumbnailPublicUrl || ssstikData.thumbnail || `https://api.tiktokv.com/aweme/v1/aweme/detail/?aweme_id=${videoId}`,
          username: ssstikData.author || username || 'Unknown',
          description: ssstikData.title || 'TikTok Video',
          downloadUrl: videoPublicUrl
        });
      } catch (fallbackError) {
        console.error('All video download approaches failed:', fallbackError);
        
        // Third fallback approach - use a simple TikTok video API
        try {
          const videoId = url.split('/').pop()?.split('?')[0] || '';
          if (!videoId) {
            throw new Error('Could not extract video ID');
          }
          
          // Create the directory for this specific TikTok video
          const tiktokDir = path.join(process.cwd(), 'public', 'tiktok', videoId);
          if (!fs.existsSync(tiktokDir)) {
            fs.mkdirSync(tiktokDir, { recursive: true });
          }
          
          // Use a public video downloader as last resort
          const rapidsaveUrl = `https://rapidsave.com/api/get-video?url=${encodeURIComponent(url)}`;
          const rapidsaveResponse = await fetch(rapidsaveUrl);
          
          if (!rapidsaveResponse.ok) {
            throw new Error('Failed to fetch from last resort service');
          }
          
          const rapidsaveData = await rapidsaveResponse.json();
          
          if (!rapidsaveData.videoUrl) {
            throw new Error('No video URL in last resort response');
          }
          
          // Download the video
          const videoResponse = await fetch(rapidsaveData.videoUrl);
          if (!videoResponse.ok) {
            throw new Error('Failed to download video from last resort service');
          }
          
          // Save the video with the filename 'video.mp4' in the videoId folder
          const videoPath = path.join(tiktokDir, 'video.mp4');
          
          const videoBuffer = await videoResponse.arrayBuffer();
          await writeFile(videoPath, Buffer.from(videoBuffer));
          
          // Create a public URL for the video
          const videoPublicUrl = `/tiktok/${videoId}/video.mp4`;
          
          // Try to get and save the thumbnail
          let thumbnailPublicUrl = '';
          if (rapidsaveData.thumbnailUrl) {
            const thumbnailResponse = await fetch(rapidsaveData.thumbnailUrl);
            if (thumbnailResponse.ok) {
              const thumbnailPath = path.join(tiktokDir, 'thumbnail.jpg');
              const thumbnailBuffer = await thumbnailResponse.arrayBuffer();
              await writeFile(thumbnailPath, Buffer.from(thumbnailBuffer));
              thumbnailPublicUrl = `/tiktok/${videoId}/thumbnail.jpg`;
            }
          }
          
          return NextResponse.json({
            video: videoPublicUrl,
            thumbnail: thumbnailPublicUrl || rapidsaveData.thumbnailUrl || '',
            username: rapidsaveData.author || 'Unknown',
            description: rapidsaveData.description || 'TikTok Video',
            downloadUrl: videoPublicUrl
          });
        } catch (lastError) {
          console.error('All download approaches failed:', lastError);
          
          return NextResponse.json({
            error: 'Could not download video',
            message: 'TikTok has strong protections against downloading videos. Try another URL or try again later.'
          }, { status: 500 });
        }
      }
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