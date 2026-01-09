import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Debug logging
    console.log("Admin client available:", !!adminClient)
    console.log("Service role key available:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    try {
      const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("OAuth exchange error:", error)
        return NextResponse.redirect(
          `${origin}/login?error=oauth_exchange_failed&details=${encodeURIComponent(error.message)}`,
        )
      }

      if (!authData?.user) {
        console.error("No user data received from OAuth")
        return NextResponse.redirect(`${origin}/login?error=no_user_data`)
      }

      console.log("Processing login for:", authData.user.email)
      console.log("User ID:", authData.user.id)

      // IMPLEMENTING THE CORRECT FLOW:
      // 1. Check invited_users table FIRST → 2. Check users table → 3. If not found, deny access

      // STEP 1: Check invited_users table FIRST
      // Use admin client to bypass RLS for checking invited_users
      let invitedUser = null
      let inviteCheckError = null

      if (adminClient) {
        const { data: inviteData, error } = await adminClient
          .from("invited_users_new")
          .select(`
            email, 
            name,
            role_id,
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
          .eq("email", authData.user.email)
          .maybeSingle()

        invitedUser = inviteData
        inviteCheckError = error
      } else {
        // Fallback to regular client if admin client not available
        const { data: inviteData, error } = await supabase
          .from("invited_users_new")
          .select(`
            email, 
            name,
            role_id,
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
          .eq("email", authData.user.email)
          .maybeSingle()

        invitedUser = inviteData
        inviteCheckError = error
      }

      console.log("Invited user check result:", { invitedUser, inviteCheckError })

      if (inviteCheckError) {
        console.error("Error checking invited users:", inviteCheckError)
        // If invited_users table doesn't exist or has RLS issues, treat as not invited
        if (inviteCheckError.code === "42P01" || inviteCheckError.code === "42501" || inviteCheckError.code === "42703") {
          console.log("invited_users table doesn't exist, has RLS issues, or has wrong structure, treating as not invited")
        } else {
          return NextResponse.redirect(
            `${origin}/login?error=invite_check_failed&details=${encodeURIComponent(inviteCheckError.message)}`,
          )
        }
      }

      // If user is invited, allow them access (DON'T DELETE the invitation yet!)
      if (invitedUser) {
        console.log("User has valid invitation:", authData.user.email)

        // Check if user already exists in users table
        const { data: existingUser, error: userCheckError } = await supabase
          .from("users_new")
          .select("id, email, name, is_super_admin, is_owner")
          .eq("id", authData.user.id)
          .maybeSingle()

        if (userCheckError) {
          console.error("Error checking existing user:", userCheckError)
          return NextResponse.redirect(
            `${origin}/login?error=user_check_failed&details=${encodeURIComponent(userCheckError.message)}`,
          )
        }

        if (!existingUser) {
          // User doesn't exist yet - create them but DON'T delete invitation
          console.log("Creating new user from invite (keeping invitation):", authData.user.email)

          if (!adminClient) {
            console.error("Admin client not available for user creation")
            return NextResponse.redirect(
              `${origin}/login?error=admin_client_unavailable`,
            )
          }

          // Create user without role/role_id (since we're removing those columns)
          const { data: newUser, error: createError } = await adminClient
            .from("users_new")
            .insert({
              id: authData.user.id,
              email: authData.user.email,
              name: invitedUser.name,
              is_super_admin: invitedUser.roles_new?.role_name === 'superadmin' ? true : false,
              is_owner: false
            })
            .select()
            .single()

          if (createError) {
            console.error("Error creating user from invitation:", createError)

            // Clean up auth user if user creation failed
            try {
              await adminClient.auth.admin.deleteUser(authData.user.id)
              console.log("Cleaned up auth user after creation failure:", authData.user.id)
            } catch (deleteError) {
              console.warn("Failed to delete auth user after creation failure:", deleteError?.message)
            }

            return NextResponse.redirect(
              `${origin}/login?error=user_creation_failed&details=${encodeURIComponent(createError?.message || 'User creation failed')}`,
            )
          }

          // Create issuer relationship for non-superadmin users (ONLY if issuer_id is present)
          if (invitedUser.roles_new?.role_name !== 'superadmin' && invitedUser.issuer_id) {
            const { error: issuerUserError } = await adminClient
              .from("issuer_users_new")
              .insert({
                user_id: authData.user.id,
                issuer_id: invitedUser.issuer_id,
                role_id: invitedUser.role_id,
                is_primary: true
              })

            if (issuerUserError) {
              console.error("Error creating issuer relationship:", issuerUserError)
              // Don't fail the entire process for this
            }
          } else if (invitedUser.roles_new?.role_name === 'Shareholder' && !invitedUser.issuer_id) {
            console.log("Issuer-less shareholder invite detected. Skipping issuer_users creation.")
            // We don't create an issuer_users record. 
            // The user will rely on Lazy Linking (which happens on login) or the Shareholder Home page logic.
          }

          console.log("User created successfully from invitation:", authData.user.email)
        }

        // Decide final redirect target based on role priority
        let targetPath = next
        try {
          const invitedRole = invitedUser?.roles_new?.role_name
          if (invitedRole && (invitedRole.toLowerCase() === 'admin' || invitedRole.toLowerCase() === 'superadmin' || invitedRole.toLowerCase() === 'transfer_team')) {
            // Redirect admin/superadmin/transfer_team to first issuer dashboard
            if (invitedUser.issuer_id) {
              targetPath = `/issuer/${invitedUser.issuer_id}/dashboard`
            } else {
              targetPath = '/issuers'  // No issuer assigned yet
            }
          } else if (invitedRole && invitedRole.toLowerCase() === 'broker') {
            // Always go to onboarding - it will redirect to dashboard if already completed
            targetPath = '/broker/onboarding'
          } else if (invitedRole && invitedRole.toLowerCase() === 'shareholder') {
            // Always go to onboarding - it will redirect to shareholder-home if already completed
            targetPath = '/shareholder/onboarding'
          }
        } catch (err) {
          console.warn('Error checking invited user role for redirect override:', err)
        }

        const redirectUrl = new URL(`${origin}${targetPath}`)
        redirectUrl.searchParams.set("login", invitedUser ? "new" : "returning")

        // Log Audit removed per user request

        return NextResponse.redirect(redirectUrl)
      }

      // STEP 2: User not invited, check if they exist in users table
      console.log("User not invited, checking users table for:", authData.user.email)

      // ⚡ OPTIMIZED: Combine user + roles query into single DB call
      const roleQueryClient = adminClient || supabase
      const { data: existingUser, error: userCheckError } = await roleQueryClient
        .from("users_new")
        .select(`
          id, email, name, is_super_admin, is_owner,
          issuer_users_new(
            issuer_id,
            roles_new:role_id(role_name)
          )
        `)
        .or(`id.eq.${authData.user.id},email.eq.${authData.user.email}`)
        .maybeSingle()

      if (userCheckError) {
        console.error("Error checking existing user:", userCheckError)
        return NextResponse.redirect(
          `${origin}/login?error=user_check_failed&details=${encodeURIComponent(userCheckError.message)}`,
        )
      }

      // If user exists in users table, they're valid
      if (existingUser) {
        console.log("Returning user login:", existingUser.email)

        // If the existing user has a different ID than the auth user, update the users table
        if (existingUser.id !== authData.user.id) {
          console.log("Updating user ID from", existingUser.id, "to", authData.user.id)

          if (adminClient) {
            try {
              // Update the user ID to match the auth user ID
              const { error: updateError } = await adminClient
                .from("users_new")
                .update({ id: authData.user.id })
                .eq("email", authData.user.email)

              if (updateError) {
                console.error("Error updating user ID:", updateError)
                // Continue anyway - the user exists and should be allowed in
              } else {
                console.log("Successfully updated user ID for:", authData.user.email)
              }
            } catch (error) {
              console.error("Error updating user ID:", error)
            }
          }
        }

        // Determine the user's highest issuer role and override redirect to
        // /shareholder-home when the user is exclusively a shareholder.
        let targetPath = next
        try {
          // ⚡ OPTIMIZED: Use roles from the combined query above
          const issuerRoles = existingUser.issuer_users_new || []

          if (issuerRoles && issuerRoles.length > 0) {
            const roleHierarchy = [
              'superadmin',
              'admin',
              'transfer_team',
              'broker',
              'shareholder',
              'read_only',
            ]

            // Flatten role names
            const foundRoles = issuerRoles
              .map(r => r?.roles_new?.role_name)
              .filter(Boolean)
              .map(rn => rn.toLowerCase())

            for (const level of roleHierarchy) {
              if (foundRoles.includes(level)) {
                if (level === 'shareholder') {
                  // Go to onboarding - it will redirect to shareholder-home if already completed
                  targetPath = '/shareholder/onboarding'
                } else if (level === 'admin' || level === 'superadmin' || level === 'transfer_team') {
                  // Redirect to first issuer dashboard
                  const firstIssuer = issuerRoles[0]
                  if (firstIssuer.issuer_id) {
                    targetPath = `/issuer/${firstIssuer.issuer_id}/dashboard`
                  } else {
                    targetPath = '/issuers'
                  }
                } else if (level === 'broker') {
                  // Always go to onboarding - it will redirect to dashboard if already completed
                  targetPath = '/broker/onboarding'
                }
                break
              }
            }
          }
        } catch (err) {
          console.warn('Error resolving user issuer roles for redirect override:', err)
        }

        const redirectUrl = new URL(`${origin}${targetPath}`)
        redirectUrl.searchParams.set("login", "returning")

        // Log Audit removed per user request

        return NextResponse.redirect(redirectUrl)
      }

      // STEP 2.5: Check if user exists in shareholders_new table (Uninvited Shareholder)
      console.log("Checking shareholders table for:", authData.user.email)
      const { data: shareholderData, error: shareholderError } = await (adminClient || supabase)
        .from("shareholders_new")
        .select("id, first_name, last_name")
        .eq("email", authData.user.email)
        .maybeSingle()

      if (shareholderData) {
        console.log("User found in shareholders table:", authData.user.email)

        // Create user in users table
        if (adminClient) {
          const { data: newUser, error: createError } = await adminClient
            .from("users_new")
            .insert({
              id: authData.user.id,
              email: authData.user.email,
              name: `${shareholderData.first_name} ${shareholderData.last_name}`.trim() || authData.user.email,
              is_super_admin: false,
              is_owner: false
            })
            .select()
            .single()

          if (createError) {
            console.error("Error creating user from shareholder record:", createError)
            // Clean up auth user
            try {
              await adminClient.auth.admin.deleteUser(authData.user.id)
            } catch (e) { }
            return NextResponse.redirect(`${origin}/login?error=user_creation_failed`)
          }

          console.log("Created user from shareholder record")
          // Go to onboarding - it will redirect to shareholder-home if already completed
          const redirectUrl = new URL(`${origin}/shareholder/onboarding`)
          redirectUrl.searchParams.set("login", "new")

          // Log Audit removed per user request

          return NextResponse.redirect(redirectUrl)
        }
      }

      // STEP 3: User is not invited and not in users table - DELETE and block
      console.log("Unauthorized user attempt:", authData.user.email)

      // Delete the auth user if we have admin access
      if (adminClient) {
        try {
          await adminClient.auth.admin.deleteUser(authData.user.id)
          console.log("Deleted unauthorized auth user:", authData.user.id)
        } catch (deleteError) {
          console.warn("Failed to delete unauthorized user:", deleteError?.message)
        }
      }

      return NextResponse.redirect(`${origin}/login?error=not_invited`)

    } catch (error) {
      console.error("Callback error:", error)
      return NextResponse.redirect(`${origin}/login?error=callback_error&details=${encodeURIComponent(error.message)}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
