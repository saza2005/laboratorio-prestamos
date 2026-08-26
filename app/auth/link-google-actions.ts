'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isInstitutionalEmail } from '@/lib/supabase/auth/email-policy'
import { resolveAppOrigin } from '@/lib/supabase/auth/redirect-policy'

export async function linkGoogleIdentity() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !isInstitutionalEmail(user.email)) {
    redirect('/dashboard?auth_error=invalid_domain')
  }

  const origin = resolveAppOrigin(process.env.NEXT_PUBLIC_APP_URL)
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
      queryParams: {
        hd: 'ucuenca.edu.ec',
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    redirect('/dashboard?auth_error=google_link_failed')
  }

  redirect(data.url)
}
