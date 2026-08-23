import fs from 'node:fs'
import dns from 'node:dns'
import net from 'node:net'
import process from 'node:process'

const envNames = [
  'NODE_OPTIONS', 'NODE_USE_ENV_PROXY', 'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
  'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy', 'RES_OPTIONS', 'LOCALDOMAIN',
  'HOSTALIASES', 'UV_THREADPOOL_SIZE', 'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED',
]

const classifyEnv = (name) => process.env[name] ? 'PRESENT' : 'ABSENT'
const read = (path) => { try { return fs.readFileSync(path, 'utf8') } catch { return '' } }
const status = read('/proc/self/status')
const securityLabel = read('/proc/self/attr/current').trim()
const cgroup = read('/proc/self/cgroup')
const parentComm = read('/proc/1/comm').trim()
const seccomp = /^Seccomp:\s*(\d+)/m.exec(status)?.[1]
const noNewPrivs = /^NoNewPrivs:\s*(\d+)/m.exec(status)?.[1]
const fetchClass = typeof globalThis.fetch === 'function' ? 'BUILTIN_OR_UNDICI_FETCH' : 'ABSENT'
const dispatcherClass = await import('undici').then(({ getGlobalDispatcher }) => getGlobalDispatcher()?.constructor?.name ? 'UNDICI_' + getGlobalDispatcher().constructor.name.toUpperCase() : 'UNKNOWN').catch(() => 'UNKNOWN')

const fingerprint = {
  mode: process.env.F3S_MODE ?? 'UNKNOWN',
  nodeVersionClass: /^v\d+\.\d+\.\d+$/.test(process.version) ? 'SEMVER' : 'UNKNOWN',
  execPathClass: process.execPath.endsWith('/node') ? 'NODE_EXECUTABLE' : 'OTHER',
  execArgvClass: process.execArgv.some((arg) => arg.startsWith('--env-file=')) ? (process.execArgv.some((arg) => arg === '--input-type=module') ? 'ENV_FILE_INPUT_MODULE' : 'ENV_FILE_SCRIPT') : 'OTHER',
  cwdClass: process.cwd().endsWith('/laboratorio-prestamos-e2e') ? 'E2E_REPO' : 'OTHER',
  uidClass: typeof process.getuid === 'function' ? 'PRESENT' : 'UNKNOWN',
  gidClass: typeof process.getgid === 'function' ? 'PRESENT' : 'UNKNOWN',
  parentLauncherClass: /node|bash|sh|zsh/i.test(parentComm) ? 'LOCAL_TOOLING' : parentComm ? 'OTHER' : 'UNKNOWN',
  envPresence: Object.fromEntries(envNames.map((name) => [name, classifyEnv(name)])),
  targetSourceClass: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'ABSENT',
  dnsResultOrder: typeof dns.getDefaultResultOrder === 'function' ? dns.getDefaultResultOrder() : 'UNKNOWN',
  customDnsServerOverride: 'NOT_MUTATED_BY_TOOL',
  dnsLookupOverride: 'NOT_MUTATED_BY_TOOL',
  autoSelectFamilyClass: typeof net.getDefaultAutoSelectFamily === 'function' ? String(net.getDefaultAutoSelectFamily()) : 'UNSUPPORTED',
  autoSelectFamilyAttemptTimeoutClass: typeof net.getDefaultAutoSelectFamilyAttemptTimeout === 'function' ? 'SUPPORTED' : 'UNSUPPORTED',
  fetchClass,
  dispatcherClass,
  appArmorClass: securityLabel ? (securityLabel.toLowerCase().includes('unconfined') ? 'UNCONFINED' : 'CONFINED') : 'UNKNOWN',
  seccompClass: seccomp === '0' ? 'DISABLED' : seccomp === '1' ? 'STRICT' : seccomp === '2' ? 'FILTER' : 'UNKNOWN',
  noNewPrivsClass: noNewPrivs === '1' ? 'YES' : noNewPrivs === '0' ? 'NO' : 'UNKNOWN',
  containerClass: /docker|container|kubepods|lxc/i.test(cgroup) ? 'CONTAINER_LIKE' : cgroup ? 'HOST_LIKE_OR_SANDBOX_UNKNOWN' : 'UNKNOWN',
  preReadExecutionContext: 'MAIN_PROCESS',
}

console.log(JSON.stringify(fingerprint))
