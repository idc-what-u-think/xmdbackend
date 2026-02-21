// commands/automation/toggle.js
// Commands: .autoread | .autoviewstatus | .autoreactstatus | .alwaysonline
//           .autotyping | .autorecording | .autoreact | .autoforward
//
// These are OWNER-ONLY bot-wide toggles.
// They store a flag in the Worker KV. The actual enforcement
// logic lives in the main index.js event listener which reads
// these flags to decide what to do.
//
// Worker endpoint used:
//   GET  /bot/settings?botId=...        → get all bot settings
//   POST /bot/settings                  → { botId, key, value } set a setting

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

const BOT_ID      = () => process.env.BOT_ID || 'default'
const getSetting  = (key) => w(`/bot/settings?botId=${BOT_ID()}&key=${key}`)
const setSetting  = (key, value) => w('/bot/settings', {
  method: 'POST',
  body:   JSON.stringify({ botId: BOT_ID(), key, value }),
})

// Generic toggle builder — keeps each command handler dry
const makeToggle = (key, onLabel, offLabel, emoji) => async (sock, msg, args, ctx) => {
  if (!ctx.isOwner && !ctx.isSudo) {
    return sock.sendMessage(ctx.from, {
      text: '❌ Only the bot owner or sudo users can change this setting.'
    }, { quoted: msg })
  }

  const input = ctx.query?.toLowerCase().trim()

  // If no arg — show current status
  if (!input) {
    const res     = await getSetting(key)
    const current = res?.value || 'off'
    return sock.sendMessage(ctx.from, {
      text: `${emoji} *${onLabel}*\n\nCurrent status: *${current.toUpperCase()}*\n\nUsage: \`${ctx.prefix}${key} on\` or \`${ctx.prefix}${key} off\``
    }, { quoted: msg })
  }

  if (!['on', 'off'].includes(input)) {
    return sock.sendMessage(ctx.from, {
      text: `❌ Invalid option. Use \`on\` or \`off\`.`
    }, { quoted: msg })
  }

  try {
    await setSetting(key, input)

    const label = input === 'on' ? onLabel : offLabel
    await sock.sendMessage(ctx.from, {
      text: `${emoji} *${label}*\n\n${key} has been turned *${input.toUpperCase()}*.`
    }, { quoted: msg })
  } catch (err) {
    await sock.sendMessage(ctx.from, {
      text: `❌ Failed: ${err.message}`
    }, { quoted: msg })
  }
}

export default [

  // ── .autoread ─────────────────────────────────────────
  {
    command:  'autoread',
    aliases:  ['autoread'],
    category: 'automation',
    description: 'Auto-read all incoming messages (sends read receipts automatically)',
    usage:    '.autoread on/off',
    example:  '.autoread on',
    handler:  makeToggle('autoread', 'Auto-Read Enabled', 'Auto-Read Disabled', '📖')
  },

  // ── .autoviewstatus ───────────────────────────────────
  {
    command:  'autoviewstatus',
    aliases:  ['autostatus', 'viewstatus'],
    category: 'automation',
    description: 'Auto-view all WhatsApp status updates',
    usage:    '.autoviewstatus on/off',
    example:  '.autoviewstatus on',
    handler:  makeToggle('autoviewstatus', 'Auto-View Status Enabled', 'Auto-View Status Disabled', '👁️')
  },

  // ── .autoreactstatus ──────────────────────────────────
  {
    command:  'autoreactstatus',
    aliases:  ['statusreact'],
    category: 'automation',
    description: 'Auto-react to WhatsApp status updates with a random emoji',
    usage:    '.autoreactstatus on/off',
    example:  '.autoreactstatus on',
    handler:  makeToggle('autoreactstatus', 'Auto-React Status Enabled', 'Auto-React Status Disabled', '🔥')
  },

  // ── .alwaysonline ─────────────────────────────────────
  {
    command:  'alwaysonline',
    aliases:  ['online', 'stayonline'],
    category: 'automation',
    description: 'Keep the bot always appearing as online on WhatsApp',
    usage:    '.alwaysonline on/off',
    example:  '.alwaysonline on',
    handler:  makeToggle('alwaysonline', 'Always Online Enabled', 'Always Online Disabled', '🟢')
  },

  // ── .autotyping ───────────────────────────────────────
  {
    command:  'autotyping',
    aliases:  ['typeindicator'],
    category: 'automation',
    description: 'Show typing indicator while the bot is processing commands',
    usage:    '.autotyping on/off',
    example:  '.autotyping on',
    handler:  makeToggle('autotyping', 'Auto-Typing Enabled', 'Auto-Typing Disabled', '⌨️')
  },

  // ── .autorecording ────────────────────────────────────
  {
    command:  'autorecording',
    aliases:  ['recordindicator'],
    category: 'automation',
    description: 'Show recording indicator while bot is processing audio commands',
    usage:    '.autorecording on/off',
    example:  '.autorecording on',
    handler:  makeToggle('autorecording', 'Auto-Recording Enabled', 'Auto-Recording Disabled', '🎙️')
  },

  // ── .autoreact ────────────────────────────────────────
  {
    command:  'autoreact',
    aliases:  ['autoemoji'],
    category: 'automation',
    description: 'Auto-react to incoming messages with random emojis',
    usage:    '.autoreact on/off',
    example:  '.autoreact on',
    handler:  makeToggle('autoreact', 'Auto-React Enabled', 'Auto-React Disabled', '😄')
  },

  // ── .autoforward ──────────────────────────────────────
  {
    command:  'autoforward',
    aliases:  ['forward'],
    category: 'automation',
    description: 'Forward every incoming message to the bot owner\'s DM',
    usage:    '.autoforward on/off',
    example:  '.autoforward on',
    handler:  makeToggle('autoforward', 'Auto-Forward Enabled', 'Auto-Forward Disabled', '📨')
  },

]
