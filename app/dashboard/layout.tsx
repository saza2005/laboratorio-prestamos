import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canViewOperationalDashboard, getHomeRouteByRole } from '@/lib/supabase/auth/roles'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  let data

  try {
    data = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { profile } = data

  if (!canViewOperationalDashboard(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}