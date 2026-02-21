const gsToggle = (key, label, emoji) => async (sock, msg, ctx, { api }) => {
  if (!ctx.isBotAdmin && ctx.query?.toLowerCase().trim() === 'on') {
    return sock.sendMessage(ctx.from, { text: '❌ Make me admin first.' }, { quoted: msg })
  }
  const input = ctx.query?.toLowerCase().trim()
  const res   = await api.getGroupSettings(ctx.from)
  const s     = res.settings || {}
  if (!input) {
    return sock.sendMessage(ctx.from, { text: `${emoji} *${label}*\n\nCurrent: *${(s[key] || 'off').toUpperCase()}*\n\nUsage: \`${ctx.prefix}${key} on/off\`` }, { quoted: msg })
  }
  if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
  await api.setGroupSettings(ctx.from, { ...s, [key]: input })
  await sock.sendMessage(ctx.from, { text: `${emoji} *${label}* turned *${input.toUpperCase()}*` }, { quoted: msg })
}

export default [
  {
    command: 'antisticker',
    aliases: ['nosticker'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antisticker', 'Anti-Sticker', '🚫')
  },
  {
    command: 'antimedia',
    aliases: ['nomedia'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antimedia', 'Anti-Media', '🖼️')
  },
  {
    command: 'antimention',
    aliases: ['nomention'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antimention', 'Anti-Mention', '🔇')
  },
  {
    command: 'antitag',
    aliases: ['notag'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antitag', 'Anti-Tag', '🏷️')
  },
  {
    command: 'antidelete',
    aliases: ['nodelete', 'undelete'],
    groupOnly: true,
    adminOnly: true,
    handler: gsToggle('antidelete', 'Anti-Delete', '♻️')
  }
]
