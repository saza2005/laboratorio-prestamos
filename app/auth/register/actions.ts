'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function registerUser(formData: FormData) {
  const fullName = String(formData.get('full_name') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '').trim()

  if (!fullName || !email || !password) {
    throw new Error('Todos los campos son obligatorios.')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/solicitudes')
}