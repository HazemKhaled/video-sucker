import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Video Sucker</h1>
      <p className={styles.description}>Download videos from popular social media platforms</p>
      
      <div className={styles.grid}>
        <Link href="/tiktok" className={styles.card}>
          <h2>TikTok &rarr;</h2>
          <p>Download videos from TikTok by pasting the URL.</p>
        </Link>
        
        <Link href="/instagram" className={styles.card}>
          <h2>Instagram &rarr;</h2>
          <p>Download videos and images from Instagram.</p>
        </Link>
      </div>
    </div>
  );
}
