import fs from 'node:fs'
import path from 'node:path'
import { classifyPagePost } from './lib/post-request-classifier.mjs'

const files = fs.readdirSync('.e2e-state/runtime').filter((name) => name.endsWith('.s3b-posts.json'))
if (files.length !== 1) throw new Error('s3b_capture_artifact_count_mismatch')
const records = JSON.parse(fs.readFileSync(path.join('.e2e-state/runtime', files[0]), 'utf8'))
if (!Array.isArray(records) || records.length !== 2) throw new Error('s3b_capture_record_count_mismatch')
const classifications = records.map((record) => classifyPagePost({
  method: record.method,
  sameOrigin: record.same_origin,
  pathname: record.path_class,
  hasNextActionHeader: record.has_next_action_header,
  resourceType: record.resource_type,
  isNavigationRequest: false,
  contentType: record.content_type_class === 'text/plain' ? 'text/plain; charset=utf-8' : record.content_type_class,
}))
if (classifications[0] !== 'SERVER_ACTION') throw new Error('s3b_replay_server_action_mismatch')
if (classifications[1] !== 'FRAMEWORK_DIAGNOSTIC') throw new Error('s3b_replay_framework_diagnostic_mismatch')
console.log('S3B_SANITIZED_METADATA_REPLAY_TEST: PASS')
console.log('REPLAY_APPROVAL_SERVER_ACTION_POSTS: 1')
console.log('REPLAY_FRAMEWORK_DIAGNOSTIC_POSTS: 1')
console.log('REPLAY_UNEXPECTED_APPLICATION_POSTS: 0')
