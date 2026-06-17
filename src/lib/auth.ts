import { NextRequest } from "next/server";
import crypto from "crypto";

export interface SessionUser {
  id: number;
  battletag: string;
}

export function getSession(request: NextRequest): SessionUser | null {
  const cookie = request.cookies.get("pullprep_session");
  if (!cookie || !cookie.value) return null;

  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET || "fallback_secret";

  try {
    const parts = cookie.value.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const hmac = crypto.createHmac("sha256", clientSecret);
    hmac.update(payload);
    
    if (hmac.digest("hex") === signature) {
      const decoded = Buffer.from(payload, "base64").toString("utf-8");
      return JSON.parse(decoded);
    }
  } catch (e) {
    console.error("Failed to decode session cookie", e);
  }

  return null;
}
