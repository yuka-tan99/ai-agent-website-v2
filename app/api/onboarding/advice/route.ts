import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type AdviceRequestBody = {
  usedIds?: Array<number | string>;
};

type ChunkRow = {
  id: number;
  content: string | null;
  chunk_idx: number | null;
};

const ADVICE_DOCUMENT_TITLE =
  "Social Media Marketing Mastery_ 500+ Strategic Tips - Comprehensive Summary";

const ADVICE_LIMIT = 750;

const formatAdviceText = (raw: string): string => {
  const cleaned = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!cleaned.length) {
    return raw.trim();
  }

  let candidate = cleaned[0];

  if (candidate.length > 360) {
    const sentenceSplit = candidate.split(/(?<=[.!?])\s+/);
    if (sentenceSplit.length > 1) {
      const acc: string[] = [];
      for (const part of sentenceSplit) {
        acc.push(part);
        if (acc.join(" ").length > 280) break;
      }
      candidate = acc.join(" ").trim();
    } else {
      candidate = candidate.slice(0, 320).trimEnd();
    }
  }

  return candidate.replace(/^[-–•\d.\)]+/, "").trim();
};

export async function POST(req: NextRequest) {
  let body: AdviceRequestBody = {};
  try {
    body = await req.json();
  } catch (error) {
    console.warn("[onboarding advice] invalid request body", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const usedIds = Array.isArray(body.usedIds)
    ? body.usedIds
        .map((entry) => {
          const parsed = Number(entry);
          return Number.isFinite(parsed) ? parsed : null;
        })
        .filter((entry): entry is number => entry !== null)
    : [];

  const supabase = supabaseAdmin();
  console.log("[onboarding advice] request received", {
    usedIds,
    count: usedIds.length,
  });

  const { data: documentRow, error: docError } = await supabase
    .from("kb_documents")
    .select("id")
    .ilike("title", `${ADVICE_DOCUMENT_TITLE}%`)
    .maybeSingle();

  if (docError) {
    console.error("[onboarding advice] failed to find document", docError);
    return NextResponse.json(
      { error: "Unable to load advice source" },
      { status: 500 },
    );
  }

  if (!documentRow?.id) {
    return NextResponse.json(
      { error: "Advice document not available" },
      { status: 404 },
    );
  }
  console.log("[onboarding advice] matched document", {
    documentId: documentRow.id,
  });

  const query = supabase
    .from("kb_chunks")
    .select("id, content, chunk_idx")
    .eq("document_id", documentRow.id)
    .limit(ADVICE_LIMIT);

  const { data: chunkRows, error: chunkError } = await query;

  if (chunkError) {
    console.error("[onboarding advice] failed to fetch chunks", chunkError);
    return NextResponse.json(
      { error: "Unable to load advice" },
      { status: 500 },
    );
  }

  const available = (chunkRows as ChunkRow[] | null)?.filter((row) => {
    if (!row?.content?.trim()) return false;
    if (usedIds.length && row?.id !== null) {
      return !usedIds.includes(row.id);
    }
    return true;
  });

  if (!available || !available.length) {
    console.warn("[onboarding advice] no available chunks", {
      total: chunkRows?.length ?? 0,
      usedIds,
    });
    return NextResponse.json(
      { error: "No additional advice available" },
      { status: 404 },
    );
  }

  const choice =
    available[Math.floor(Math.random() * available.length)];

  console.log("[onboarding advice] serving chunk", {
    chunkId: choice.id,
    index: choice.chunk_idx,
  });

  const advice = {
    id: choice.id,
    text: formatAdviceText(choice.content ?? ""),
  };

  return NextResponse.json(advice);
}
