// commands/anti/antiother.js
// Commands: .antinsfw | .anticall | .antibug | .antitemu | .floodblock

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

const BOT_ID = () => process.env.BOT_ID || 'default'

const getGS     = (gid) => w(`/bot/gsettings?gid=${encodeURIComponent(gid)}`)
const setGS     = (gid, key, value) => w('/bot/gsettings', {
  method: 'POST',
  body:   JSON.stringify({ gid, key, value }),
})
const setSetting = (key, value) => w('/bot/settings', {
  method: 'POST',
  body:   JSON.stringify({ botId: BOT_ID(), key, value }),
})
const getSetting = (key) => w(`/bot/settings?botId=${BOT_ID()}&key=${key}`)

export default [

  // ── .antinsfw ─────────────────────────────────────────
  {
    command:  'antinsfw',
    aliases:  ['nsfwblock', 'blocknsfw'],
    category: 'anti',
    description: 'Block NSFW images using AI detection (requires NSFW detection enabled in Worker)',
    usage:    '.antinsfw on/off',
    example:  '.antinsfw on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure NSFW protection.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.antinsfw || res?.antinsfw || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `🔞 *Anti-NSFW*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `When ON, images sent in the group are scanned by AI.`,
            `NSFW images are automatically deleted and the sender warned.`,
            ``,
            `_Note: The Worker must have NSFW detection enabled._`,
            ``,
            `Usage: \`${ctx.prefix}antinsfw on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      if (input === 'on' && !ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to enforce NSFW protection.'
        }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'antinsfw', input)
        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `🔞 *Anti-NSFW Enabled*\n\nImages will be scanned. NSFW content will be deleted and sender warned.`
            : `🔞 *Anti-NSFW Disabled*\n\nNSFW image detection is off.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .anticall ─────────────────────────────────────────
  {
    command:  'anticall',
    aliases:  ['blockcall', 'rejectcall'],
    category: 'anti',
    description: 'Auto-reject all incoming WhatsApp calls to the bot (owner only)',
    usage:    '.anticall on/off',
    example:  '.anticall on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can configure call rejection.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getSetting('anticall')
        const current = res?.value || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `📵 *Anti-Call*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `When ON, any incoming call to the bot is automatically rejected.`,
            `The caller receives a polite "Bot cannot receive calls" message.`,
            ``,
            `Usage: \`${ctx.prefix}anticall on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      try {
        await setSetting('anticall', input)
        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `📵 *Anti-Call Enabled*\n\nAll incoming calls will be automatically rejected.`
            : `📵 *Anti-Call Disabled*\n\nCalls will no longer be auto-rejected.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .antibug ──────────────────────────────────────────
  {
    command:  'antibug',
    aliases:  ['anticrash', 'crashprotect'],
    category: 'anti',
    description: 'Protect the group against WhatsApp crash/bug messages',
    usage:    '.antibug on/off',
    example:  '.antibug on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure crash protection.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.antibug || res?.antibug || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `🛡️ *Anti-Bug*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `Protects against known WhatsApp crash/bug message patterns.`,
            `Suspicious messages are deleted before they can crash the app.`,
            ``,
            `Usage: \`${ctx.prefix}antibug on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      if (input === 'on' && !ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to enforce crash protection.'
        }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'antibug', input)
        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `🛡️ *Anti-Bug Enabled*\n\nGroup is now protected against crash/bug messages.`
            : `🛡️ *Anti-Bug Disabled*\n\nCrash protection is off.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .antitemu ─────────────────────────────────────────
  {
    command:  'antitemu',
    aliases:  ['antispam', 'blockads'],
    category: 'anti',
    description: 'Block Temu, Shein and other shopping spam links automatically',
    usage:    '.antitemu on/off',
    example:  '.antitemu on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure spam protection.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.antitemu || res?.antitemu || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `🛒 *Anti-Shopping Spam*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `Blocks messages containing links to:`,
            `• Temu • Shein • AliExpress • Jumia affiliate`,
            `• Other known shopping spam domains`,
            ``,
            `Usage: \`${ctx.prefix}antitemu on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      if (input === 'on' && !ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to delete spam messages.'
        }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'antitemu', input)
        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `🛒 *Anti-Shopping Spam Enabled*\n\nTemu, Shein and similar spam links will be auto-deleted.`
            : `🛒 *Anti-Shopping Spam Disabled*\n\nShopping spam filter is off.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  },

  // ── .floodblock ───────────────────────────────────────
  {
    command:  'floodblock',
    aliases:  ['antiflood', 'ratelimit'],
    category: 'anti',
    description: 'Block rapid message flooding — kick/mute members who spam too fast',
    usage:    '.floodblock on/off [limit]  (default: 5 messages in 5 seconds)',
    example:  '.floodblock on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure flood protection.'
        }, { quoted: msg })
      }

      const input = ctx.args[0]?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.floodblock  || res?.floodblock  || 'off'
        const limit   = res?.data?.flood_limit || res?.flood_limit || 5

        return sock.sendMessage(ctx.from, {
          text: [
            `🌊 *Flood Protection*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            `Message limit: *${limit} messages in 5 seconds*`,
            ``,
            `When triggered, the member's messages are deleted and they are warned.`,
            `At 3 flood violations, they are kicked.`,
            ``,
            `Usage:`,
            `\`${ctx.prefix}floodblock on\`      — enable with default (5 msg/5s)`,
            `\`${ctx.prefix}floodblock on 3\`    — enable with custom limit`,
            `\`${ctx.prefix}floodblock off\`     — disable`,
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      if (input === 'on' && !ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to enforce flood protection.'
        }, { quoted: msg })
      }

      // Optional custom limit
      const limitArg = ctx.args[1] ? parseInt(ctx.args[1], 10) : null
      const limit    = (limitArg && limitArg >= 2 && limitArg <= 20) ? limitArg : 5

      try {
        await Promise.all([
          setGS(ctx.from, 'floodblock', input),
          input === 'on' ? setGS(ctx.from, 'flood_limit', limit) : Promise.resolve(),
        ])

        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `🌊 *Flood Protection Enabled*\n\nMembers who send more than *${limit} messages in 5 seconds* will be warned then kicked.`
            : `🌊 *Flood Protection Disabled*\n\nRate limiting is off.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  }

]
