import { expect, test } from '@playwright/test'
import {
  createRoleFormViewState,
  roleFormViewReducer,
} from '@/app/dashboard/usuarios/role-form-state'

test('reproduce el reset previo al retorno canónico de la acción', () => {
  let state = createRoleFormViewState('student')
  state = roleFormViewReducer(state, { type: 'select', role: 'teacher' })
  state = roleFormViewReducer(state, { type: 'server_prop', role: 'student' })

  expect(state.selectedRole).toBe('teacher')

  state = roleFormViewReducer(state, {
    type: 'action_confirmed',
    role: 'teacher',
  })
  expect(state.confirmedRole).toBe('teacher')
  expect(state.selectedRole).toBe('teacher')
})
