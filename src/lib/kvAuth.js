// src/lib/kvAuth.js
// Stores the Baileys auth state in Cloudflare KV via the Worker API.
// This means sessions survive Render restarts — the bot reconnects
// without needing to pair again.

import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys'

const W = () => process.env.WORKER_URL
const S = () => process.env.BOT_SECRET

const call = async (path, opts = {}) => {
  const r = await fetch(`${W()}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Bot-Secret': S(),
      ...opts.headers,
    },
  })
  if (!r.ok) throw new Error(`KV call failed: ${path} → ${r.status}`)
  return r.json()
}

const kvGet = async (key) => {
  const { value } = await call(`/session/get?key=${encodeURIComponent(key)}`)
  return value ? JSON.parse(value, BufferJSON.reviver) : null
}

const kvSet = async (key, value, ttl) => {
  await call('/session/set', {
    method: 'POST',
    body: JSON.stringify({
      key,
      value: JSON.stringify(value, BufferJSON.replacer),
      ttl,
    }),
  })
}

const kvDel = async (key) => {
  await call('/session/delete', {
    method: 'POST',
    body: JSON.stringify({ key }),
  })
}

export const useKVAuthState = async () => {
  let creds = (await kvGet('creds')) || initAuthCreds()

  // Debounce writes — KV free tier has 1000 writes/day.
  // saveCreds batches them to once per minute.
  let saveTimer = null
  const saveCreds = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      await kvSet('creds', creds).catch(console.error)
    }, 60_000)
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const out = {}
          await Promise.all(ids.map(async (id) => {
            out[id] = await kvGet(`key-${type}-${id}`).catch(() => null)
          }))
          return out
        },
        set: async (data) => {
          const ops = []
          for (const [category, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              ops.push(
                value != null
                  ? kvSet(`key-${category}-${id}`, value)
                  : kvDel(`key-${category}-${id}`)
              )
            }
          }
          await Promise.all(ops)
        },
      },
    },
    saveCreds,
  }
}
