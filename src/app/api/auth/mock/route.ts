import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { LocalDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET || "fallback_secret";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "www.pullprep.com";
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  const origin = process.env.SITE_URL || `${proto}://${host}`;

  const userId = 1337;
  const battletag = "Developer#1337";

  // 1. Save to local database
  await LocalDb.saveUser(userId, battletag);

  // 2. Create signed session cookie payload
  const sessionData = { id: userId, battletag };
  const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64");
  const hmac = crypto.createHmac("sha256", clientSecret);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  const cookieValue = `${payload}.${signature}`;

  // 3. Build response and attach cookie
  const response = NextResponse.redirect(`${origin}/dashboard`);
  
  response.cookies.set("pullprep_session", cookieValue, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  return response;
}
