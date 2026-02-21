// commands/automation/autobio.js
// Commands: .autobio | .schedmsg

// ── Worker helper ─────────────────────────────────────────
const w = async (path, opts = {}) => {
  try {
    const r = await fetch(`${process.env.WORKER_URL}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Secret': process.env.BOT_SECRET,
        ...opts.headers,
      },
    })
    return await r.json()
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

const BOT_ID     = () => process.env.BOT_ID || 'default'
const setSetting = (key, value) => w('/bot/settings', {
  method: 'POST',
  body:   JSON.stringify({ botId: BOT_ID(), key, value }),
})
const getSetting = (key) => w(`/bot/settings?botId=${BOT_ID()}&key=${key}`)

// Scheduled messages stored as an array of tasks in KV
const getScheduled = () => w(`/bot/schedmsg?botId=${BOT_ID()}`)
const addScheduled = (task) => w('/bot/schedmsg', {
  method: 'POST',
  body:   JSON.stringify({ botId: BOT_ID(), task }),
})
const delScheduled = (taskId) => w('/bot/schedmsg', {
  method: 'DELETE',
  body:   JSON.stringify({ botId: BOT_ID(), taskId }),
})

// Parse a simple time expression like "2h", "30m", "1d", "10s"
const parseDelay = (str) => {
  const m = str?.trim().match(/^(\d+)(s|m|h|d)$/i)
  if (!m) return null
  const n  = parseInt(m[1], 10)
  const u  = m[2].toLowerCase()
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  return n * ms[u]
}

// Rotating bio presets — index.js cron rotates these every hour
const BIO_PRESETS = [
  'Firekid XMD 🔥 | Always Online',
  'Firekid XMD 🤖 | Making Group Life Easy',
  'Firekid XMD ⚡ | The Fastest Bot on WhatsApp',
  'Firekid XMD 💎 | Premium Features, Free to Use',
  '🔥 Powered by Firekid XMD | {time}',   // {time} replaced by runner
]

export default [

  // ── .autobio ──────────────────────────────────────────
  {
    command:  'autobio',
    aliases:  ['autobio', 'rotatebio'],
    category: 'automation',
    description: 'Auto-rotate the bot\'s WhatsApp bio/status every hour',
    usage:    '.autobio on/off',
    example:  '.autobio on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can change the bot\'s bio settings.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      // No arg — show current status and available presets
      if (!input) {
        const res     = await getSetting('autobio')
        const current = res?.value || 'off'

        const presetList = BIO_PRESETS.map((p, i) => `${i + 1}. _${p}_`).join('\n')

        return sock.sendMessage(ctx.from, {
          text: [
            `✏️ *Auto-Bio*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `When ON, bot bio rotates every hour through:`,
            presetList,
            ``,
            `Usage:`,
            `\`${ctx.prefix}autobio on\`   — enable rotation`,
            `\`${ctx.prefix}autobio off\`  — disable`,
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      try {
        await setSetting('autobio', input)

        if (input === 'on') {
          // Set the first bio immediately
          const firstBio = BIO_PRESETS[0].replace('{time}', new Date().toLocaleTimeString())
          try { await sock.updateProfileStatus(firstBio) } catch {}
        }

        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `✏️ *Auto-Bio Enabled*\n\nBot bio will now rotate every hour automatically.`
            : `✏️ *Auto-Bio Disabled*\n\nBio rotation stopped.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .schedmsg ─────────────────────────────────────────
  {
    command:  'schedmsg',
    aliases:  ['schedule', 'remind', 'timer'],
    category: 'automation',
    description: 'Schedule a message to be sent after a delay',
    usage:    '.schedmsg <delay> <message>  (e.g. .schedmsg 2h Good morning!)',
    example:  '.schedmsg 30m Practice session starts in 30 minutes!',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isAdmin && !ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins or the bot owner can schedule messages.'
        }, { quoted: msg })
      }

      // Sub-command: .schedmsg list
      if (ctx.query?.toLowerCase() === 'list') {
        try {
          const res   = await getScheduled()
          const tasks = res?.data || res?.tasks || []

          if (!tasks.length) {
            return sock.sendMessage(ctx.from, {
              text: `📋 No scheduled messages.\n\nCreate one with:\n${ctx.prefix}schedmsg <delay> <message>`
            }, { quoted: msg })
          }

          const now   = Date.now()
          const lines = tasks.map((t, i) => {
            const remaining = Math.max(0, t.sendAt - now)
            const hrs  = Math.floor(remaining / 3_600_000)
            const mins = Math.floor((remaining % 3_600_000) / 60_000)
            const eta  = remaining > 0 ? `in ${hrs}h ${mins}m` : 'sending soon'
            return `${i + 1}. [ID: ${t.id}] "${t.text.slice(0, 40)}..." — *${eta}*`
          })

          return sock.sendMessage(ctx.from, {
            text: [`📋 *Scheduled Messages (${tasks.length})*`, ``, ...lines].join('\n')
          }, { quoted: msg })
        } catch (err) {
          return sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
        }
      }

      // Sub-command: .schedmsg cancel <id>
      if (ctx.args[0]?.toLowerCase() === 'cancel') {
        const taskId = ctx.args[1]
        if (!taskId) {
          return sock.sendMessage(ctx.from, {
            text: `❌ Provide the task ID.\n${ctx.prefix}schedmsg cancel <id>`
          }, { quoted: msg })
        }

        try {
          await delScheduled(taskId)
          return sock.sendMessage(ctx.from, {
            text: `✅ Scheduled message [${taskId}] cancelled.`
          }, { quoted: msg })
        } catch (err) {
          return sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
        }
      }

      // New schedule: .schedmsg <delay> <message>
      if (!ctx.args.length) {
        return sock.sendMessage(ctx.from, {
          text: [
            `⏰ *Schedule a Message*`,
            ``,
            `*Usage:*`,
            `${ctx.prefix}schedmsg <delay> <message>`,
            ``,
            `*Delay formats:*`,
            `• 30s  = 30 seconds`,
            `• 10m  = 10 minutes`,
            `• 2h   = 2 hours`,
            `• 1d   = 1 day`,
            ``,
            `*Example:*`,
            `${ctx.prefix}schedmsg 2h Meeting starts in 2 hours!`,
            ``,
            `*Other commands:*`,
            `${ctx.prefix}schedmsg list        — view all scheduled`,
            `${ctx.prefix}schedmsg cancel <id> — cancel a task`
          ].join('\n')
        }, { quoted: msg })
      }

      const delayStr = ctx.args[0]
      const delayMs  = parseDelay(delayStr)

      if (!delayMs) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Invalid delay format. Use \`30s\`, \`10m\`, \`2h\`, \`1d\`.`
        }, { quoted: msg })
      }

      if (delayMs < 10_000) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Minimum delay is 10 seconds.`
        }, { quoted: msg })
      }

      if (delayMs > 7 * 86_400_000) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Maximum delay is 7 days.`
        }, { quoted: msg })
      }

      const text = ctx.args.slice(1).join(' ').trim()

      if (!text) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a message to schedule.`
        }, { quoted: msg })
      }

      try {
        const taskId  = Math.random().toString(36).slice(2, 8).toUpperCase()
        const sendAt  = Date.now() + delayMs

        const task = {
          id:      taskId,
          chatJid: ctx.from,
          text,
          sendAt,
          createdBy: ctx.sender,
        }

        await addScheduled(task)

        const hrStr  = Math.floor(delayMs / 3_600_000)
        const minStr = Math.floor((delayMs % 3_600_000) / 60_000)
        const secStr = Math.floor((delayMs % 60_000) / 1_000)
        const parts  = []
        if (hrStr)  parts.push(`${hrStr}h`)
        if (minStr) parts.push(`${minStr}m`)
        if (secStr && !hrStr) parts.push(`${secStr}s`)

        await sock.sendMessage(ctx.from, {
          text: [
            `⏰ *Message Scheduled!*`,
            ``,
            `📝 Message: _"${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"_`,
            `⏳ Sends in: *${parts.join(' ')}*`,
            `🆔 Task ID: \`${taskId}\``,
            ``,
            `_Cancel with: ${ctx.prefix}schedmsg cancel ${taskId}_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
