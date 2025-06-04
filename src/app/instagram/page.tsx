import VideoDownloader, {
  type ExampleLink,
} from "@/components/shared/VideoDownloader";

const examples: ExampleLink[] = [
  {
    url: "https://www.instagram.com/reel/DGOIwPlq45w/",
    label: "Example Reel 1",
  },
  {
    url: "https://www.instagram.com/reel/C0rkA5lLY-c/",
    label: "Example Reel 2",
  },
];

export default function InstagramPage() {
  return (
    <VideoDownloader
      platform="instagram"
      title="Instagram Reel Downloader"
      placeholder="Paste Instagram reel URL here..."
      apiEndpoint="/api/instagram"
      examples={examples}
      primaryColor="#e4405f"
    />
  );
}
