import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export async function GET() {
  const supa = supabaseRoute();
  const { data: { user }, error } = await supa.auth.getUser();
  return NextResponse.json({ user, error });
}