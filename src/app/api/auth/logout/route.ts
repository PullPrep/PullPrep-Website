import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(`${origin}/dashboard`);
  
  // Clear the session cookie by setting its maxAge to 0
  response.cookies.set("pullprep_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}
