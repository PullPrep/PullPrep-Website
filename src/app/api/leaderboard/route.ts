import { NextRequest, NextResponse } from "next/server";
import { LocalDb } from "@/lib/db";

// GET: Retrieve top high scores from past 7 days
export async function GET(request: NextRequest) {
  try {
    const leaderboard = await LocalDb.getWeeklyHighScores(10);
    return NextResponse.json({ success: true, leaderboard });
  } catch (error: any) {
    console.error("Failed to fetch leaderboard", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard", message: error.message }, { status: 500 });
  }
}
