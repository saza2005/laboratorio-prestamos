import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { isInstitutionalEmail } from '@/lib/supabase/auth/email-policy'

function getFullName(userMetadata: Record<string, unknown>, email: string) {
  const name = userMetadata.full_name ?? userMetadata.name

  if (typeof name === 'string' && name.trim()) {
    return name.trim().slice(0, 120)
  }

  return email.split('@')[0].slice(0, 120)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? null
  const origin = requestUrl.origin

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(`${origin}/auth/login?error=no_profile`)
  }

  if (profile) {
    return NextResponse.redirect(`${origin}${next ?? getHomeRouteByRole(profile.role)}`)
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      full_name: getFullName(user.user_metadata, email),
      email,
      role: 'student',
    })
    .select('role')
    .single()

  if (insertError || !insertedProfile) {
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(`${origin}/auth/login?error=google_link_required`)
  }

  return NextResponse.redirect(
    `${origin}${next ?? getHomeRouteByRole(insertedProfile.role)}`
  )
}
