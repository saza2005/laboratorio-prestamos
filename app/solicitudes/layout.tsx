import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canUseRequestPortal,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'

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

  return <>{children}</>
}