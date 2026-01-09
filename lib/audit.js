import { createClient } from "./supabase/server";
import { headers } from "next/headers";

/**
 * Logs an audit event to the database.
 * 
 * @param {Object} params - The audit parameters.
 * @param {string} params.action - The action performed (e.g., 'LOGIN', 'CREATE_ISSUER').
 * @param {string} params.entityType - The type of entity acting upon (e.g., 'auth', 'issuer', 'transaction').
 * @param {string} params.entityId - The ID of the entity.
 * @param {Object} [params.details={}] - Additional details (before/after state, etc.).
 * @param {string} [params.issuerId] - The associated issuer ID (if applicable).
 * @param {string} [params.userId] - The user ID performing the action (optional, defaults to current user).
 */
export async function logAudit({
    action,
    entityType,
    entityId,
    details = {},
    issuerId = null,
    userId = null,
}) {
    try {
        console.log(`[Audit] Attempting to log action: ${action} for entity: ${entityType}:${entityId}`);
        const supabase = await createClient();

        // If userId is not provided, try to get it from the session
        let actorId = userId;
        if (!actorId) {
            const { data: { user } } = await supabase.auth.getUser();
            actorId = user?.id;
        }

        if (!actorId) {
            console.warn("[Audit] Warning: Audit log attempted without a valid user ID/Session.");
        }

        // Capture request context
        const headerPayload = await headers();
        const ipAddress = headerPayload.get("x-forwarded-for") || "unknown";
        const userAgent = headerPayload.get("user-agent") || "unknown";

        const logData = {
            user_id: actorId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            details,
            issuer_id: issuerId,
            ip_address: ipAddress,
            user_agent: userAgent,
        };

        const { data, error } = await supabase.from("audit_logs").insert(logData).select();

        if (error) {
            console.error("[Audit] Failed to write audit log:", error);
        } else {
            console.log("[Audit] Successfully wrote log:", data?.[0]?.id);
        }
    } catch (err) {
        console.error("[Audit] Error in logAudit function:", err);
    }
}
