import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { LocalDb } from "@/lib/db";

// GET: Retrieve progress history for active user
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await LocalDb.getUserProgressHistory(session.id, 10);
    const slowestKeys = await LocalDb.getUserSlowestKeybinds(session.id);
    return NextResponse.json({ success: true, history, slowestKeys });
  } catch (error: any) {
    console.error("Failed to fetch user progress history", error);
    return NextResponse.json({ error: "Failed to fetch progress history", message: error.message }, { status: 500 });
  }
}

// POST: Save completed training session stats
export async function POST(request: NextRequest) {
  const session = getSession(request);
  const userId = session ? session.id : null;

  try {
    const body = await request.json();
    const {
      class: className,
      spec: specName,
      drillType,
      duration,
      accuracy,
      avgReaction,
      grade,
      slowestKeys,
      peripheralScore
    } = body;

    if (!className || !specName || !drillType) {
      return NextResponse.json({ error: "Missing required session parameters" }, { status: 400 });
    }

    const saved = await LocalDb.saveDrillSession(
      userId,
      className,
      specName,
      drillType,
      duration || 0,
      accuracy || 0,
      avgReaction || 0,
      grade || "F",
      slowestKeys || [],
      peripheralScore || 0
    );

    return NextResponse.json({ success: saved });
  } catch (error: any) {
    console.error("Failed to save drill session", error);
    return NextResponse.json({ error: "Failed to save session", message: error.message }, { status: 500 });
  }
}
