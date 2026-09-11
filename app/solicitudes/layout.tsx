import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canUseRequestPortal,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { AppShell } from '@/components/app-shell'

export default async function SolicitudesLayout({
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

  if (!canUseRequestPortal(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  return (
    <AppShell
      variant="portal"
      userName={profile.full_name || profile.email}
      role={profile.role}
    >
      {children}
    </AppShell>
  )
}
