import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = getSession(request);
  
  if (session) {
    return NextResponse.json({ loggedIn: true, user: session });
  } else {
    return NextResponse.json({ loggedIn: false, user: null });
  }
}
