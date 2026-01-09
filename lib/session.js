"use server";

import { cookies } from "next/headers";

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24, // 24 hours
  path: "/",
};

const SESSION_COOKIE_NAME = "user_session_data";

/**
 * Store auth session data in cookies
 * This reduces the need to query the database on every page load
 */
export async function setSessionData(sessionData) {
  try {
    const cookieStore = await cookies();
    const serialized = JSON.stringify({
      userRole: sessionData.userRole,
      issuers: sessionData.issuers || [],
      isSuperAdmin: sessionData.isSuperAdmin || false,
      timestamp: Date.now(),
    });

    cookieStore.set(SESSION_COOKIE_NAME, serialized, COOKIE_OPTIONS);
    return { success: true };
  } catch (error) {
    console.error("Error setting session data:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get auth session data from cookies
 * Returns null if expired or invalid
 */
export async function getSessionData() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);

    // Check if session is older than 24 hours
    const age = Date.now() - sessionData.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms

    if (age > maxAge) {
      console.log("[SESSION] Session expired, clearing...");
      await clearSessionData();
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error("Error reading session data:", error);
    return null;
  }
}

/**
 * Clear session data from cookies
 */
export async function clearSessionData() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return { success: true };
  } catch (error) {
    console.error("Error clearing session data:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if session data exists and is valid
 */
export async function hasValidSession() {
  const sessionData = await getSessionData();
  return sessionData !== null;
}

/**
 * Update specific fields in session without fetching from DB
 */
export async function updateSessionData(updates) {
  try {
    const currentData = await getSessionData();
    if (!currentData) {
      return { success: false, error: "No session found" };
    }

    const updatedData = {
      ...currentData,
      ...updates,
      timestamp: Date.now(), // Refresh timestamp
    };

    return await setSessionData(updatedData);
  } catch (error) {
    console.error("Error updating session data:", error);
    return { success: false, error: error.message };
  }
}
