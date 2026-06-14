import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Blizzard Client ID is not configured" }, { status: 500 });
  }

  // Read proxy headers to determine public origin (since container hostname binds to 0.0.0.0)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "www.pullprep.com";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/callback`;

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");

  // We request openid scope to get their account id and battletag
  const url = new URL("https://oauth.battle.net/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());
  
  // Set temporary state cookie for validation in callback
  response.cookies.set("pullprep_auth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
