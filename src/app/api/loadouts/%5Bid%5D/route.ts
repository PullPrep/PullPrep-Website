import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { LocalDb } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = LocalDb.deleteLoadout(id, session.id);

    if (deleted) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Loadout not found or not owned by you" }, { status: 404 });
    }
  } catch (error: any) {
    console.error("Failed to delete loadout", error);
    return NextResponse.json({ error: "Failed to delete loadout", message: error.message }, { status: 500 });
  }
}
