// Instagram data interfaces for parser.ts
export interface InstagramMediaEdge {
  node: {
    is_video: boolean;
    video_url?: string;
    display_url: string;
  };
}

export interface InstagramMediaData {
  edge_media_preview_like?: {
    count: number;
  };
  edge_media_to_comment?: {
    count: number;
  };
  edge_sidecar_to_children?: {
    edges: InstagramMediaEdge[];
  };
}

export interface InstagramJsonData {
  entry_data?: {
    PostPage?: Array<{
      graphql?: {
        shortcode_media?: InstagramMediaData;
      };
    }>;
  };
}
