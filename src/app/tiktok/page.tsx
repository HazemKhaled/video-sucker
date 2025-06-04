import VideoDownloader, {
  type ExampleLink,
} from "@/components/shared/VideoDownloader";

const examples: ExampleLink[] = [
  {
    url: "https://www.tiktok.com/@azo_aljaer/video/7290073611744955653",
    label: "@khaby.lame's viral TikTok",
  },
  {
    url: "https://www.tiktok.com/@zifev44/video/7511539066303794454",
    label: "@zifev44's TikTok",
  },
];

export default function TikTokPage() {
  return (
    <VideoDownloader
      platform="tiktok"
      title="TikTok Video Downloader"
      placeholder="Enter TikTok URL (e.g., https://www.tiktok.com/@username/video/1234567890)"
      apiEndpoint="/api/tiktok"
      examples={examples}
      primaryColor="#fe2c55"
    />
  );
}
