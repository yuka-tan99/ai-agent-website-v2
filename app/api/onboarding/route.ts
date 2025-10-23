import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type OnboardingRequestBody = {
  userId?: string | null;
  sessionId?: string | null;
  answers?: Record<string, unknown>;
  links?: unknown[];
};

export async function POST(req: NextRequest) {
  let body: OnboardingRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    console.error("Failed to parse onboarding request", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();
  const now = new Date().toISOString();
  const answers = body.answers ?? {};
  const links = body.links ?? [];

  if (body.userId) {
    let sessionAnswers: Record<string, unknown> = {};
    let sessionLinks: unknown[] = [];

    if (body.sessionId) {
      const { data: sessionRow } = await admin
        .from("onboarding_sessions")
        .select("answers, links")
        .eq("id", body.sessionId)
        .maybeSingle();

      sessionAnswers =
        (sessionRow?.answers as Record<string, unknown> | undefined) ?? {};
      sessionLinks = (sessionRow?.links as unknown[] | undefined) ?? [];
    }

    const { data: existingRow } = await admin
      .from("onboarding_sessions")
      .select("id, answers, links")
      .eq("user_id", body.userId)
      .maybeSingle();

    const mergedAnswers = {
      ...(existingRow?.answers as Record<string, unknown> | undefined ?? {}),
      ...sessionAnswers,
      ...answers,
    };

    const mergedLinks = links.length
      ? links
      : sessionLinks.length
      ? sessionLinks
      : (existingRow?.links as unknown[] | undefined) ?? [];

    let resultId: string | undefined;

    if (existingRow?.id) {
      const { data, error } = await admin
        .from("onboarding_sessions")
        .update({
          answers: mergedAnswers,
          links: mergedLinks,
          updated_at: now,
        })
        .eq("id", existingRow.id)
        .select("id, user_id")
        .single();

      if (error) {
        console.error("Failed to update onboarding session", error);
        return NextResponse.json(
          { error: "Unable to save onboarding answers" },
          { status: 500 },
        );
      }
      resultId = data.id;
    } else {
      const { data, error } = await admin
        .from("onboarding_sessions")
        .insert({
          user_id: body.userId,
          answers: mergedAnswers,
          links: mergedLinks,
          updated_at: now,
        })
        .select("id, user_id")
        .single();

      if (error) {
        console.error("Failed to insert onboarding session", error);
        return NextResponse.json(
          { error: "Unable to save onboarding answers" },
          { status: 500 },
        );
      }
      resultId = data.id;
    }

    if (body.sessionId) {
      await admin.from("onboarding_sessions").delete().eq("id", body.sessionId);
    }

    return NextResponse.json({
      id: resultId,
      userId: body.userId,
    });
  }

  if (body.sessionId) {
    const { data, error } = await admin
      .from("onboarding_sessions")
      .upsert(
        {
          id: body.sessionId,
          answers,
          links,
          updated_at: now,
        },
        { onConflict: "id" },
      )
      .select("id, user_id")
      .single();

    if (error) {
      console.error(
        "Failed to upsert anonymous onboarding session",
        error,
      );
      return NextResponse.json(
        { error: "Unable to save onboarding answers" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
    });
  }

  const { data, error } = await admin
    .from("onboarding_sessions")
    .insert({
      answers,
      links,
      updated_at: now,
    })
    .select("id, user_id")
    .single();

  if (error) {
    console.error("Failed to insert anonymous onboarding session", error);
    return NextResponse.json(
      { error: "Unable to save onboarding answers" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    userId: data.user_id,
  });
}
