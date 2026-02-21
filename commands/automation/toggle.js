const makeToggle = (key, label, emoji) => async (sock, msg, ctx, { api }) => {
  const input = ctx.query?.toLowerCase().trim()
  if (!input) {
    const r = await api.sessionGet(`toggle:${key}`)
    const cur = r.value || 'off'
    return sock.sendMessage(ctx.from, {
      text: `${emoji} *${label}*\n\nCurrent: *${cur.toUpperCase()}*\n\nUsage: \`${ctx.prefix}${key} on/off\``
    }, { quoted: msg })
  }
  if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
  await api.sessionSet(`toggle:${key}`, input)
  await sock.sendMessage(ctx.from, { text: `${emoji} *${label}* turned *${input.toUpperCase()}*` }, { quoted: msg })
}

export default [
  {
    command: 'autoread',
    aliases: ['autoread'],
    ownerOnly: true,
    handler: makeToggle('autoread', 'Auto-Read', '📖')
  },
  {
    command: 'autoviewstatus',
    aliases: ['autostatus', 'viewstatus'],
    ownerOnly: true,
    handler: makeToggle('autoviewstatus', 'Auto-View Status', '👁️')
  },
  {
    command: 'autoreactstatus',
    aliases: ['statusreact'],
    ownerOnly: true,
    handler: makeToggle('autoreactstatus', 'Auto-React Status', '🔥')
  },
  {
    command: 'alwaysonline',
    aliases: ['online', 'stayonline'],
    ownerOnly: true,
    handler: makeToggle('alwaysonline', 'Always Online', '🟢')
  },
  {
    command: 'autotyping',
    aliases: ['typeindicator'],
    ownerOnly: true,
    handler: makeToggle('autotyping', 'Auto-Typing', '⌨️')
  },
  {
    command: 'autorecording',
    aliases: ['recordindicator'],
    ownerOnly: true,
    handler: makeToggle('autorecording', 'Auto-Recording', '🎙️')
  },
  {
    command: 'autoreact',
    aliases: ['autoemoji'],
    ownerOnly: true,
    handler: makeToggle('autoreact', 'Auto-React', '😄')
  },
  {
    command: 'autoforward',
    aliases: ['forward'],
    ownerOnly: true,
    handler: makeToggle('autoforward', 'Auto-Forward', '📨')
  }
]
