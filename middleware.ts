import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PROTECTED_PATHS = ["/dashboard", "/api/invoices", "/api/cron"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("invoicetrack_session")?.value;

  if (!token || !verifyToken(token)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.delete("invoicetrack_session");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/api/invoices/:path*",
    "/api/cron/:path*",
  ],
};