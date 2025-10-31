import { NextRequest, NextResponse } from "next/server";

import { supabaseRoute } from "@/lib/supabase/route";
import { supabaseAdmin } from "@/lib/supabase/server";

type WeeklyUsagePayload = {
  week: string;
  reportViews: number;
  aiMessages: number;
};

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 7 * 26;

export async function GET(req: NextRequest) {
  const route = supabaseRoute(req);
  const { data: authData } = await route.getUser();
  const user = authData?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const sinceDate = new Date(Date.now() - SIX_MONTHS_MS);
  const sinceIso = sinceDate.toISOString();

  const [
    { data: reportRows, error: reportError },
    { data: chatRows, error: chatError },
  ] = await Promise.all([
    supabase
      .from("report_usage_events")
      .select("occurred_at")
      .eq("user_id", user.id)
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: true }),
    supabase
      .from("chat_usage_events")
      .select("occurred_at,prompt_count")
      .eq("user_id", user.id)
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: true }),
  ]);

  if (reportError) {
    console.error("[usage-weekly] report query failed", reportError);
    return NextResponse.json(
      { error: "Failed to load usage data" },
      { status: 500 },
    );
  }

  if (chatError) {
    console.error("[usage-weekly] chat query failed", chatError);
    return NextResponse.json(
      { error: "Failed to load usage data" },
      { status: 500 },
    );
  }

  const seriesMap = new Map<string, WeeklyUsagePayload>();

  const startOfIsoWeek = (value: string | null | undefined) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utcDate.getUTCDay();
    const diff = (day + 6) % 7;
    utcDate.setUTCDate(utcDate.getUTCDate() - diff);
    return utcDate.toISOString();
  };

  const upsertRow = (weekKey: string) => {
    if (!seriesMap.has(weekKey)) {
      seriesMap.set(weekKey, {
        week: weekKey,
        reportViews: 0,
        aiMessages: 0,
      });
    }
    return seriesMap.get(weekKey)!;
  };

  (reportRows ?? []).forEach((row) => {
    const weekKey = startOfIsoWeek((row as { occurred_at: string | null }).occurred_at);
    if (!weekKey) return;
    const entry = upsertRow(weekKey);
    entry.reportViews += 1;
  });

  (chatRows ?? []).forEach((row) => {
    const weekKey = startOfIsoWeek((row as { occurred_at: string | null }).occurred_at);
    if (!weekKey) return;
    const entry = upsertRow(weekKey);
    const promptCount =
      typeof (row as { prompt_count?: number | null }).prompt_count === "number"
        ? Math.max(0, (row as { prompt_count?: number | null }).prompt_count ?? 0)
        : 0;
    entry.aiMessages += promptCount;
  });

  const series = Array.from(seriesMap.values()).sort(
    (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
  );

  const totals = series.reduce(
    (acc, item) => {
      acc.reportViews += item.reportViews;
      acc.aiMessages += item.aiMessages;
      return acc;
    },
    { reportViews: 0, aiMessages: 0 },
  );

  return NextResponse.json({
    series,
    totals,
  });
}
