"use client";

import { useState } from "react";
import styles from "./instagram.module.css";
import Link from "next/link";
import Image from "next/image";

interface InstagramData {
  postId: string;
  username: string;
  caption?: string;
  isCarousel: boolean;
  likesCount?: number;
  commentsCount?: number;
  mediaItems: {
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
  }[];
  savedFiles?: {
    mediaPath: string;
    thumbnailPath?: string;
  }[];
}

export default function InstagramPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [instagramData, setInstagramData] = useState<InstagramData | null>(null);
  const [error, setError] = useState("");
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showThumbnailPreview, setShowThumbnailPreview] = useState(false);
  const [enlargedThumbnail, setEnlargedThumbnail] = useState(false);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);
  const [exampleClicked, setExampleClicked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if already loading
    if (isLoading) return;
    
    setIsLoading(true);
    setError("");
    setInstagramData(null);
    setShowThumbnailPreview(false);
    setEnlargedThumbnail(false);
    setDownloadNotification(null);
    setCurrentMediaIndex(0);
    
    // Basic validation for Instagram URL
    if (!url.includes('instagram.com/reel') && !url.includes('instagram.com/reels')) {
      setError("Please enter a valid Instagram reel URL");
      setIsLoading(false);
      return;
    }

    // Add proper protocol if missing
    const processedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    try {
      const response = await fetch('/api/instagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: processedUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}: Failed to fetch Instagram data`);
      }
      
      if (data.error) {
        throw new Error(data.message || 'Error processing post');
      }
      
      if (!data.mediaItems || data.mediaItems.length === 0) {
        throw new Error('No media found in the Instagram post');
      }
      
      setInstagramData(data);
      
      // If we have a thumbnail, we can show the preview immediately
      if (data.mediaItems[0]?.thumbnailUrl) {
        setShowThumbnailPreview(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch Instagram data. Please check the URL and try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setExampleClicked(false);
    }
  };

  const handleMediaDownload = () => {
    setShowThumbnailPreview(true);
    setDownloadNotification("Media downloaded successfully! Preview is now available.");
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      setDownloadNotification(null);
    }, 5000);
  };
  
  const handleThumbnailDownload = () => {
    setDownloadNotification("Thumbnail downloaded successfully!");
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      setDownloadNotification(null);
    }, 5000);
  };
  
  const renderErrorMessage = (message: string) => {
    // Provide more helpful error messages based on common errors
    if (message.includes('Could not extract post ID')) {
      return (
        <div className={styles.errorWithHelp}>
          <p>{message}</p>
          <p className={styles.errorHelp}>Make sure you're using a direct link to an Instagram reel. Example formats:</p>
          <ul className={styles.errorExamples}>
            <li>https://www.instagram.com/reel/ABCDEFG/</li>
            <li>https://www.instagram.com/reels/ABCDEFG/</li>
          </ul>
        </div>
      );
    } else if (message.includes('No media found') || message.includes('Could not download media')) {
      return (
        <div className={styles.errorWithHelp}>
          <p>{message}</p>
          <p className={styles.errorHelp}>This could be because:</p>
          <ul className={styles.errorReasons}>
            <li>The post is from a private account</li>
            <li>The post has been deleted</li>
            <li>Instagram has updated their website structure</li>
            <li>You're trying to access content that requires authentication</li>
          </ul>
          <p>Try using a different Instagram link or try again later.</p>
        </div>
      );
    }
    
    // Default error message
    return <p>{message}</p>;
  };
  
  const nextMedia = () => {
    if (instagramData && currentMediaIndex < instagramData.mediaItems.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };
  
  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };
  
  const handleExampleClick = (exampleUrl: string) => {
    if (isLoading) return;
    setExampleClicked(true);
    setUrl(exampleUrl);
    
    // Submit the form programmatically after setting the URL
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }, 100);
  };

  const renderMedia = () => {
    if (!instagramData || !instagramData.mediaItems.length) return null;
    
    const currentMedia = instagramData.mediaItems[currentMediaIndex];
    const savedFile = instagramData.savedFiles?.[currentMediaIndex];
    
    if (!currentMedia || !savedFile) return null;
    
    return (
      <div className={styles.mediaContainer}>
        {instagramData.isCarousel && instagramData.mediaItems.length > 1 && (
          <div className={styles.carouselControls}>
            <button 
              className={styles.carouselButton} 
              onClick={prevMedia}
              disabled={currentMediaIndex === 0}
              style={{ visibility: currentMediaIndex === 0 ? 'hidden' : 'visible' }}
            >
              ◀
            </button>
            <button 
              className={styles.carouselButton} 
              onClick={nextMedia}
              disabled={currentMediaIndex === instagramData.mediaItems.length - 1}
              style={{ visibility: currentMediaIndex === instagramData.mediaItems.length - 1 ? 'hidden' : 'visible' }}
            >
              ▶
            </button>
          </div>
        )}
        
        {instagramData.isCarousel && instagramData.mediaItems.length > 1 && (
          <div className={styles.carouselIndicators}>
            {instagramData.mediaItems.map((_, index) => (
              <div 
                key={index} 
                className={`${styles.carouselIndicator} ${index === currentMediaIndex ? styles.carouselIndicatorActive : ''}`}
                onClick={() => setCurrentMediaIndex(index)}
              />
            ))}
          </div>
        )}
        
        {currentMedia.type === 'video' ? (
          <video 
            src={savedFile.mediaPath} 
            poster={savedFile.thumbnailPath}
            controls
            autoPlay
            className={styles.video}
          />
        ) : (
          <Image 
            src={savedFile.mediaPath} 
            alt="Instagram image"
            className={styles.image}
            width={600}
            height={800}
            unoptimized
          />
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>Back to Home</Link>
        <h1>Instagram Media Downloader</h1>
      </header>

      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Enter Instagram reel URL (e.g., https://www.instagram.com/reel/CodExampleID/)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className={styles.input}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className={styles.submitButton} 
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? "Loading..." : "Get Media"}
          </button>
        </form>
        
        <div className={styles.instructions}>
          <p>Paste an Instagram reel URL above and click "Get Media" to view and download it. Only works with reels.</p>
          <p className={styles.exampleContainer}>
            Try these examples: 
            <button 
              className={styles.exampleLink} 
              onClick={() => handleExampleClick("https://www.instagram.com/reel/C0rkA5lLY-c/")}
              disabled={isLoading || exampleClicked}
            >
              <span>Instagram Reel</span> 
              <span className={styles.exampleLinkIcon}>→</span>
            </button>
            <button 
              className={styles.exampleLink} 
              onClick={() => handleExampleClick("https://www.instagram.com/reel/DGOIwPlq45w/")}
              disabled={isLoading || exampleClicked}
            >
              <span>Instagram Reel 2</span> 
              <span className={styles.exampleLinkIcon}>→</span>
            </button>
          </p>
        </div>

        {error && <div className={styles.error}>{renderErrorMessage(error)}</div>}
        
        {isLoading && (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}></div>
            <p>Fetching Instagram media data...</p>
          </div>
        )}

        {instagramData && (
          <div className={styles.resultContainer}>
            {renderMedia()}
            
            <div className={styles.infoContainer}>
              <h2 className={styles.username}>{instagramData.username}</h2>
              
              {instagramData.caption && (
                <p className={styles.description}>{instagramData.caption}</p>
              )}
              
              {(instagramData.likesCount || instagramData.commentsCount) && (
                <div className={styles.stats}>
                  {instagramData.likesCount && (
                    <div className={styles.stat}>
                      <span>❤️</span> {instagramData.likesCount.toLocaleString()} likes
                    </div>
                  )}
                  {instagramData.commentsCount && (
                    <div className={styles.stat}>
                      <span>💬</span> {instagramData.commentsCount.toLocaleString()} comments
                    </div>
                  )}
                </div>
              )}
              
              <div className={styles.downloadButtons}>
                {instagramData.savedFiles && (
                  <a 
                    href={instagramData.savedFiles[currentMediaIndex]?.mediaPath} 
                    download={`instagram_${instagramData.mediaItems[currentMediaIndex]?.type === 'video' ? 'video' : 'image'}.${instagramData.mediaItems[currentMediaIndex]?.type === 'video' ? 'mp4' : 'jpg'}`}
                    className={styles.downloadButton}
                    onClick={handleMediaDownload}
                  >
                    {instagramData.mediaItems[currentMediaIndex]?.type === 'video' ? 'Download Video' : 'Download Image'}
                  </a>
                )}
                
                {instagramData.isCarousel && instagramData.savedFiles && instagramData.savedFiles.length > 1 && (
                  <div className={styles.fileInfo}>
                    <p>Showing {currentMediaIndex + 1} of {instagramData.savedFiles.length} media items. Use the carousel controls to view all items.</p>
                  </div>
                )}
                
                <div className={styles.fileInfo}>
                  <p>Media saved at: <code>/instagram/{instagramData.postId}/{instagramData.mediaItems[currentMediaIndex]?.type === 'video' ? 'video' : 'image'}{instagramData.isCarousel ? `_${currentMediaIndex + 1}` : ''}.{instagramData.mediaItems[currentMediaIndex]?.type === 'video' ? 'mp4' : 'jpg'}</code></p>
                </div>
              </div>
              
              {showThumbnailPreview && instagramData.savedFiles && instagramData.savedFiles[currentMediaIndex]?.thumbnailPath && (
                <div className={styles.thumbnailPreviewContainer}>
                  <h3>Media Thumbnail</h3>
                  <div 
                    className={styles.thumbnailWrapper}
                    onClick={() => setEnlargedThumbnail(!enlargedThumbnail)}
                  >
                    <Image 
                      src={instagramData.savedFiles[currentMediaIndex].thumbnailPath || ''} 
                      alt="Media thumbnail" 
                      className={styles.thumbnailPreview}
                      width={300}
                      height={400}
                      unoptimized
                    />
                    <div className={styles.thumbnailOverlay}>
                      <span>{enlargedThumbnail ? 'Click to shrink' : 'Click to enlarge'}</span>
                    </div>
                  </div>
                  <div className={styles.thumbnailInfo}>
                    <p>Thumbnail saved at: <code>/instagram/{instagramData.postId}/thumbnail{instagramData.isCarousel ? `_${currentMediaIndex + 1}` : ''}.jpg</code></p>
                  </div>
                  <div className={styles.thumbnailActions}>
                    <a 
                      href={instagramData.savedFiles[currentMediaIndex].thumbnailPath} 
                      download="instagram_thumbnail.jpg"
                      className={styles.thumbnailDownloadButton}
                      onClick={handleThumbnailDownload}
                    >
                      Download Thumbnail
                    </a>
                  </div>
                </div>
              )}
              
              {enlargedThumbnail && instagramData.savedFiles && instagramData.savedFiles[currentMediaIndex]?.thumbnailPath && (
                <div className={styles.enlargedThumbnailContainer} onClick={() => setEnlargedThumbnail(false)}>
                  <div className={styles.enlargedThumbnailWrapper}>
                    <Image 
                      src={instagramData.savedFiles[currentMediaIndex].thumbnailPath || ''} 
                      alt="Enlarged thumbnail" 
                      className={styles.enlargedThumbnail}
                      width={900}
                      height={1200}
                      unoptimized
                    />
                    <button 
                      className={styles.closeEnlargedButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnlargedThumbnail(false);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {downloadNotification && (
          <div className={styles.notification}>
            {downloadNotification}
          </div>
        )}
      </main>
    </div>
  );
}
