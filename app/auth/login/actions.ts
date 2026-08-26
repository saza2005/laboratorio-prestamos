'use server'

import { redirect } from 'next/navigation'
import { clearSupabaseAuthCookies, createClient } from '@/lib/supabase/server'
import { getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { parseLoginCredentials } from '@/lib/supabase/auth/login-credentials'

export async function loginUser(formData: FormData) {
  await clearSupabaseAuthCookies()
  const supabase = await createClient()

  const { email, password } = parseLoginCredentials(formData)

  if (!email || !password) {
    redirect('/auth/login?error=missing_credentials')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/auth/login?error=invalid_credentials')
  }

  const user = data.user

  if (!user) {
    redirect('/auth/login?error=no_user')
  }

  if (!user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: 'local' })
    await clearSupabaseAuthCookies()
    redirect('/auth/login?error=email_not_confirmed')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut({ scope: 'local' })
    await clearSupabaseAuthCookies()
    redirect('/auth/login?error=no_profile')
  }

  redirect(getHomeRouteByRole(profile.role))
}
