import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (token && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/boards/1753252978711594001", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
