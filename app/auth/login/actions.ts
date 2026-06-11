'use server'

import { redirect } from 'next/navigation'
import { clearSupabaseAuthCookies, createClient } from '@/lib/supabase/server'
import { getHomeRouteByRole } from '@/lib/supabase/auth/roles'

export async function loginUser(formData: FormData) {
  await clearSupabaseAuthCookies()
  const supabase = await createClient()

  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '').trim()

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