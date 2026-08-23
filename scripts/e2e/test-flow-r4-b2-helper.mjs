import fs from 'node:fs'

const helper = fs.readFileSync('tests/e2e/mutating/helpers/request-create-groups-form.ts', 'utf8')
const spec = fs.readFileSync('tests/e2e/mutating/request-create-r4-b2.ui-rehearsal.spec.ts', 'utf8')

function expect(value, message) {
  if (!value) throw new Error(message)
}

expect(helper.includes("input[name=\"purpose\"]"), 'purpose_control_missing')
expect(helper.includes("groups[0][group_name]"), 'group_name_invariant_missing')
expect(helper.includes("Enviar solicitud con grupos"), 'submit_locator_missing')
expect(helper.includes('itemButton.click()'), 'item_selection_click_missing')
expect(!helper.includes('submit.click'), 'helper_contains_submit_click')
expect(!helper.includes('requestSubmit'), 'helper_contains_request_submit')
expect(!helper.includes('form.submit'), 'helper_contains_form_submit')
expect(!helper.includes('press('), 'helper_contains_keyboard_submit')
expect(spec.includes('route.request().method() === \'POST\''), 'post_kill_switch_missing')
expect(!spec.includes("name: 'Enviar solicitud con grupos'"), 'spec_has_submit_locator_action')
console.log('R4_PURPOSE_FIELD_TESTS: PASS')
console.log('R4_HELPER_NO_SUBMIT_TEST: PASS')
console.log('R4_REQUEST_SUBMIT_REACHABILITY: 0')
console.log('R4_FORM_SUBMIT_REACHABILITY: 0')
console.log('R4_ENTER_SUBMIT_REACHABILITY: 0')
console.log('R4_B2_HELPER_TEST: PASS')
