import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuditLogsTable from "@/components/audit-logs-table";
import { BackButton } from "@/components/back-button";

export const metadata = {
    title: "Audit Logs | Efficiency",
};

export default async function AuditLogsPage(props) {
    const searchParams = await props.searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check superadmin status
    const { data: userData } = await supabase
        .from("users_new")
        .select("is_super_admin")
        .eq("id", user.id)
        .single();

    if (!userData?.is_super_admin) {
        redirect("/");
    }

    // Parse pagination and filters
    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 20;
    const offset = (page - 1) * limit;

    // Build main query
    let query = supabase
        .from("audit_logs")
        .select(`
            *,
            users:user_id (email, name),
            issuers:issuer_id (issuer_name)
        `, { count: "exact" });

    // Apply filters
    if (searchParams.action && searchParams.action !== "all") {
        query = query.eq("action", searchParams.action);
    }
    if (searchParams.entity_type && searchParams.entity_type !== "all") {
        query = query.eq("entity_type", searchParams.entity_type);
    }
    if (searchParams.issuer_id && searchParams.issuer_id !== "all") {
        query = query.eq("issuer_id", searchParams.issuer_id);
    }
    if (searchParams.user_id && searchParams.user_id !== "all") {
        query = query.eq("user_id", searchParams.user_id);
    }

    // Date range filters
    if (searchParams.from) {
        query = query.gte("created_at", `${searchParams.from}T00:00:00`);
    }
    if (searchParams.to) {
        query = query.lte("created_at", `${searchParams.to}T23:59:59`);
    }

    // Sorting
    const sortField = searchParams.sort || "created_at";
    const sortDir = searchParams.dir === "asc" ? true : false;
    query = query.order(sortField, { ascending: sortDir });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;

    if (error) {
        console.error("Error fetching audit logs:", error);
    }

    // Fetch stats - total counts by action type
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get total count
    const { count: totalCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });

    // Get today's count
    const { count: todayCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayISO);

    // Get counts by action type for stats
    const { data: actionStats } = await supabase
        .from("audit_logs")
        .select("action");

    // Aggregate action counts
    const actionCounts = {};
    if (actionStats) {
        actionStats.forEach(log => {
            const actionType = log.action?.includes("CREATE") ? "create" :
                              log.action?.includes("UPDATE") ? "update" :
                              log.action?.includes("DELETE") ? "delete" : "other";
            actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
        });
    }

    const stats = {
        total: totalCount || 0,
        today: todayCount || 0,
        creates: actionCounts.create || 0,
        updates: actionCounts.update || 0,
        deletes: actionCounts.delete || 0,
    };

    // Fetch issuers for filter
    const { data: issuers } = await supabase
        .from("issuers_new")
        .select("id, issuer_name")
        .order("issuer_name");

    // Fetch users for filter
    const { data: users } = await supabase
        .from("users_new")
        .select("id, name, email")
        .order("name");

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <BackButton />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">System Audit Logs</h1>
                    <p className="text-muted-foreground mt-1">
                        Comprehensive record of all business-critical actions and system modifications.
                    </p>
                </div>
            </div>

            <AuditLogsTable
                logs={logs || []}
                count={count || 0}
                page={page}
                limit={limit}
                issuers={issuers || []}
                users={users || []}
                stats={stats}
            />
        </div>
    );
}
