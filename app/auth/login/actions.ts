'use server'

import { redirect } from 'next/navigation'
import { clearSupabaseAuthCookies, createClient } from '@/lib/supabase/server'
import { getHomeRouteByRole } from '@/lib/supabase/auth/roles'

type LoginCategory =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_NETWORK_ERROR'
  | 'AUTH_SUCCESS_COOKIE_FAILURE'
  | 'PROFILE_NOT_FOUND'
  | 'PROFILE_READ_DENIED'
  | 'PROFILE_INACTIVE'
  | 'INVALID_ROLE'
  | 'REDIRECT_FAILURE'
  | 'UNEXPECTED_ERROR'

function classifyAuthError(error: { code?: string; status?: number; message?: string }): LoginCategory {
  const code = String(error.code ?? '').toLowerCase()
  const message = String(error.message ?? '').toLowerCase()
  if (error.status === 429 || code.includes('rate') || message.includes('rate limit')) return 'AUTH_RATE_LIMITED'
  if (message.includes('fetch') || message.includes('network') || code.includes('network')) return 'AUTH_NETWORK_ERROR'
  if (code.includes('invalid') || message.includes('invalid login') || message.includes('invalid credential')) return 'INVALID_CREDENTIALS'
  return 'UNEXPECTED_ERROR'
}

function logLoginStage(stage: string, category: LoginCategory, code?: string, status?: number) {
  console.error('[auth-login]', JSON.stringify({ stage, category, code: code ?? null, status: status ?? null }))
}

export async function loginUser(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')

  if (!email || !password) redirect('/auth/login?error=missing_credentials')

  let supabase
  try {
    await clearSupabaseAuthCookies()
    supabase = await createClient()
  } catch {
    logLoginStage('COOKIE_WRITE', 'AUTH_SUCCESS_COOKIE_FAILURE')
    redirect('/auth/login?error=auth_unavailable')
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const category = classifyAuthError(error)
    logLoginStage('SUPABASE_SIGN_IN', category, error.code, error.status)
    const query = category === 'AUTH_RATE_LIMITED' ? 'auth_rate_limited' : category === 'AUTH_NETWORK_ERROR' ? 'auth_network_error' : category === 'INVALID_CREDENTIALS' ? 'invalid_credentials' : 'auth_unexpected'
    redirect('/auth/login?error=' + query)
  }

  const user = data.user
  if (!user) {
    logLoginStage('AUTH_USER_READ', 'UNEXPECTED_ERROR')
    redirect('/auth/login?error=auth_unexpected')
  }

  if (!user.email_confirmed_at) {
    logLoginStage('AUTH_USER_READ', 'EMAIL_NOT_CONFIRMED')
    await supabase.auth.signOut({ scope: 'local' })
    await clearSupabaseAuthCookies()
    redirect('/auth/login?error=email_not_confirmed')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    logLoginStage('PROFILE_READ', 'PROFILE_READ_DENIED', profileError.code, undefined)
    await supabase.auth.signOut({ scope: 'local' })
    await clearSupabaseAuthCookies()
    redirect('/auth/login?error=profile_read_denied')
  }

  if (!profile) {
    logLoginStage('PROFILE_READ', 'PROFILE_NOT_FOUND')
    await supabase.auth.signOut({ scope: 'local' })
    await clearSupabaseAuthCookies()
    redirect('/auth/login?error=profile_not_found')
  }

  if (!profile.is_active) {
    logLoginStage('ACTIVE_VALIDATION', 'PROFILE_INACTIVE')
    await supabase.auth.signOut({ scope: 'local' })
    await clearSupabaseAuthCookies()
    redirect('/auth/login?error=profile_inactive')
  }

  const homeRoute = getHomeRouteByRole(profile.role)
  if (homeRoute === '/auth/login') {
    logLoginStage('ROLE_VALIDATION', 'INVALID_ROLE')
    await supabase.auth.signOut({ scope: 'local' })
    await clearSupabaseAuthCookies()
    redirect('/auth/login?error=invalid_role')
  }

  redirect(homeRoute)
}
