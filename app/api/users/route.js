import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getCurrentUserRole } from "@/lib/actions"

export async function GET(request) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const userRole = await getCurrentUserRole()

    // Get query params
    const { searchParams } = new URL(request.url)
    const issuerId = searchParams.get('issuerId')
    const includeInvited = searchParams.get('includeInvited') === 'true'
    const includeSuperAdmins = searchParams.get('includeSuperAdmins') === 'true'

    let users = []
    let invitedUsers = []
    let superAdmins = []

    // ADMIN LOGIC: Get users for specific issuer
    if (userRole === "admin" && issuerId) {
      // OPTIMIZED: Batch all queries in parallel using Promise.all
      const [issuerUserResult, rolesResult, usersResult] = await Promise.all([
        supabase
          .from("issuer_users_new")
          .select("user_id, role_id")
          .eq("issuer_id", issuerId),
        supabase
          .from("roles_new")
          .select("id, role_name, display_name"),
        supabase
          .from("users_new")
          .select("id, email, name, is_super_admin, is_owner, created_at")
      ])

      const issuerUserRecords = issuerUserResult.data
      const allRoles = rolesResult.data
      const allUsers = usersResult.data

      if (!issuerUserResult.error && issuerUserRecords && issuerUserRecords.length > 0) {
        // Filter users to only those in this issuer
        const userIds = new Set(issuerUserRecords.map(record => record.user_id))
        const filteredUsers = allUsers?.filter(u => userIds.has(u.id)) || []

        // Create Map for O(1) lookup
        const rolesMap = new Map(allRoles?.map(r => [r.id, r]) || [])
        const usersMap = new Map(filteredUsers.map(u => [u.id, u]))

        const issuerUsers = issuerUserRecords.map(record => ({
          user_id: record.user_id,
          role_id: record.role_id,
          users: usersMap.get(record.user_id),
          roles: rolesMap.get(record.role_id) ? {
            ...rolesMap.get(record.role_id),
            name: rolesMap.get(record.role_id).role_name
          } : null
        }))

        // Group by user and collect their roles for this issuer
        const userRoleMap = new Map()

        issuerUsers.forEach(issuerUser => {
          const userId = issuerUser.user_id

          if (!userRoleMap.has(userId)) {
            userRoleMap.set(userId, {
              ...issuerUser.users,
              issuer_roles: [],
              primary_role: null,
              is_primary_user: false,
              current_issuer: null
            })
          }

          const userData = userRoleMap.get(userId)
          userData.issuer_roles.push({
            ...issuerUser.roles
          })

          // Use first role as primary
          if (!userData.primary_role) {
            userData.primary_role = issuerUser.roles
            userData.is_primary_user = true
          }
        })

        users = Array.from(userRoleMap.values())
      }

      // Get invited users for this issuer if requested
      if (includeInvited) {
        const { data: invited } = await supabase
          .from("invited_users_new")
          .select(`
            email,
            name,
            invited_at,
            issuer_id,
            roles_new:role_id (
              id,
              role_name,
              display_name
            ),
            issuers_new:issuer_id (
              id,
              issuer_name,
              display_name
            )
          `)
          .eq("issuer_id", issuerId)
          .order("invited_at", { ascending: false })

        invitedUsers = invited || []
      }
    }
    // SUPERADMIN LOGIC: Get all users across all issuers
    else if (userRole === "superadmin") {
      // OPTIMIZED: Batch ALL queries in parallel using Promise.all
      const [usersResult, issuerUsersResult, rolesResult, issuersResult] = await Promise.all([
        supabase
          .from("users_new")
          .select("*")
          .neq("is_super_admin", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("issuer_users_new")
          .select("user_id, issuer_id, role_id"),
        supabase
          .from("roles_new")
          .select("id, role_name, display_name"),
        supabase
          .from("issuers_new")
          .select("id, issuer_name, display_name")
      ])

      const allUsers = usersResult.data
      const allIssuerUsers = issuerUsersResult.data
      const allRoles = rolesResult.data
      const allIssuers = issuersResult.data

      if (!usersResult.error) {
        // OPTIMIZED: Create Maps for O(1) lookups
        const issuersMap = new Map(allIssuers?.map(i => [i.id, { ...i, name: i.issuer_name }]) || [])
        const rolesMap = new Map(allRoles?.map(r => [r.id, { ...r, name: r.role_name }]) || [])

        // Add multi-issuer context to each user
        users = allUsers?.map(user => {
          const userIssuerRelationships = allIssuerUsers?.filter(iu => iu.user_id === user.id) || []

          // Group roles by issuer
          const issuerRoleMap = new Map()
          userIssuerRelationships.forEach(relationship => {
            const issuerId = relationship.issuer_id
            if (!issuerRoleMap.has(issuerId)) {
              const issuer = issuersMap.get(issuerId)
              issuerRoleMap.set(issuerId, {
                issuer: issuer || null,
                roles: [],
                is_primary_issuer: false
              })
            }

            const issuerData = issuerRoleMap.get(issuerId)
            const role = rolesMap.get(relationship.role_id)
            if (role) {
              issuerData.roles.push(role)
            }

            if (issuerData.issuer_memberships?.length === 0) {
              issuerData.is_primary_issuer = true
            }
          })

          const groupedMemberships = Array.from(issuerRoleMap.values())

          return {
            ...user,
            issuer_memberships: groupedMemberships,
            primary_issuer: groupedMemberships.find(gm => gm.is_primary_issuer)?.issuer,
            total_issuers: groupedMemberships.length,
            total_roles: userIssuerRelationships.length
          }
        }) || []
      }

      // Get superadmin users if requested
      if (includeSuperAdmins) {
        const { data: superAdminData } = await supabase
          .from("users_new")
          .select("id, email, name, created_at, is_owner")
          .eq("is_super_admin", true)
          .order("created_at", { ascending: false })

        superAdmins = superAdminData || []
      }

      // Get invited users (all) if requested
      if (includeInvited) {
        const { data: invited } = await supabase
          .from("invited_users_new")
          .select(`
            email,
            name,
            invited_at,
            issuer_id,
            roles_new:role_id (
              id,
              role_name,
              display_name
            ),
            issuers_new:issuer_id (
              id,
              issuer_name,
              display_name
            )
          `)
          .order("invited_at", { ascending: false })

        invitedUsers = invited || []
      }
    }

    return NextResponse.json({
      users,
      invitedUsers,
      superAdmins
    })
  } catch (err) {
    console.error("API Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
