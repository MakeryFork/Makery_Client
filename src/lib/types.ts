export type OAuthProvider = "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "TIKTOK";

export interface SocialAccount {
  provider: OAuthProvider;
}

export interface UserProfile {
  id: number;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt?: string;
  socialAccounts: SocialAccount[];
  _count: { posts: number; followers: number; following: number };
  isFollowing: boolean;
}

export interface Tag {
  id: number;
  name: string;
}

export interface PostDetail {
  id: number;
  sortOrder: number;
  content: string;
}

export interface Post {
  id: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  price: number;
  viewCount: number;
  videoProjectId: number | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    profileImageUrl: string | null;
    socialAccounts: SocialAccount[];
  };
  postDetails: PostDetail[];
  postTags: { tag: Tag }[];
  _count: { purchases: number };
}

export interface BuyerContent {
  title: string;
  markdownContent: string;
}

export interface Purchase {
  id: number;
  price: number;
  paymentStatus: "PENDING" | "DONE" | "FAILED";
  purchasedAt: string | null;
  post: Post;
}

export interface PurchaseOrder {
  id: number;
  buyerId: number;
  postId: number;
  price: number;
  orderId: string;
  paymentStatus: "PENDING";
  createdAt: string;
}

export interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  speed: number;
  aspectRatio: string;
  muted: boolean;
  split?: { time: number }[];
  audio?: { volume: number; fadeIn: number; fadeOut: number };
  animations?: {
    type: string;
    startTime: number;
    endTime: number;
    properties: Record<string, unknown>;
  }[];
}

export interface EditorEffectData {
  clipId: string;
  filter: string;
  rotate: number;
  flipH: boolean;
  flipV: boolean;
}

export interface EditorTextData {
  id: string;
  text: string;
  x: number;
  y: number;
  startTime: number;
  endTime: number;
}

export interface EditorAudioData {
  id: string;
  name: string;
  url?: string;
  startTime: number;
  endTime: number;
}

export interface VideoProject {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
  editData: {
    clips: VideoClip[];
    effects?: EditorEffectData[];
    texts?: EditorTextData[];
    audios?: EditorAudioData[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseSource {
  type: "effect" | "audio" | "animation";
  effectType?: string;
  startTime: number;
  endTime: number;
  properties: Record<string, unknown>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
