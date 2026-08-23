import type { Locator, Page } from '@playwright/test'

export function resolveBulkQuantityControl(form: Locator, itemCode: string): Locator {
  const itemCard = form
    .locator('div.rounded-lg.border.bg-slate-50.p-4')
    .filter({ hasText: itemCode })
  return itemCard.locator('input[type="number"]')
}

export async function prepareBulkDelivery(form: Locator, itemCode: string, quantity: number): Promise<void> {
  if (quantity !== 1) throw new Error('l1_minimal_bulk_quantity_must_be_one')
  const quantityControl = resolveBulkQuantityControl(form, itemCode)
  if (await quantityControl.count() !== 1) throw new Error('l1_quantity_control_not_unique')
  await quantityControl.fill('1')
}

export function resolveInitialDeliveryControl(page: Page): Locator {
  return page.getByRole('button', { name: 'Confirmar entrega y crear préstamo', exact: true })
}

export function resolveDeliveryConfirmationDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Confirmar entrega', exact: true })
}

export function resolveRealDeliveryControl(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: 'Entregar', exact: true })
}

export async function assertDeliveryControlsReady(page: Page): Promise<void> {
  const initial = resolveInitialDeliveryControl(page)
  if (await initial.count() !== 1) throw new Error('l1_initial_delivery_control_not_unique')
  if (!(await initial.isVisible()) || !(await initial.isEnabled())) throw new Error('l1_initial_delivery_control_not_ready')
}
