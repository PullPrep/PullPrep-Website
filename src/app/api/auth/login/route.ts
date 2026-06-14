import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Blizzard Client ID is not configured" }, { status: 500 });
  }

  // Dynamically detect origin to support localhost, development IP, or production domain
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;

  // We request openid scope to get their account id and battletag
  const url = new URL("https://oauth.battle.net/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid");

  return NextResponse.redirect(url.toString());
}
