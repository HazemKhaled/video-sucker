import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { downloadInstagramMedia } from "instagram-video-downloader";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    // Validate the URL format - only accepting Instagram reel URLs
    const reelPattern = /instagram\.com\/(?:reel|reels)\/([A-Za-z0-9_-]+)/i;
    if (!url || !reelPattern.test(url)) {
      return NextResponse.json(
        {
          error: "Invalid Instagram URL",
          message:
            "Please provide a valid Instagram reel URL. Other content types are not supported.",
        },
        { status: 400 },
      );
    }

    try {
      console.log(`Processing Instagram URL: ${url}`);

      // Use the instagram-video-downloader package to download the media
      const result = await downloadInstagramMedia(url, {
        outputDir: path.join(process.cwd(), "public"),
      });

      if (!result || !result.mediaItems || result.mediaItems.length === 0) {
        return NextResponse.json(
          {
            error: "No media found",
            message:
              "Could not find any downloadable media in the provided Instagram URL.",
          },
          { status: 404 },
        );
      }

      console.log(
        `Successfully downloaded media for reel ${result.reelId} by ${result.username}`,
      );
      console.log(`Media items: ${result.mediaItems.length}`);

      // Process the response to make it suitable for frontend
      const responseData = {
        reelId: result.reelId,
        username: result.username,
        caption: result.caption,
        likesCount: result.likesCount,
        commentsCount: result.commentsCount,
        timestamp: result.timestamp,
        mediaItems: result.mediaItems.map((item) => ({
          type: item.type,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
        })),
        savedFiles: result.savedFiles,
      };

      return NextResponse.json(responseData);
    } catch (error) {
      console.error("Error downloading Instagram media:", error);

      // Generate a more detailed error message
      let errorMessage =
        "Instagram has strong protections against downloading media. Try another URL or try again later.";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Log the stack trace for debugging
        console.error(`Stack trace: ${error.stack}`);

        // Additional debugging info
        if (
          error.message.includes("fetch") ||
          error.message.includes("network")
        ) {
          errorMessage =
            "Network error when connecting to Instagram. The service might be temporarily unavailable.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "The request to Instagram timed out. Try again later when Instagram servers are less busy.";
        } else if (
          error.message.includes("403") ||
          error.message.includes("forbidden")
        ) {
          errorMessage =
            "Access to Instagram content was denied. Instagram may have detected automated access.";
        } else if (
          error.message.includes("404") ||
          error.message.includes("not found")
        ) {
          errorMessage =
            "The Instagram content could not be found. It may have been deleted or made private.";
        }
      }

      return NextResponse.json(
        {
          error: "Could not download media",
          message: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in Instagram API route:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch Instagram data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
