/**
 * Supabase migration runner
 * Usage: node scripts/migrate.mjs <personal_access_token>
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'lkoqwhqdtnfjoxwfuuyv'
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

const token = process.argv[2]
if (!token) {
  console.error('Usage: node scripts/migrate.mjs <personal_access_token>')
  process.exit(1)
}

async function runQuery(query, label) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }

  if (!res.ok) {
    throw new Error(`${JSON.stringify(data)}`)
  }
  return data
}

// Run each file as a single batch (avoids splitting PL/pgSQL functions)
const files = [
  { path: '../supabase_schema.sql',       label: 'Full schema (tables, RLS, triggers)' },
  { path: '../supabase_migration_v3.sql', label: 'Migration V3 (email column, notifications, admin role)' },
]

console.log(`\n🔌 Connecting to Supabase project ${PROJECT_REF}...\n`)

for (const { path, label } of files) {
  const sql = readFileSync(join(__dir, path), 'utf-8')
  process.stdout.write(`  ⏳ ${label} ... `)
  try {
    await runQuery(sql, label)
    console.log('✓')
  } catch (err) {
    console.log('✗')
    console.error(`     Error: ${err.message}\n`)
    process.exit(1)
  }
}

console.log('\n✅ Migration complete!')
console.log('   Next step: Supabase Dashboard → Project Settings → API → "Reload Schema Cache"\n')
