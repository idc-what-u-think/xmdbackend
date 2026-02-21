// commands/owner/mode.js
// Commands: .mode-public | .mode-private | .sudo | .delsudo | .listsudo

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

export default [

  // ── .mode-public ──────────────────────────────────────
  {
    command:  'mode-public',
    aliases:  ['public', 'publicmode'],
    category: 'owner',
    description: 'Allow everyone to use the bot (public mode)',
    usage:    '.mode-public',
    example:  '.mode-public',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can change bot mode.'
        }, { quoted: msg })
      }

      try {
        await setSetting('mode', 'public')
        process.env.BOT_MODE = 'PUBLIC'

        await sock.sendMessage(ctx.from, {
          text: [
            `🌍 *Bot Mode: PUBLIC*`,
            ``,
            `✅ Everyone can now use the bot.`,
            `All commands are accessible to all users.`,
            ``,
            `_Use ${ctx.prefix}mode-private to restrict access_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .mode-private ─────────────────────────────────────
  {
    command:  'mode-private',
    aliases:  ['private', 'privatemode'],
    category: 'owner',
    description: 'Restrict bot to owner only (private mode)',
    usage:    '.mode-private',
    example:  '.mode-private',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can change bot mode.'
        }, { quoted: msg })
      }

      try {
        await setSetting('mode', 'private')
        process.env.BOT_MODE = 'PRIVATE'

        await sock.sendMessage(ctx.from, {
          text: [
            `🔒 *Bot Mode: PRIVATE*`,
            ``,
            `✅ Bot is now restricted to owner only.`,
            `Other users will be ignored.`,
            ``,
            `_Use ${ctx.prefix}mode-public to open access_`
          ].join('\n')
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .sudo ─────────────────────────────────────────────
  {
    command:  'sudo',
    aliases:  ['addsudo', 'addmod'],
    category: 'owner',
    description: 'Grant a user sudo/moderator access to the bot',
    usage:    '.sudo @user',
    example:  '.sudo @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can manage sudo users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user to grant sudo.\n📌 *Usage:* ${ctx.prefix}sudo @user`
        }, { quoted: msg })
      }

      if (targetJid === ctx.sender) {
        return sock.sendMessage(ctx.from, {
          text: '❌ You are already the owner — no need to add yourself as sudo.'
        }, { quoted: msg })
      }

      try {
        const res      = await getSetting('sudo_list')
        const sudoList = Array.isArray(res?.value) ? res.value : []

        if (sudoList.includes(targetJid)) {
          return sock.sendMessage(ctx.from, {
            text: `⚠️ @${targetJid.split('@')[0]} is already a sudo user.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        sudoList.push(targetJid)
        await setSetting('sudo_list', sudoList)

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Sudo Access Granted*`,
            ``,
            `👤 @${targetJid.split('@')[0]} is now a sudo user.`,
            ``,
            `They can now use restricted commands.`,
            `_Sudo users: ${sudoList.length}_`
          ].join('\n'),
          mentions: [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .delsudo ──────────────────────────────────────────
  {
    command:  'delsudo',
    aliases:  ['removesudo', 'unmod', 'rmsudo'],
    category: 'owner',
    description: 'Remove sudo access from a user',
    usage:    '.delsudo @user',
    example:  '.delsudo @2348012345678',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner can manage sudo users.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag or reply to the user to remove sudo.\n📌 *Usage:* ${ctx.prefix}delsudo @user`
        }, { quoted: msg })
      }

      try {
        const res      = await getSetting('sudo_list')
        const sudoList = Array.isArray(res?.value) ? res.value : []

        if (!sudoList.includes(targetJid)) {
          return sock.sendMessage(ctx.from, {
            text: `❌ @${targetJid.split('@')[0]} is not a sudo user.`,
            mentions: [targetJid]
          }, { quoted: msg })
        }

        const updated = sudoList.filter(j => j !== targetJid)
        await setSetting('sudo_list', updated)

        await sock.sendMessage(ctx.from, {
          text: [
            `✅ *Sudo Access Removed*`,
            ``,
            `👤 @${targetJid.split('@')[0]} is no longer a sudo user.`,
            `_Sudo users remaining: ${updated.length}_`
          ].join('\n'),
          mentions: [targetJid]
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .listsudo ─────────────────────────────────────────
  {
    command:  'listsudo',
    aliases:  ['sudolist', 'mods', 'listmods'],
    category: 'owner',
    description: 'List all users with sudo access',
    usage:    '.listsudo',
    example:  '.listsudo',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can view the sudo list.'
        }, { quoted: msg })
      }

      try {
        const res      = await getSetting('sudo_list')
        const sudoList = Array.isArray(res?.value) ? res.value : []

        if (!sudoList.length) {
          return sock.sendMessage(ctx.from, {
            text: [
              `👥 *Sudo Users — Empty*`,
              ``,
              `No sudo users yet.`,
              `Add one with ${ctx.prefix}sudo @user`
            ].join('\n')
          }, { quoted: msg })
        }

        const lines    = sudoList.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`)
        const mentions = sudoList

        await sock.sendMessage(ctx.from, {
          text: [
            `👥 *Sudo Users (${sudoList.length})*`,
            `${'─'.repeat(26)}`,
            ``,
            `👑 Owner: @${ctx.botNumber} *(permanent)*`,
            ``,
            ...lines,
            ``,
            `_Remove with ${ctx.prefix}delsudo @user_`
          ].join('\n'),
          mentions
        }, { quoted: msg })

      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
