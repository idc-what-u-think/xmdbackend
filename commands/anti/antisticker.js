// commands/anti/antisticker.js
// Commands: .antisticker | .antimedia | .antimention | .antitag

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

// Generic group-only toggle for anti features
// key is the setting name, label is display name, emoji for message
const makeAntiToggle = (key, label, emoji, note = '') =>
  async (sock, msg, args, ctx) => {
    if (!ctx.isGroup) {
      return sock.sendMessage(ctx.from, {
        text: '❌ This command only works in groups.'
      }, { quoted: msg })
    }

    if (!ctx.isAdmin && !ctx.isOwner) {
      return sock.sendMessage(ctx.from, {
        text: `❌ Only group admins can configure ${label.toLowerCase()}.`
      }, { quoted: msg })
    }

    const input = ctx.query?.toLowerCase().trim()

    if (!input) {
      const res     = await getGS(ctx.from)
      const current = res?.data?.[key] || res?.[key] || 'off'
      return sock.sendMessage(ctx.from, {
        text: [
          `${emoji} *${label}*`,
          ``,
          `Current status: *${current.toUpperCase()}*`,
          note ? `\n_${note}_` : '',
          ``,
          `Usage: \`${ctx.prefix}${key.replace('anti_', 'anti').replace('_', '')} on/off\``
        ].filter(Boolean).join('\n')
      }, { quoted: msg })
    }

    if (!['on', 'off'].includes(input)) {
      return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
    }

    if (input === 'on' && !ctx.isBotAdmin) {
      return sock.sendMessage(ctx.from, {
        text: '❌ I need to be a group admin to enforce this protection.'
      }, { quoted: msg })
    }

    try {
      await setGS(ctx.from, key, input)
      await sock.sendMessage(ctx.from, {
        text: `${emoji} *${label} ${input === 'on' ? 'Enabled ✅' : 'Disabled ❌'}*\n\n${
          input === 'on'
            ? `Violations will now be automatically deleted.`
            : `Protection is now off.`
        }`
      }, { quoted: msg })
    } catch (err) {
      await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
    }
  }

export default [

  // ── .antisticker ──────────────────────────────────────
  {
    command:  'antisticker',
    aliases:  ['nosticker', 'blocksticker'],
    category: 'anti',
    description: 'Block sticker messages in the group',
    usage:    '.antisticker on/off',
    example:  '.antisticker on',
    handler:  makeAntiToggle(
      'antisticker',
      'Anti-Sticker',
      '🚫',
      'All sticker messages will be automatically deleted.'
    )
  },

  // ── .antimedia ────────────────────────────────────────
  {
    command:  'antimedia',
    aliases:  ['nomedia', 'blockmedia'],
    category: 'anti',
    description: 'Block all media (images, videos, audio, documents) in the group',
    usage:    '.antimedia on/off',
    example:  '.antimedia on',
    handler:  makeAntiToggle(
      'antimedia',
      'Anti-Media',
      '🖼️',
      'All image, video, audio and document messages will be deleted.'
    )
  },

  // ── .antimention ──────────────────────────────────────
  {
    command:  'antimention',
    aliases:  ['nomention', 'blockmention'],
    category: 'anti',
    description: 'Block mass @mentions (tagging more than 5 people at once)',
    usage:    '.antimention on/off',
    example:  '.antimention on',
    handler:  makeAntiToggle(
      'antimention',
      'Anti-Mention',
      '🔇',
      'Messages that tag more than 5 members at once will be deleted.'
    )
  },

  // ── .antitag ──────────────────────────────────────────
  {
    command:  'antitag',
    aliases:  ['notag', 'blocktag'],
    category: 'anti',
    description: 'Block unauthorized use of @everyone style hidetag in the group',
    usage:    '.antitag on/off',
    example:  '.antitag on',
    handler:  makeAntiToggle(
      'antitag',
      'Anti-Tag',
      '🏷️',
      'Non-admin mass tag attempts will be deleted.'
    )
  },

  // ── .antidelete ───────────────────────────────────────
  {
    command:  'antidelete',
    aliases:  ['nodelete', 'undelete'],
    category: 'anti',
    description: 'Re-send deleted messages so they can\'t be hidden from admins',
    usage:    '.antidelete on/off',
    example:  '.antidelete on',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can configure anti-delete.'
        }, { quoted: msg })
      }

      const input = ctx.query?.toLowerCase().trim()

      if (!input) {
        const res     = await getGS(ctx.from)
        const current = res?.data?.antidelete || res?.antidelete || 'off'
        return sock.sendMessage(ctx.from, {
          text: [
            `♻️ *Anti-Delete*`,
            ``,
            `Current: *${current.toUpperCase()}*`,
            ``,
            `When ON, if anyone deletes a message, the bot immediately re-sends it so it cannot be hidden.`,
            ``,
            `Usage: \`${ctx.prefix}antidelete on/off\``
          ].join('\n')
        }, { quoted: msg })
      }

      if (!['on', 'off'].includes(input)) {
        return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      }

      try {
        await setGS(ctx.from, 'antidelete', input)
        await sock.sendMessage(ctx.from, {
          text: input === 'on'
            ? `♻️ *Anti-Delete Enabled*\n\nDeleted messages will be re-sent by the bot automatically.`
            : `♻️ *Anti-Delete Disabled*\n\nMembers can now delete their messages normally.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, { text: `❌ Failed: ${err.message}` }, { quoted: msg })
      }
    }
  }

]
