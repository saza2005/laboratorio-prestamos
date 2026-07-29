import 'server-only'

import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está configurada.')
  }

  resendClient ??= new Resend(apiKey)
  return resendClient
}

export function getEmailFrom() {
  const from = process.env.EMAIL_FROM

  if (!from) {
    throw new Error('EMAIL_FROM no está configurado.')
  }

  return from
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  )
}
