'use server'

import { redirect } from 'next/navigation'
import { clearSupabaseAuthCookies, createClient } from '@/lib/supabase/server'

export async function logoutUser() {
  const supabase = await createClient()

  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // La cookie local se limpia igualmente si el refresh token ya expiró.
  }

  await clearSupabaseAuthCookies()
  redirect('/auth/login')
}