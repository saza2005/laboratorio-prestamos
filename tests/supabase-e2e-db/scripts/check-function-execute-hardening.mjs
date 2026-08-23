import fs from "node:fs";
import path from "node:path";

const migrationsDir = "supabase/migrations";
const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

function splitArgs(value) {
  const result = [];
  let start = 0;
  let depth = 0;
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') quoted = !quoted;
    else if (!quoted && character === "(") depth += 1;
    else if (!quoted && character === ")") depth -= 1;
    else if (!quoted && character === "," && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  result.push(value.slice(start).trim());
  return result.filter(Boolean);
}

function normalizeTypes(value) {
  if (!value.trim()) return "";
  return splitArgs(value).map((argument) => argument
    .replace(/\s+DEFAULT\s+[\s\S]*$/i, "")
    .trim()
    .replace(/^(INOUT|IN|OUT|VARIADIC)\s+/i, "")
    .replace(/^"[^"]+"\s+/, "")
    .replaceAll('"', "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()).join(",");
}

function functionKey(name, argumentsText) {
  return `${name.replaceAll('"', "").toLowerCase()}(${normalizeTypes(argumentsText)})`;
}

const functions = [];
const revocations = new Set();

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  const createPattern = /create\s+(?:or\s+replace\s+)?function\s+((?:"[^"]+"|[a-z_][\w$]*)\.)?("[^"]+"|[a-z_][\w$]*)\s*\(([\s\S]*?)\)\s+returns/ig;
  const revokePattern = /revoke\s+execute\s+on\s+function\s+((?:"[^"]+"|[a-z_][\w$]*)\.)?("[^"]+"|[a-z_][\w$]*)\s*\(([\s\S]*?)\)\s+from\s+(public|anon)\s*;/ig;
  let match;

  while ((match = createPattern.exec(sql))) {
    const schema = (match[1] || "").replace(/\.$/, "").replaceAll('"', "") || "public";
    if (schema.toLowerCase() === "public") {
      functions.push({
        key: functionKey(match[2], match[3]),
        name: match[2].replaceAll('"', ""),
        file,
      });
    }
  }

  while ((match = revokePattern.exec(sql))) {
    const schema = (match[1] || "").replace(/\.$/, "").replaceAll('"', "") || "public";
    if (schema.toLowerCase() === "public") {
      revocations.add(`${match[4].toLowerCase()}:${functionKey(match[2], match[3])}`);
    }
  }
}

const uniqueFunctions = [...new Map(functions.map((item) => [item.key, item])).values()];
const missing = uniqueFunctions.filter((item) => (
  !revocations.has(`public:${item.key}`) || !revocations.has(`anon:${item.key}`)
));

console.log(`Checked public application functions: ${uniqueFunctions.length}`);
console.log(`SQL migrations scanned: ${files.join(", ")}`);
console.log(`Required PUBLIC revocations found: ${uniqueFunctions.length - missing.length}/${uniqueFunctions.length}`);
console.log(`Required anon revocations found: ${uniqueFunctions.length - missing.length}/${uniqueFunctions.length}`);

if (missing.length > 0) {
  console.log("Missing hardening:");
  for (const item of missing) console.log(`- ${item.name} in ${item.file} [${item.key}]`);
  process.exitCode = 1;
} else {
  console.log("Result: PASS");
  console.log("Note: functions are created in the baseline dump and revocations are aggregated across the migration set.");
}
