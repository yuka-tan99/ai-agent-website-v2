// lib/social/types.ts
export type SocialPlatform =
  | "YouTube"
  | "Instagram"
  | "TikTok"
  | "Twitter/X"
  | "LinkedIn"
  | "Facebook"
  | "Pinterest"
  | "Twitch";

export type NormalizedPost = {
  id: string;
  url?: string;
  published_at?: string; // ISO
  title?: string;
  caption?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  duration_sec?: number; // if video
};

export type ProfileSummary = {
  platform: SocialPlatform;
  handle: string;        // '@name' canonicalized
  display_name?: string;
  url?: string;
  bio?: string;
  followers?: number;
  posts_sampled: number;
  posts: NormalizedPost[]; // last 10–20 normalized
  public: boolean;         // must be true to use
};

export interface SocialProvider {
  platform: SocialPlatform;
  canUse(): boolean; // based on env keys
  fetchProfile(handle: string, maxPosts: number): Promise<ProfileSummary>;
}