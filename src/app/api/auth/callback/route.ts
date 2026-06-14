import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { LocalDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Client credentials not configured" }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed", errText);
      return NextResponse.json({ error: "Token exchange failed", details: errText }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user information (BattleTag & Account ID)
    const userInfoResponse = await fetch("https://oauth.battle.net/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errText = await userInfoResponse.text();
      console.error("Userinfo query failed", errText);
      return NextResponse.json({ error: "Failed to fetch user info", details: errText }, { status: 400 });
    }

    const userData = await userInfoResponse.json();
    const userId = userData.id; // unique Battle.net numeric ID
    const battletag = userData.battletag;

    // 3. Save to local database
    LocalDb.saveUser(userId, battletag);

    // 4. Create signed session cookie payload
    const sessionData = { id: userId, battletag };
    const payload = Buffer.from(JSON.stringify(sessionData)).toString("base64");
    const hmac = crypto.createHmac("sha256", clientSecret);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    const cookieValue = `${payload}.${signature}`;

    // 5. Build response and attach cookie
    const response = NextResponse.redirect(`${origin}/dashboard`);
    
    // Set cookie options
    response.cookies.set("pullprep_session", cookieValue, {
      httpOnly: true,
      secure: origin.startsWith("https"),
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Authentication error", error);
    return NextResponse.json({ error: "Authentication failed", message: error.message }, { status: 500 });
  }
}
