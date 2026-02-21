// commands/automation/chatbot.js
// Commands: .chatbot | .autoreplygc
//
// These are GROUP-SPECIFIC toggles — stored per group JID.
// The actual AI reply logic lives in index.js (reads this flag before calling AI).
//
// Worker endpoint:
//   GET  /bot/gsettings?gid=...          → get group settings
//   POST /bot/gsettings                  → { gid, key, value }

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

const getGS = (gid) => w(`/bot/gsettings?gid=${encodeURIComponent(gid)}`)
const setGS = (gid, key, value) => w('/bot/gsettings', {
  method: 'POST',
  body:   JSON.stringify({ gid, key, value }),
})

export default [

  // ── .chatbot ──────────────────────────────────────────
  {
    command:  'chatbot',
    aliases:  ['autoreply', 'autoai'],
    category: 'automation',
    description: 'Enable AI auto-reply in DMs with the bot (admin/owner only for groups)',
    usage:    '.chatbot on/off',
    example:  '.chatbot on',

    handler: async (sock, msg, args, ctx) => {
      // In DMs — only owner can toggle
      if (!ctx.isGroup && !ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can toggle chatbot mode in DMs.'
        }, { quoted: msg })
      }

      // In groups — only admins can toggle
      if (ctx.isGroup && !ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can toggle chatbot mode.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.chatbot || res?.chatbot || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `🤖 *Chatbot Mode*`,
            ``,
            `Current status: *${current.toUpperCase()}*`,
            ``,
            ctx.isGroup
              ? `When ON, the bot replies to every message in this group using AI.`
              : `When ON, the bot replies to every DM with AI.`,
            ``,
            `Usage: \`${ctx.prefix}chatbot on\` or \`${ctx.prefix}chatbot off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Use `on` or `off`.'
        }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'chatbot', input)

        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `🤖 *Chatbot Enabled*\n\nThe bot will now auto-reply to messages using AI.\n\n_Admins can turn this off with \`${ctx.prefix}chatbot off\`_`
            : `🤖 *Chatbot Disabled*\n\nAI auto-reply has been turned off.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .autoreplygc ──────────────────────────────────────
  {
    command:  'autoreplygc',
    aliases:  ['gcautoreply', 'groupchatbot'],
    category: 'automation',
    description: 'Enable AI auto-reply specifically for group messages (admin only)',
    usage:    '.autoreplygc on/off',
    example:  '.autoreplygc on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups. Use .chatbot in DMs.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can toggle group auto-reply.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.autoreplygc || res?.autoreplygc || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `💬 *Group Auto-Reply*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `When ON, every group message gets an AI response.`,
            `_Note: Bot must have Groq/Gemini key set to function._`,
            ``,
            `Usage: \`${ctx.prefix}autoreplygc on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'autoreplygc', input)

        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `💬 *Group Auto-Reply Enabled*\n\nI will now respond to every message in this group with AI.\n\n_Use \`${ctx.prefix}autoreplygc off\` to stop._`
            : `💬 *Group Auto-Reply Disabled*\n\nI will only respond to direct commands now.`
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
