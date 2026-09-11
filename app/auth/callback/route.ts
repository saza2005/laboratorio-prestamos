import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { isInstitutionalEmail } from '@/lib/supabase/auth/email-policy'
import {
  getSafeAuthNextPath,
  resolveAppOrigin,
} from '@/lib/supabase/auth/redirect-policy'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? null
  const origin = resolveAppOrigin(process.env.NEXT_PUBLIC_APP_URL, requestUrl.origin)

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=google_auth_failed`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/auth/login?error=google_auth_failed`)
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  const email = user?.email?.trim().toLowerCase()

  if (userError || !user || !email || !isInstitutionalEmail(email)) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_domain`)
  }

  const { error: ensureProfileError } = await supabase.rpc(
    'ensure_google_institutional_profile'
  )

  if (ensureProfileError) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(`${origin}/auth/login?error=google_link_required`)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(`${origin}/auth/login?error=no_profile`)
  }

  if (!profile.is_active) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(`${origin}/auth/login?error=inactive_account`)
  }

  const destination = getSafeAuthNextPath(next, getHomeRouteByRole(profile.role))
  return NextResponse.redirect(`${origin}${destination}`)
}
