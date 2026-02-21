import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
} from '@whiskeysockets/baileys'

import pino    from 'pino'
import express from 'express'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir   = dirname(fileURLToPath(import.meta.url))
const CMDS    = join(__dir, '../commands')
const WORKER  = 'https://firekid-worker.ahmedayomide1000.workers.dev'
const PORT    = process.env.PORT || 3000
const SECRET  = process.env.RENDER_SECRET

if (!SECRET) {
  console.error('[FATAL] RENDER_SECRET is not set')
  process.exit(0)
}

const app = express()
app.use(express.json())

const pairingSessions = new Map()

const callWorker = async (path, opts = {}) => {
  const r = await fetch(`${WORKER}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Render-Secret': SECRET,
      ...opts.headers,
    },
  })
  return r.json().catch(() => ({}))
}

const auth = (req, res, next) => {
  if (req.headers['x-render-secret'] !== SECRET)
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  next()
}

app.get('/health', (req, res) => {
  res.json({ ok: true, pairingSessions: pairingSessions.size })
})

app.post('/internal/pair', auth, async (req, res) => {
  const { phone, pendingId, botMode } = req.body
  if (!phone || !pendingId) return res.status(400).json({ ok: false, error: 'phone and pendingId required' })

  const cleanPhone = phone.replace(/\D/g, '')

  if (pairingSessions.has(pendingId)) {
    return res.status(409).json({ ok: false, error: 'Pairing already in progress for this ID' })
  }

  res.json({ ok: true, message: 'Pairing started' })

  startPairing(cleanPhone, pendingId, botMode || 'prod').catch(e => {
    console.error('[Pair] Error:', e.message)
    pairingSessions.delete(pendingId)
  })
})

app.post('/internal/command', auth, async (req, res) => {
  const { action, sessionId, payload } = req.body

  if (action === 'reload') {
    await callWorker('/render/session/set', {
      method: 'POST',
      body: JSON.stringify({ sessionId, key: 'cmd:reload', value: '1', ttl: 60 }),
    })
    return res.json({ ok: true, message: 'Reload flag set' })
  }

  res.status(400).json({ ok: false, error: 'Unknown action' })
})

app.get('/internal/commands/bundle', auth, (req, res) => {
  const files = {}

  const walk = (dir, base = '') => {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const full = join(dir, entry)
      const rel  = base ? `${base}/${entry}` : entry
      if (statSync(full).isDirectory()) {
        walk(full, rel)
      } else if (entry.endsWith('.js')) {
        try {
          files[rel] = readFileSync(full, 'utf8')
        } catch {}
      }
    }
  }

  try {
    walk(CMDS)
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Could not read commands directory' })
  }

  res.json({ ok: true, files })
})

const startPairing = async (phone, pendingId, botMode) => {
  pairingSessions.set(pendingId, { phone, botMode, status: 'starting' })

  const { version } = await fetchLatestBaileysVersion()

  const tempAuth = await useMultiFileAuthState(`/tmp/pair_${pendingId}`)

  const sock = makeWASocket({
    version,
    auth:               tempAuth.state,
    logger:             pino({ level: 'silent' }),
    printQRInTerminal:  false,
    markOnlineOnConnect: false,
    browser:            Browsers.macOS('Safari'),
    syncFullHistory:    false,
    connectTimeoutMs:   60_000,
    getMessage: async () => ({ conversation: '' }),
  })

  sock.ev.on('creds.update', tempAuth.saveCreds)

  let sessionId = null
  let codeRequested = false

  const cleanup = () => {
    pairingSessions.delete(pendingId)
    try { sock.end() } catch {}
  }

  const timeout = setTimeout(() => {
    console.log(`[Pair] Timeout for ${pendingId}`)
    cleanup()
  }, 3 * 60 * 1000)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      clearTimeout(timeout)

      const phone = sock.user?.id?.split(':')[0] || ''
      const ownerJid = sock.user?.id ? sock.user.id.replace(/:\d+/, '') + '@s.whatsapp.net' : ''

      sessionId = `firekidxmd_${Math.random().toString(36).slice(2, 14)}`

      const credsRaw = JSON.stringify(tempAuth.state.creds, (k, v) =>
        v?.type === 'Buffer' ? { type: 'Buffer', data: Array.from(v.data || v) } : v
      )

      await callWorker('/render/session/set', {
        method: 'POST',
        body: JSON.stringify({ sessionId, key: 'creds', value: credsRaw }),
      })

      await callWorker('/render/session/finalize', {
        method: 'POST',
        body: JSON.stringify({ sessionId, phone, ownerJid, botMode }),
      })

      pairingSessions.set(pendingId, { ...pairingSessions.get(pendingId), sessionId, status: 'connected' })

      await callWorker('/render/paircode', {
        method: 'POST',
        body: JSON.stringify({ pendingId, code: sessionId, phone }),
      })

      console.log(`[Pair] ✅ Session created: ${sessionId}`)

      setTimeout(cleanup, 5000)
    }

    if (connection === 'close') {
      clearTimeout(timeout)
      cleanup()
    }

    if (!codeRequested && !sock.authState.creds.registered) {
      codeRequested = true
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phone)
          await callWorker('/render/paircode', {
            method: 'POST',
            body: JSON.stringify({ pendingId, code, phone }),
          })
          console.log(`[Pair] Code for ${phone}: ${code}`)
        } catch (e) {
          console.error('[Pair] Code error:', e.message)
        }
      }, 3000)
    }
  })
}

const selfPing = () => {
  const url = process.env.RENDER_EXTERNAL_URL
  if (url) fetch(`${url}/health`).catch(() => {})
}

app.listen(PORT, () => {
  console.log(`[Backend] Running on :${PORT}`)
  setInterval(selfPing, 10 * 60 * 1000)
})
