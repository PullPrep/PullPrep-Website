import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { LocalDb } from "@/lib/db";

// GET: Retrieve all loadouts for the logged-in user
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const loadouts = LocalDb.getLoadouts(session.id);
    return NextResponse.json({ loadouts });
  } catch (error: any) {
    console.error("Failed to fetch loadouts", error);
    return NextResponse.json({ error: "Failed to fetch loadouts", message: error.message }, { status: 500 });
  }
}

// POST: Save a new character loadout
export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, data } = body;

    if (!name || !data) {
      return NextResponse.json({ error: "Missing loadout name or configuration data" }, { status: 400 });
    }

    // Decode base64 configuration to extract character metadata
    let className = "Unknown";
    let specName = "Unknown";
    try {
      const rawJson = Buffer.from(data, "base64").toString("utf-8");
      const build = JSON.parse(rawJson);
      if (build.class) className = build.class;
      if (build.spec) specName = build.spec;
    } catch (e) {
      return NextResponse.json({ error: "Invalid action bar configuration string" }, { status: 400 });
    }

    const loadout = LocalDb.addLoadout(session.id, name.trim(), className, specName, data);
    return NextResponse.json({ success: true, loadout });
  } catch (error: any) {
    console.error("Failed to save loadout", error);
    return NextResponse.json({ error: "Failed to save loadout", message: error.message }, { status: 500 });
  }
}
