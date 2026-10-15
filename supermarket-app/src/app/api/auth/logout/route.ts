import { NextResponse } from "next/server";
import { AUTH_COOKIE_OPTIONS, getServerSession, logAuthEvent } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession();
  if (session) {
    await logAuthEvent({
      event: "LOGOUT",
      employee_id: session.employee_id,
      email: session.email,
      role: session.role,
    });
  }
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.set({
    name: AUTH_COOKIE_OPTIONS.name,
    value: "",
    path: AUTH_COOKIE_OPTIONS.path,
    httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
    secure: AUTH_COOKIE_OPTIONS.secure,
    sameSite: AUTH_COOKIE_OPTIONS.sameSite,
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET() {
  // Support GET redirect or confirmation
  return POST();
}
