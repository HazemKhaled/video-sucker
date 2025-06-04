"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./VideoDownloader.module.css";

export interface MediaItem {
  type: "video" | "image";
  url: string;
  thumbnailUrl?: string;
}

export interface VideoData {
  video?: string;
  thumbnail?: string;
  username: string;
  description: string;
  downloadUrl?: string;
  mediaItems?: MediaItem[];
  savedFiles?: Array<{ mediaPath: string; thumbnailPath?: string }>;
}

export interface ExampleLink {
  url: string;
  label: string;
}

interface VideoDownloaderProps {
  platform: "tiktok" | "instagram";
  title: string;
  placeholder: string;
  apiEndpoint: string;
  examples: ExampleLink[];
  primaryColor: string;
}

export default function VideoDownloader({
  platform,
  title,
  placeholder,
  apiEndpoint,
  examples,
  primaryColor,
}: VideoDownloaderProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState("");
  const [showThumbnailPreview, setShowThumbnailPreview] = useState(false);
  const [enlargedThumbnail, setEnlargedThumbnail] = useState(false);
  const [downloadNotification, setDownloadNotification] = useState<
    string | null
  >(null);
  const [exampleClicked, setExampleClicked] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setError("");
    setVideoData(null);
    setShowThumbnailPreview(false);
    setEnlargedThumbnail(false);
    setDownloadNotification(null);
    setCurrentMediaIndex(0);

    // Basic validation
    if (!url.includes(`${platform}.com`)) {
      setError(`Please enter a valid ${platform} URL`);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch ${platform} data`);
      }

      if (data.error) {
        throw new Error(data.message || "Error processing video");
      }

      setVideoData(data);

      // If we have a thumbnail, show the preview immediately
      if (
        data.thumbnail ||
        (data.mediaItems && data.mediaItems[0]?.thumbnailUrl)
      ) {
        setShowThumbnailPreview(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to fetch ${platform} data. Please check the URL and try again.`,
      );
      console.error(err);
    } finally {
      setIsLoading(false);
      setExampleClicked(false);
    }
  };

  const handleExampleClick = (exampleUrl: string) => {
    if (isLoading) return;
    setExampleClicked(true);
    setUrl(exampleUrl);
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form)
        form.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true }),
        );
    }, 100);
  };

  const handleVideoDownload = () => {
    setShowThumbnailPreview(true);
    setDownloadNotification(
      "Video downloaded successfully! Thumbnail preview is now available.",
    );
    setTimeout(() => setDownloadNotification(null), 5000);
  };

  const handleThumbnailDownload = () => {
    setDownloadNotification("Thumbnail downloaded successfully!");
    setTimeout(() => setDownloadNotification(null), 5000);
  };

  const nextMedia = () => {
    if (videoData?.mediaItems) {
      setCurrentMediaIndex((prev) => (prev + 1) % videoData.mediaItems!.length);
    }
  };

  const prevMedia = () => {
    if (videoData?.mediaItems) {
      setCurrentMediaIndex(
        (prev) =>
          (prev - 1 + videoData.mediaItems!.length) %
          videoData.mediaItems!.length,
      );
    }
  };

  const currentMedia = videoData?.mediaItems?.[currentMediaIndex];
  const hasMultipleMedia =
    videoData?.mediaItems && videoData.mediaItems.length > 1;

  return (
    <div className={styles.container} data-platform={platform}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          Back to Home
        </Link>
        <h1 className={styles.title} style={{ color: primaryColor }}>
          {title}
        </h1>
      </header>

      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder={placeholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className={styles.input}
            disabled={isLoading}
            style={{ borderColor: isLoading ? "#ccc" : primaryColor }}
          />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || !url.trim()}
            style={{ backgroundColor: primaryColor }}
          >
            {isLoading ? "Loading..." : "Get Video"}
          </button>
        </form>

        <div className={styles.instructions}>
          <p>
            Paste a {platform} video URL above and click "Get Video" to view and
            download it.
          </p>
          <p className={styles.exampleContainer}>
            Try these examples:{" "}
            {examples.map((example, index) => (
              <span key={index}>
                {index > 0 && " or "}
                <button
                  className={`${styles.exampleLink} ${exampleClicked ? styles.exampleLinkClicked : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleExampleClick(example.url);
                  }}
                  disabled={isLoading || exampleClicked}
                  style={{ color: primaryColor, borderColor: primaryColor }}
                >
                  <span>
                    {exampleClicked ? "Loading example..." : example.label}
                  </span>
                  {exampleClicked ? (
                    <span className={styles.exampleLinkSpinner}></span>
                  ) : (
                    <span className={styles.exampleLinkIcon}>→</span>
                  )}
                </button>
              </span>
            ))}
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {isLoading && (
          <div className={styles.loaderContainer}>
            <div
              className={styles.loader}
              style={{ borderTopColor: primaryColor }}
            ></div>
            <p>Fetching {platform} video data...</p>
          </div>
        )}

        {videoData && (
          <div className={styles.resultContainer}>
            <div className={styles.mediaContainer}>
              {/* Handle Instagram carousel or single TikTok video */}
              {hasMultipleMedia ? (
                <div className={styles.carouselContainer}>
                  {currentMedia?.type === "video" ? (
                    <video
                      src={currentMedia.url}
                      poster={currentMedia.thumbnailUrl}
                      controls
                      autoPlay
                      className={styles.video}
                    />
                  ) : (
                    <Image
                      src={currentMedia?.url || ""}
                      alt="Instagram post"
                      className={styles.image}
                      width={500}
                      height={500}
                      unoptimized
                    />
                  )}
                  <div className={styles.carouselControls}>
                    <button
                      className={styles.carouselButton}
                      onClick={prevMedia}
                    >
                      ‹
                    </button>
                    <button
                      className={styles.carouselButton}
                      onClick={nextMedia}
                    >
                      ›
                    </button>
                  </div>
                  <div className={styles.carouselIndicators}>
                    {videoData.mediaItems?.map((_, index) => (
                      <div
                        key={index}
                        className={`${styles.carouselIndicator} ${
                          index === currentMediaIndex
                            ? styles.carouselIndicatorActive
                            : ""
                        }`}
                        onClick={() => setCurrentMediaIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <video
                  src={videoData.video || currentMedia?.url}
                  poster={videoData.thumbnail || currentMedia?.thumbnailUrl}
                  controls
                  autoPlay
                  className={styles.video}
                />
              )}
            </div>

            <div className={styles.infoContainer}>
              <h2 className={styles.username}>{videoData.username}</h2>
              <p className={styles.description}>{videoData.description}</p>

              <div className={styles.downloadButtons}>
                {videoData.downloadUrl || videoData.video ? (
                  <a
                    href={videoData.downloadUrl || videoData.video}
                    download={`${platform}_video.mp4`}
                    className={styles.downloadButton}
                    onClick={handleVideoDownload}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Download Video
                  </a>
                ) : null}

                {videoData.savedFiles?.map((file, index) => (
                  <a
                    key={index}
                    href={file.mediaPath}
                    download={`${platform}_media_${index + 1}`}
                    className={styles.downloadButton}
                    style={{ backgroundColor: primaryColor }}
                  >
                    Download Media {index + 1}
                  </a>
                ))}
              </div>

              <div className={styles.fileInfo}>
                <p>
                  Files saved in:{" "}
                  <code>
                    /{platform}/
                    {videoData.video
                      ? videoData.video.split("/").slice(-2)[0]
                      : videoData.savedFiles?.[0]?.mediaPath
                          .split("/")
                          .slice(-2)[0] || "unknown"}
                    /
                  </code>
                </p>
              </div>

              {showThumbnailPreview &&
                (videoData.thumbnail || currentMedia?.thumbnailUrl) && (
                  <div className={styles.thumbnailPreviewContainer}>
                    <h3>Video Thumbnail</h3>
                    <div
                      className={styles.thumbnailWrapper}
                      onClick={() => setEnlargedThumbnail(!enlargedThumbnail)}
                    >
                      <Image
                        src={
                          videoData.thumbnail ||
                          currentMedia?.thumbnailUrl ||
                          ""
                        }
                        alt="Video thumbnail"
                        className={styles.thumbnailPreview}
                        width={250}
                        height={350}
                        unoptimized
                      />
                      <div className={styles.thumbnailOverlay}>
                        <span>
                          {enlargedThumbnail
                            ? "Click to shrink"
                            : "Click to enlarge"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.thumbnailActions}>
                      <a
                        href={videoData.thumbnail || currentMedia?.thumbnailUrl}
                        download={`${platform}_thumbnail.jpg`}
                        className={styles.thumbnailDownloadButton}
                        onClick={handleThumbnailDownload}
                      >
                        Download Thumbnail
                      </a>
                    </div>
                  </div>
                )}

              {enlargedThumbnail &&
                (videoData.thumbnail || currentMedia?.thumbnailUrl) && (
                  <div
                    className={styles.enlargedThumbnailContainer}
                    onClick={() => setEnlargedThumbnail(false)}
                  >
                    <div className={styles.enlargedThumbnailWrapper}>
                      <Image
                        src={
                          videoData.thumbnail ||
                          currentMedia?.thumbnailUrl ||
                          ""
                        }
                        alt="Enlarged thumbnail"
                        className={styles.enlargedThumbnail}
                        width={500}
                        height={700}
                        unoptimized
                      />
                      <button
                        className={styles.closeEnlargedButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedThumbnail(false);
                        }}
                        style={{ backgroundColor: primaryColor }}
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
          <div className={styles.notification}>{downloadNotification}</div>
        )}
      </main>
    </div>
  );
}
