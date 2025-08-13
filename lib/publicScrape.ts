// lib/publicScrape.ts
// Lightweight, no-API scraping helpers (server-side). Focuses on OG tags and
// a few platform-specific extras (best-effort, safe fallbacks).

const UA =
  "Mozilla/5.0 (compatible; CreatorCoachBot/1.0; +https://example.com/bot)";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.text();
}

function pick(re: RegExp, s: string) {
  return s.match(re)?.[1]?.trim();
}

function extractOG(html: string) {
  const get = (prop: string) =>
    pick(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"), html);
  const getName = (name: string) =>
    pick(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"), html);

  return {
    title: get("og:title") || getName("title") || "",
    description: get("og:description") || getName("description") || "",
    site: get("og:site_name") || "",
    image: get("og:image") || "",
  };
}

// --- YouTube helpers (best-effort) ---
function inferYouTubeChannelIdFromHTML(html: string) {
  // Look for `"channelId":"UCxxxx"`
  return pick(/"channelId":"(UC[0-9A-Za-z_-]{10,})"/, html);
}

async function fetchYouTubeRecent(url: string) {
  try {
    const html = await fetchText(url);
    const channelId = inferYouTubeChannelIdFromHTML(html);
    const items: { title: string; when?: string }[] = [];

    if (channelId) {
      // RSS feed without API: https://www.youtube.com/feeds/videos.xml?channel_id=UC...
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const feed = await fetchText(feedUrl);
      // naive parse last 5 <entry><title>... + <published>...
      const entries = Array.from(feed.matchAll(/<entry>[\s\S]*?<\/entry>/g)).slice(0, 5);
      for (const e of entries) {
        items.push({
          title: pick(/<title>([^<]+)<\/title>/, e[0]) || "",
          when: pick(/<published>([^<]+)<\/published>/, e[0]) || undefined,
        });
      }
    }

    return { platform: "youtube", items };
  } catch (e: any) {
    return { platform: "youtube", error: e.message };
  }
}

// --- TikTok (very best-effort; HTML often obfuscated) ---
async function fetchTikTokHints(url: string) {
  try {
    const html = await fetchText(url);
    // Pull OG + a few visible text hints for recency
    const og = extractOG(html);
    const countMatches = html.match(/"createTime":"(\d{10})"/g) || [];
    const lastCount = Math.min(countMatches.length, 5);
    return {
      platform: "tiktok",
      og,
      recentCountApprox: lastCount, // how many posts we could spot in HTML blob
    };
  } catch (e: any) {
    return { platform: "tiktok", error: e.message };
  }
}

// --- Instagram (private/JS heavy; stick to OG tags) ---
async function fetchInstagramHints(url: string) {
  try {
    const html = await fetchText(url);
    const og = extractOG(html);
    return { platform: "instagram", og };
  } catch (e: any) {
    return { platform: "instagram", error: e.message };
  }
}

// --- Twitter/X (OG tags + visible title/desc) ---
async function fetchTwitterHints(url: string) {
  try {
    const html = await fetchText(url);
    const og = extractOG(html);
    return { platform: "twitter/x", og };
  } catch (e: any) {
    return { platform: "twitter/x", error: e.message };
  }
}

// Generic fallback: OG tags only
async function fetchGeneric(url: string) {
  try {
    const html = await fetchText(url);
    const og = extractOG(html);
    return { platform: "generic", url, og };
  } catch (e: any) {
    return { platform: "generic", url, error: e.message };
  }
}

export async function collectSnapshots(urls: string[]) {
  const tasks = urls.map(async (u) => {
    const url = u.trim();
    const host = (() => {
      try { return new URL(url).host.toLowerCase(); } catch { return ""; }
    })();

    if (host.includes("youtube.com") || host.includes("youtu.be")) return fetchYouTubeRecent(url);
    if (host.includes("tiktok.com")) return fetchTikTokHints(url);
    if (host.includes("instagram.com")) return fetchInstagramHints(url);
    if (host.includes("x.com") || host.includes("twitter.com")) return fetchTwitterHints(url);
    // You can add: twitch, linkedin, pinterest, facebook (similar og-only fallbacks)
    return fetchGeneric(url);
  });

  return Promise.all(tasks);
}

export function summarizeSnapshots(snaps: any[]) {
  // Create a compact, model-friendly text block
  const lines: string[] = [];

  for (const s of snaps) {
    if (s.error) {
      lines.push(`• ${s.platform}: error fetching (${s.error})`);
      continue;
    }
    if (s.platform === "youtube") {
      const items = (s.items || []) as { title: string; when?: string }[];
      lines.push(`• YouTube: ${items.length ? `${items.length} recent videos` : "no recent videos found"}`);
      items.slice(0, 5).forEach((it) => {
        lines.push(`  - ${it.title}${it.when ? ` (${it.when})` : ""}`);
      });
      continue;
    }
    if (s.platform === "tiktok") {
      const ogDesc = s.og?.description ? ` — ${s.og.description}` : "";
      const approx = s.recentCountApprox ? `; ~${s.recentCountApprox} posts seen in page HTML` : "";
      lines.push(`• TikTok: ${s.og?.title || ""}${ogDesc}${approx}`);
      continue;
    }
    if (s.platform === "instagram") {
      lines.push(`• Instagram: ${s.og?.title || ""} — ${s.og?.description || ""}`);
      continue;
    }
    if (s.platform === "twitter/x") {
      lines.push(`• Twitter/X: ${s.og?.title || ""} — ${s.og?.description || ""}`);
      continue;
    }
    // generic
    lines.push(`• ${s.url} — ${s.og?.title || ""} — ${s.og?.description || ""}`);
  }

  return lines.join("\n");
}