export type PasswordIdentity = {
  provider?: string | null
}

export type PasswordChangeInput = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function hasPasswordIdentity(
  identities: PasswordIdentity[] | null | undefined
) {
  return identities?.some((identity) => identity.provider === 'email') ?? false
}

export function validatePasswordChange(input: PasswordChangeInput) {
  if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
    return 'Complete todos los campos.'
  }

  if (input.newPassword.length < 8) {
    return 'La nueva contraseña debe tener al menos 8 caracteres.'
  }

  if (input.newPassword !== input.confirmPassword) {
    return 'La confirmación no coincide con la nueva contraseña.'
  }

  if (input.currentPassword === input.newPassword) {
    return 'La nueva contraseña debe ser diferente de la actual.'
  }

  return null
}
