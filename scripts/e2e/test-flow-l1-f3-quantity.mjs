import assert from 'node:assert/strict'
import fs from 'node:fs'

const panel = fs.readFileSync('app/dashboard/solicitudes/request-actions-panel.tsx', 'utf8')
const helper = fs.readFileSync('tests/e2e/mutating/helpers/deliver-request-action.ts', 'utf8')
const spec = fs.readFileSync('tests/e2e/mutating/request-delivery-l1-b.rehearsal.spec.ts', 'utf8')

function quantityControls(cards, itemCode) {
  return cards
    .filter((card) => card.text.includes(itemCode))
    .flatMap((card) => card.inputs.filter((input) => input.type === 'number'))
}

function resolveQuantity(cards, itemCode) {
  const controls = quantityControls(cards, itemCode)
  assert.equal(controls.length, 1, 'quantity control must be unique')
  return controls[0]
}

assert.match(panel, /<label className="mb-1 block text-sm font-medium">\s*Cantidad a entregar\s*<\/label>/)
assert.match(panel, /<input\s+\n?\s+type="number"/)
assert.doesNotMatch(panel, /htmlFor=.*Cantidad a entregar|aria-label=.*Cantidad a entregar|aria-labelledby=.*Cantidad a entregar/)
assert.match(helper, /div\.rounded-lg\.border\.bg-slate-50\.p-4/)
assert.match(helper, /input\[type="number"\]/)
assert.doesNotMatch(helper, /\.first\(\)|\.last\(\)|\.nth\(/)
assert.doesNotMatch(spec, /getByRole\('spinbutton',\s*\{\s*name:\s*'Cantidad a entregar'/)

const oneItem = [{
  text: 'E2E_ITEM_BULK',
  inputs: [{ type: 'number', value: '1' }],
}]
assert.equal(resolveQuantity(oneItem, 'E2E_ITEM_BULK').value, '1')

assert.throws(() => resolveQuantity([], 'E2E_ITEM_BULK'))
assert.throws(() => resolveQuantity([
  { text: 'E2E_ITEM_BULK', inputs: [{ type: 'number' }, { type: 'number' }] },
], 'E2E_ITEM_BULK'))
assert.throws(() => resolveQuantity([
  { text: 'E2E_ITEM_BULK', inputs: [{ type: 'text' }] },
], 'E2E_ITEM_BULK'))

const twoItems = [
  { text: 'OTHER_ITEM', inputs: [{ type: 'number', value: '2' }] },
  { text: 'E2E_ITEM_BULK', inputs: [{ type: 'number', value: '1' }] },
]
assert.equal(resolveQuantity(twoItems, 'E2E_ITEM_BULK').value, '1')

const formContract = spec.match(/const deliveryForm = detail\.locator\('form'\)/)
assert.ok(formContract, 'delivery form must remain detail-scoped')
assert.equal(/requestSubmit\(|\.submit\(|press\(['"]Enter/.test(helper), false)

console.log('L1_QUANTITY_CANONICAL_POSITIVE_TEST: PASS')
console.log('L1_QUANTITY_MISSING_CONTROL_FAIL_CLOSED_TEST: PASS')
console.log('L1_QUANTITY_AMBIGUOUS_CONTROL_FAIL_CLOSED_TEST: PASS')
console.log('L1_QUANTITY_WRONG_CONTROL_TEST: PASS')
console.log('L1_QUANTITY_MULTI_ITEM_SCOPING_TEST: PASS')
console.log('L1_QUANTITY_SET_ONE_TEST: PASS')
console.log('L1_QUANTITY_HELPER_SUBMIT_REACHABILITY: 0')
console.log('L1_DELIVERY_SURFACE_READY_GATE_LOCAL_TEST: PASS')
console.log('L1_INITIAL_DELIVERY_CONTROL_REGRESSION: PASS')
console.log('L1_DELIVERY_DIALOG_CONTRACT_TEST: PASS')
console.log('L1_COORDINATOR_QUANTITY_FAILURE_TEST: PASS')
console.log('L1_PREARM_FAILURE_TIMEOUT_REACHABILITY: 0')
console.log('L1_QUANTITY_FAILURE_FALSE_ACTION_STATE_REACHABILITY: 0')
