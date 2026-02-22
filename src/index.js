import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  delay,
} from '@whiskeysockets/baileys'

import pino    from 'pino'
import express from 'express'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir   = dirname(fileURLToPath(import.meta.url))
const CMDS    = join(__dir, '../commands')
const WORKER  = 'https://firekidxmd-cloud.ahmedayomide1000.workers.dev'
const PORT    = process.env.PORT || 3000
const SECRET  = 'ahmed@ibmk'


const WELCOME_IMAGES = [
  'https://i.ibb.co/n81GNX2q/photo-1-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/jPSrqT0M/photo-2-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/1fFBtT8T/photo-3-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/TDbkbVM4/photo-4-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/V0Z67w1k/photo-5-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/Vcjtr25J/photo-6-2026-02-21-16-33-08.jpg',
  'https://i.ibb.co/Hf4vWL7Z/photo-7-2026-02-21-16-33-08.jpg',
]

const randomImage = () => WELCOME_IMAGES[Math.floor(Math.random() * WELCOME_IMAGES.length)]

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
  const { action, sessionId } = req.body

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
        try { files[rel] = readFileSync(full, 'utf8') } catch {}
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

const startPairing = async (phone, pendingId, botMode, codeAlreadySent = false) => {
  console.log(`[Pair] Starting pairing for ${phone} (pendingId: ${pendingId})`)
  pairingSessions.set(pendingId, { phone, botMode, status: 'starting' })

  const { version } = await fetchLatestBaileysVersion()
  console.log(`[Pair] Using Baileys WA version: ${version.join('.')}`)

  const tempAuth = await useMultiFileAuthState(`/tmp/pair_${pendingId}`)

  const sock = makeWASocket({
    version,
    auth:                tempAuth.state,
    logger:              pino({ level: 'silent' }),
    printQRInTerminal:   false,
    markOnlineOnConnect: false,
    browser:             Browsers.macOS('Safari'),
    syncFullHistory:     false,
    connectTimeoutMs:    60_000,
    getMessage: async () => ({ conversation: '' }),
  })

  sock.ev.on('creds.update', tempAuth.saveCreds)

  let codeRequested = codeAlreadySent

  const cleanup = () => {
    pairingSessions.delete(pendingId)
    try { sock.end() } catch {}
  }

  const timeout = setTimeout(() => {
    console.log(`[Pair] Timeout for pendingId: ${pendingId}`)
    cleanup()
  }, 3 * 60 * 1000)

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    console.log(`[Pair] connection.update → ${connection || 'n/a'} (pendingId: ${pendingId})`)

    // ── REQUEST PAIRING CODE ───────────────────────────────────────────────
    // Must be called when connection === 'connecting', per Baileys 2025 docs.
    // A 1500ms delay lets the WebSocket handshake complete first.
    if (connection === 'connecting' && !codeRequested && !sock.authState.creds.registered) {
      codeRequested = true
      console.log(`[Pair] Waiting 1500ms then requesting pairing code for ${phone}...`)
      await delay(1500)
      try {
        const code = await sock.requestPairingCode(phone)
        console.log(`[Pair] Code for ${phone}: ${code}`)

        await callWorker('/render/paircode', {
          method: 'POST',
          body: JSON.stringify({ pendingId, code, phone }),
        })
        console.log(`[Pair] Code pushed to worker KV for dashboard`)
      } catch (e) {
        console.error(`[Pair] requestPairingCode failed: ${e.message}`)
      }
    }

    // ── SESSION CONNECTED ──────────────────────────────────────────────────
    if (connection === 'open') {
      clearTimeout(timeout)
      console.log(`[Pair] Connection open for ${phone} — saving session`)

      const userPhone  = sock.user?.id?.split(':')[0] || phone
      const ownerJid   = sock.user?.id
        ? sock.user.id.replace(/:\d+/, '') + '@s.whatsapp.net'
        : phone + '@s.whatsapp.net'

      const sessionId = `firekidxmd_${Math.random().toString(36).slice(2, 14)}`
      console.log(`[Pair] Generated sessionId: ${sessionId}`)

      // Serialize creds for remote storage
      const credsRaw = JSON.stringify(tempAuth.state.creds, (k, v) =>
        v?.type === 'Buffer' ? { type: 'Buffer', data: Array.from(v.data || v) } : v
      )

      await callWorker('/render/session/set', {
        method: 'POST',
        body: JSON.stringify({ sessionId, key: 'creds', value: credsRaw }),
      })

      await callWorker('/render/session/finalize', {
        method: 'POST',
        body: JSON.stringify({ sessionId, phone: userPhone, ownerJid, botMode, pendingId }),
      })

      // Update dashboard pair status with the new sessionId
      await callWorker('/render/paircode', {
        method: 'POST',
        body: JSON.stringify({ pendingId, code: sessionId, phone: userPhone }),
      })

      pairingSessions.set(pendingId, {
        ...pairingSessions.get(pendingId),
        sessionId,
        status: 'connected',
      })

      console.log(`[Pair] Session finalized: ${sessionId} for ${userPhone}`)

      // ── WELCOME DM ────────────────────────────────────────────────────────
      // Send a welcome message to the bot owner's own chat (bot messages itself)
      try {
        await delay(2000)
        const img = randomImage()
        await sock.sendMessage(ownerJid, {
          image: { url: img },
          caption: `*Welcome To Firekid Dex v1*\n\nYour bot is now live and ready to use.\nType *.menu* to see all available commands.\n\nSession ID has been saved — add it to your Render environment variables to keep your session active.`,
        })
        console.log(`[Pair] Welcome DM sent to ${ownerJid}`)
      } catch (e) {
        console.error(`[Pair] Welcome DM failed: ${e.message}`)
      }

      setTimeout(cleanup, 8000)
    }

    // ── DISCONNECTED ───────────────────────────────────────────────────────
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      console.log(`[Pair] Connection closed, code: ${code} (pendingId: ${pendingId})`)

      // 515 = stream error / restart required — WhatsApp accepted the code but
      // dropped the socket mid-handshake. Reconnect once to complete the session.
      if (code === 515) {
        console.log(`[Pair] 515 restart required — reconnecting to complete session...`)
        try { sock.end() } catch {}
        await delay(2000)
        startPairing(phone, pendingId, botMode, true).catch(e => {
          console.error('[Pair] Reconnect after 515 failed:', e.message)
          pairingSessions.delete(pendingId)
        })
        return
      }

      clearTimeout(timeout)
      cleanup()
    }
  })
}

// ── SELF PING ──────────────────────────────────────────────────────────────
const selfPing = async () => {
  const url = process.env.RENDER_EXTERNAL_URL
  if (!url) return
  try {
    const r = await fetch(`${url}/health`)
    const d = await r.json().catch(() => ({}))
    console.log(`[Ping] Self-ping OK — pairingSessions: ${d.pairingSessions ?? '?'}`)
  } catch (e) {
    console.error(`[Ping] Self-ping failed: ${e.message}`)
  }
}

app.listen(PORT, () => {
  console.log(`[Backend] Running on :${PORT}`)
  selfPing()
  setInterval(selfPing, 10 * 60 * 1000)
})
