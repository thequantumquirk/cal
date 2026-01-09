import { NextResponse } from "next/server";
import { getCurrentUserRole, getUserIssuers } from "@/lib/actions";

/**
 * GET /api/auth/session
 * Retrieves auth data (role + issuers) from database
 * Query params:
 *   - refresh=true: (parameter accepted but not used, data is always fresh)
 */
export async function GET(request) {
  try {
    // Get user role and issuers from database
    const userRole = await getCurrentUserRole();
    const issuers = await getUserIssuers(userRole);

    const authData = {
      userRole,
      issuers,
      isSuperAdmin: userRole === "superadmin",
      fromCache: false,
    };

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
