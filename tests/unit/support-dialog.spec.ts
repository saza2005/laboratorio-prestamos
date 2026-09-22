import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const shellSource = readFileSync('components/app-shell.tsx', 'utf8')
const dialogSource = readFileSync('components/support-dialog.tsx', 'utf8')

test('support is an operational shell action and does not add a route', () => {
  assert.match(shellSource, /variant === 'operational'/)
  assert.match(shellSource, />Soporte</)
  assert.match(shellSource, /setSupportOpen\(true\)/)
  assert.doesNotMatch(shellSource, /href=["']\/soporte/)
})

test('support dialog contains the approved contact information', () => {
  assert.match(dialogSource, /Soporte del sistema/)
  assert.match(dialogSource, /mailto:santiago\.zumbaa@ucuenca\.edu\.ec/)
  assert.match(dialogSource, /tel:0969075517/)
  assert.match(dialogSource, /mailto:juan\.pachecog@ucuenca\.edu\.ec/)
  assert.match(dialogSource, /Desarrollado para el Laboratorio de la Universidad de Cuenca/)
})

test('support dialog exposes accessible modal semantics and keyboard handling', () => {
  assert.match(dialogSource, /role="dialog"/)
  assert.match(dialogSource, /aria-modal="true"/)
  assert.match(dialogSource, /aria-labelledby="support-dialog-title"/)
  assert.match(dialogSource, /aria-describedby="support-dialog-description"/)
  assert.match(dialogSource, /event\.key === 'Escape'/)
  assert.match(dialogSource, /event\.key !== 'Tab'/)
  assert.match(dialogSource, /previousFocus\?\.focus\(\)/)
})
