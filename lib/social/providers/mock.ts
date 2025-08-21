// lib/social/providers/mock.ts
import type { SocialProvider, ProfileSummary } from "../types";

export class MockProvider implements SocialProvider {
  platform: any;
  constructor(platform: any) { this.platform = platform; }
  canUse() { return true; }
  async fetchProfile(handle: string, maxPosts: number): Promise<ProfileSummary> {
    const h = handle.startsWith("@") ? handle : `@${handle}`;
    return {
      platform: this.platform,
      handle: h,
      display_name: h.slice(1),
      url: `https://example.com/${h.slice(1)}`,
      bio: "Mock profile for development.",
      followers: 1234,
      public: true,
      posts_sampled: Math.min(maxPosts, 10),
      posts: Array.from({ length: Math.min(maxPosts, 10) }).map((_, i) => ({
        id: `post_${i+1}`,
        title: `Sample ${this.platform} post ${i+1}`,
        views: 1000 + i * 100,
        likes: 100 + i * 10,
        comments: 5 + i,
        shares: 2 + Math.floor(i/2),
        published_at: new Date(Date.now() - i * 864e5).toISOString(),
      })),
    };
  }
}