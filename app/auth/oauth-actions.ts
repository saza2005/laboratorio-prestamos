'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveAppOrigin } from '@/lib/supabase/auth/redirect-policy'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = resolveAppOrigin(process.env.NEXT_PUBLIC_APP_URL)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        hd: 'ucuenca.edu.ec',
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    redirect('/auth/login?error=google_auth_failed')
  }

  redirect(data.url)
}
