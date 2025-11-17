import { NextResponse } from "next/server";
import { getAuthData } from "@/lib/actions";

/**
 * GET /api/auth/session
 * Retrieves cached auth data (role + issuers) from session cookies
 * Query params:
 *   - refresh=true: Force refresh from database
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const authData = await getAuthData(forceRefresh);

    return NextResponse.json(authData, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[API] Error fetching auth session:", error);
    return NextResponse.json(
      {
        userRole: null,
        issuers: [],
        isSuperAdmin: false,
        fromCache: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
