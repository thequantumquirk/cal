import { redirect } from 'next/navigation'
import { getUserIssuers } from '@/lib/actions'

/**
 * Catch-all /dashboard route
 * Redirects to first available issuer's dashboard
 * This fixes the bug where returning users get redirected to /dashboard which doesn't exist
 */
export default async function DashboardRedirect() {
  // Get user's available issuers
  const issuers = await getUserIssuers()

  // Redirect to first issuer's dashboard
  if (issuers && issuers.length > 0) {
    const firstIssuerId = issuers[0].issuer_id
    redirect(`/issuer/${firstIssuerId}/dashboard`)
  }

  // If no issuers, redirect to issuers management page
  redirect('/issuers')
}
