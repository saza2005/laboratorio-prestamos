import { createClient } from '@/lib/supabase/server'

export async function getAuthProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autenticado.')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('No se pudo cargar el perfil del usuario.')
  }

  return { supabase, user, profile }
}