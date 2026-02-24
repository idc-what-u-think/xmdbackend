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
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.trim()
      
      if (!input) {
        const r = await api.sessionGet('autoreact')
        const cur = r?.value || 'off'
        return sock.sendMessage(ctx.from, {
          text: `*Auto-React to Commands*\n\nCurrent: ${cur === 'off' ? '*OFF*' : `*ON* (${cur})`}\n\n*Usage:*\n  ${ctx.prefix}autoreact on <emoji> - Enable with emoji\n  ${ctx.prefix}autoreact off - Disable\n\n*Examples:*\n  ${ctx.prefix}autoreact on 🔥\n  ${ctx.prefix}autoreact on ✅\n  ${ctx.prefix}autoreact off\n\n_Reacts to command messages before sending response_`
        }, { quoted: msg })
      }
      
      const [action, ...rest] = input.split(' ')
      
      if (action.toLowerCase() === 'off') {
        await api.sessionSet('autoreact', 'off')
        return sock.sendMessage(ctx.from, { 
          text: '✅ *Auto-React* turned *OFF*' 
        }, { quoted: msg })
      }
      
      if (action.toLowerCase() === 'on') {
        const emoji = rest.join(' ') || '✅'
        // Validate emoji (basic check)
        if (emoji.length > 10) {
          return sock.sendMessage(ctx.from, { 
            text: '❌ Invalid emoji. Please use a single emoji.' 
          }, { quoted: msg })
        }
        await api.sessionSet('autoreact', emoji)
        return sock.sendMessage(ctx.from, { 
          text: `✅ *Auto-React* turned *ON*\nEmoji: ${emoji}\n\n_Will react to all commands with ${emoji}_` 
        }, { quoted: msg })
      }
      
      return sock.sendMessage(ctx.from, { 
        text: `❌ Invalid action. Use:\n  ${ctx.prefix}autoreact on <emoji>\n  ${ctx.prefix}autoreact off` 
      }, { quoted: msg })
    }
  },
  {
    command: 'autoforward',
    aliases: ['forward'],
    ownerOnly: true,
    handler: makeToggle('autoforward', 'Auto-Forward', '📨')
  }
]
