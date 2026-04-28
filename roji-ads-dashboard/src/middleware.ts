/**
 * Roji Ads Dashboard — basic-auth gate.
 *
 * Placeholder access control until proper OAuth is added. Reads
 * ADMIN_USER / ADMIN_PASS from env. Disabled when ADMIN_PASS is empty
 * (so local dev doesn't require it by default).
 */

import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER ?? "";
  const pass = process.env.ADMIN_PASS ?? "";

  if (!pass) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const sepIdx = decoded.indexOf(":");
        const u = decoded.slice(0, sepIdx);
        const p = decoded.slice(sepIdx + 1);
        if (u === user && p === pass) {
          return NextResponse.next();
        }
      } catch {
        // fall through to 401
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Roji Ads Dashboard"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
