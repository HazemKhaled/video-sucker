"use client";

import { useState } from "react";
import styles from "./tiktok.module.css";
import Link from "next/link";
import Image from "next/image";

interface TikTokData {
  video: string;
  thumbnail: string;
  username: string;
  description: string;
  downloadUrl?: string;
}

export default function TikTokPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tiktokData, setTiktokData] = useState<TikTokData | null>(null);
  const [error, setError] = useState("");
  const [showThumbnailPreview, setShowThumbnailPreview] = useState(false);
  const [enlargedThumbnail, setEnlargedThumbnail] = useState(false);
  const [downloadNotification, setDownloadNotification] = useState<
    string | null
  >(null);
  const [exampleClicked, setExampleClicked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't submit if already loading
    if (isLoading) return;

    setIsLoading(true);
    setError("");
    setTiktokData(null);
    setShowThumbnailPreview(false);
    setEnlargedThumbnail(false);
    setDownloadNotification(null);

    // Basic validation for TikTok URL
    if (!url.includes("tiktok.com")) {
      setError("Please enter a valid TikTok URL");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/tiktok", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch TikTok data");
      }

      if (data.error) {
        throw new Error(data.message || "Error processing video");
      }

      setTiktokData(data);

      // If we have a thumbnail, we can show the preview immediately
      if (data.thumbnail) {
        setShowThumbnailPreview(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch TikTok data. Please check the URL and try again.",
      );
      console.error(err);
    } finally {
      setIsLoading(false);
      setExampleClicked(false);
    }
  };

  const handleVideoDownload = () => {
    setShowThumbnailPreview(true);
    setDownloadNotification(
      "Video downloaded successfully! Thumbnail preview is now available.",
    );

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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          Back to Home
        </Link>
        <h1>TikTok Video Downloader</h1>
      </header>

      <main className={styles.main}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Enter TikTok URL (e.g., https://www.tiktok.com/@username/video/1234567890)"
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
            {isLoading ? "Loading..." : "Get Video"}
          </button>
        </form>

        <div className={styles.instructions}>
          <p>
            Paste a TikTok video URL above and click "Get Video" to view and
            download it.
          </p>
          <p className={styles.exampleContainer}>
            Try these examples:{" "}
            <button
              className={`${styles.exampleLink} ${exampleClicked ? styles.exampleLinkClicked : ""}`}
              onClick={(e) => {
                e.preventDefault();
                if (isLoading) return; // Prevent clicks while already loading
                setExampleClicked(true);
                setUrl(
                  "https://www.tiktok.com/@azo_aljaer/video/7290073611744955653",
                );
                // Submit the form programmatically after setting the URL
                setTimeout(() => {
                  const form = document.querySelector("form");
                  if (form)
                    form.dispatchEvent(
                      new Event("submit", { cancelable: true, bubbles: true }),
                    );
                }, 100);
              }}
              disabled={isLoading || exampleClicked}
            >
              <span>
                {exampleClicked
                  ? "Loading example..."
                  : "@khaby.lame's viral TikTok"}
              </span>
              {exampleClicked ? (
                <span className={styles.exampleLinkSpinner}></span>
              ) : (
                <span className={styles.exampleLinkIcon}>→</span>
              )}
            </button>
            {" or "}
            <button
              className={`${styles.exampleLink} ${exampleClicked ? styles.exampleLinkClicked : ""}`}
              onClick={(e) => {
                e.preventDefault();
                if (isLoading) return; // Prevent clicks while already loading
                setExampleClicked(true);
                setUrl(
                  "https://www.tiktok.com/@zifev44/video/7511539066303794454",
                );
                // Submit the form programmatically after setting the URL
                setTimeout(() => {
                  const form = document.querySelector("form");
                  if (form)
                    form.dispatchEvent(
                      new Event("submit", { cancelable: true, bubbles: true }),
                    );
                }, 100);
              }}
              disabled={isLoading || exampleClicked}
            >
              <span>
                {exampleClicked ? "Loading example..." : "@zifev44's TikTok"}
              </span>
              {exampleClicked ? (
                <span className={styles.exampleLinkSpinner}></span>
              ) : (
                <span className={styles.exampleLinkIcon}>→</span>
              )}
            </button>
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {isLoading && (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}></div>
            <p>Fetching TikTok video data...</p>
          </div>
        )}

        {tiktokData && (
          <div className={styles.resultContainer}>
            <div className={styles.videoContainer}>
              <video
                src={tiktokData.video}
                poster={tiktokData.thumbnail}
                controls
                autoPlay
                className={styles.video}
              />
            </div>
            <div className={styles.infoContainer}>
              <h2 className={styles.username}>{tiktokData.username}</h2>
              <p className={styles.description}>{tiktokData.description}</p>
              <a
                href={tiktokData.downloadUrl}
                download="tiktok_video.mp4"
                className={styles.downloadButton}
                onClick={handleVideoDownload}
              >
                Download Video
              </a>
              <div className={styles.fileInfo}>
                <p>
                  Video saved at:{" "}
                  <code>
                    /tiktok/{tiktokData.video.split("/").slice(-2)[0]}/video.mp4
                  </code>
                </p>
              </div>

              {showThumbnailPreview && tiktokData.thumbnail && (
                <div className={styles.thumbnailPreviewContainer}>
                  <h3>Video Thumbnail</h3>{" "}
                  <div
                    className={styles.thumbnailWrapper}
                    onClick={() => setEnlargedThumbnail(!enlargedThumbnail)}
                  >
                    <Image
                      src={tiktokData.thumbnail}
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
                  <div className={styles.thumbnailInfo}>
                    <p>
                      Thumbnail saved at:{" "}
                      <code>
                        /tiktok/{tiktokData.thumbnail.split("/").slice(-2)[0]}
                        /thumbnail.jpg
                      </code>
                    </p>
                  </div>
                  <div className={styles.thumbnailActions}>
                    <a
                      href={tiktokData.thumbnail}
                      download="tiktok_thumbnail.jpg"
                      className={styles.thumbnailDownloadButton}
                      onClick={handleThumbnailDownload}
                    >
                      Download Thumbnail
                    </a>
                  </div>
                </div>
              )}

              {enlargedThumbnail && tiktokData.thumbnail && (
                <div
                  className={styles.enlargedThumbnailContainer}
                  onClick={() => setEnlargedThumbnail(false)}
                >
                  <div className={styles.enlargedThumbnailWrapper}>
                    <Image
                      src={tiktokData.thumbnail}
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
