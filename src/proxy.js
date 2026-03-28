import { NextResponse } from "next/server";

export function proxy(request) {
  // Pass through everything for now to debug login loop
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
