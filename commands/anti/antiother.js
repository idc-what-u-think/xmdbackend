const gsToggle = (key, label, emoji, needBotAdmin = true) => async (sock, msg, ctx, { api }) => {
  const input = ctx.query?.toLowerCase().trim()
  const res   = await api.getGroupSettings(ctx.from)
  const s     = res.settings || {}
  if (!input) {
    return sock.sendMessage(ctx.from, { text: `${emoji} *${label}*\n\nCurrent: *${(s[key] || 'off').toUpperCase()}*\n\nUsage: \`${ctx.prefix}${key} on/off\`` }, { quoted: msg })
  }
  if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
  if (input === 'on' && needBotAdmin && !ctx.isBotAdmin) return sock.sendMessage(ctx.from, { text: '❌ Make me admin first.' }, { quoted: msg })
  await api.setGroupSettings(ctx.from, { ...s, [key]: input })
  await sock.sendMessage(ctx.from, { text: `${emoji} *${label}* turned *${input.toUpperCase()}*` }, { quoted: msg })
}

export default [
  {
    command: 'antinsfw',
    aliases: ['nsfwblock'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antinsfw', 'Anti-NSFW', '🔞')
  },
  {
    command: 'anticall',
    aliases: ['blockcall', 'rejectcall'],
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim()
      if (!input) {
        const r = await api.sessionGet('toggle:anticall')
        return sock.sendMessage(ctx.from, { text: `📵 *Anti-Call*\n\nCurrent: *${(r.value || 'off').toUpperCase()}*\n\nUsage: \`${ctx.prefix}anticall on/off\`` }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      await api.sessionSet('toggle:anticall', input)
      await sock.sendMessage(ctx.from, { text: `📵 *Anti-Call* turned *${input.toUpperCase()}*` }, { quoted: msg })
    }
  },
  {
    command: 'antibug',
    aliases: ['anticrash', 'crashprotect'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antibug', 'Anti-Bug', '🛡️')
  },
  {
    command: 'antitemu',
    aliases: ['antispam', 'blockads'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antitemu', 'Anti-Shopping Spam', '🛒')
  },
  {
    command: 'floodblock',
    aliases: ['antiflood', 'ratelimit'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.args[0]?.toLowerCase()
      const res   = await api.getGroupSettings(ctx.from)
      const s     = res.settings || {}
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: [`🌊 *Flood Protection*`, ``, `Current: *${(s.floodblock || 'off').toUpperCase()}*`, `Limit: *${s.flood_limit || 5} msgs / 5 sec*`, ``, `Usage: \`${ctx.prefix}floodblock on [limit]\` or \`${ctx.prefix}floodblock off\``].join('\n')
        }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      if (input === 'on' && !ctx.isBotAdmin) return sock.sendMessage(ctx.from, { text: '❌ Make me admin first.' }, { quoted: msg })
      const limitArg = parseInt(ctx.args[1], 10)
      const limit    = (limitArg >= 2 && limitArg <= 20) ? limitArg : (s.flood_limit || 5)
      await api.setGroupSettings(ctx.from, { ...s, floodblock: input, flood_limit: limit })
      await sock.sendMessage(ctx.from, {
        text: input === 'on' ? `🌊 *Flood Protection ON* — limit: *${limit} msgs/5s*` : `🌊 *Flood Protection OFF*`
      }, { quoted: msg })
    }
  }
]
