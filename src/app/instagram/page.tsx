"use client";

import { useState, useRef, FormEvent } from "react";
import Link from "next/link";
import styles from "./instagram.module.css";

interface MediaItem {
  type: "video";
  url: string;
  thumbnailUrl?: string;
}

interface InstagramData {
  reelId: string;
  username: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  mediaItems: MediaItem[];
  savedFiles?: {
    mediaPath: string;
    thumbnailPath?: string;
  }[];
}

export default function InstagramPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InstagramData | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Example URLs for user to try
  const exampleURLs = [
    "https://www.instagram.com/reel/DGOIwPlq45w/",
    "https://www.instagram.com/reel/C0rkA5lLY-c/",
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!url) return;

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/instagram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to download Instagram reel");
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleUrl: string) => {
    setUrl(exampleUrl);
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Instagram Reel Downloader</h1>
        <Link href="/" className={styles.backLink}>
          &larr; Back to Home
        </Link>
      </header>

      <main className={styles.main}>
        <form className={styles.form} onSubmit={handleSubmit} ref={formRef}>
          <input
            type="text"
            className={styles.input}
            placeholder="Paste Instagram reel URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || !url}
          >
            {isLoading ? "Processing..." : "Download"}
          </button>
        </form>

        <div className={styles.instructions}>
          <p>
            Paste the URL of an Instagram reel you want to download. Only reel
            URLs are supported.
          </p>
          <div className={styles.exampleContainer}>
            <span>Try with examples:</span>
            {exampleURLs.map((exampleUrl, index) => (
              <button
                key={index}
                className={styles.exampleLink}
                onClick={() => handleExampleClick(exampleUrl)}
                disabled={isLoading}
              >
                Example {index + 1}
                <span className={styles.exampleLinkIcon}>→</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className={styles.loaderContainer}>
            <div className={styles.loader}></div>
            <p>Downloading reel from Instagram...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorWithHelp}>
            <p>{error}</p>
            <div className={styles.errorHelp}>
              <p>This might be happening because:</p>
              <ul className={styles.errorReasons}>
                <li>The reel is private or has been deleted</li>
                <li>Instagram has temporarily blocked access</li>
                <li>The URL format is incorrect</li>
              </ul>
            </div>
          </div>
        )}

        {data && (
          <div className={styles.resultContainer}>
            <div className={styles.mediaContainer}>
              {data.mediaItems[0].type === "video" && (
                <video
                  className={styles.video}
                  controls
                  src={data.mediaItems[0].url}
                  poster={data.mediaItems[0].thumbnailUrl}
                ></video>
              )}
            </div>

            <div className={styles.infoContainer}>
              <h2 className={styles.username}>{data.username}</h2>

              {data.caption && (
                <p className={styles.description}>{data.caption}</p>
              )}

              <div className={styles.stats}>
                {data.likesCount !== undefined && (
                  <div className={styles.stat}>
                    ❤️ {data.likesCount.toLocaleString()} likes
                  </div>
                )}

                {data.commentsCount !== undefined && (
                  <div className={styles.stat}>
                    💬 {data.commentsCount.toLocaleString()} comments
                  </div>
                )}
              </div>

              <div className={styles.downloadButtons}>
                {data.mediaItems.map((media, index) => (
                  <a
                    key={index}
                    className={styles.downloadButton}
                    href={media.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Video
                  </a>
                ))}
              </div>

              {data.savedFiles && data.savedFiles.length > 0 && (
                <div className={styles.fileInfo}>
                  <p>Files saved to public directory:</p>
                  <ul>
                    {data.savedFiles.map((file, index) => (
                      <li key={index}>
                        <code>{file.mediaPath.split("/").pop()}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
