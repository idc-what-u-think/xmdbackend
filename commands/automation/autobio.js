const BIOS = [
  'Firekid XMD 🔥 | Always Online',
  'Firekid XMD 🤖 | Making Group Life Easy',
  'Firekid XMD ⚡ | The Fastest Bot on WhatsApp',
  'Firekid XMD 💎 | Premium Features, Free to Use',
]

const parseDelay = s => {
  const m = s?.trim().match(/^(\d+)(s|m|h|d)$/i)
  if (!m) return null
  return parseInt(m[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()]
}

export default [
  {
    command: 'autobio',
    aliases: ['rotatebio'],
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim()
      if (!input) {
        const r = await api.sessionGet('toggle:autobio')
        const cur = r.value || 'off'
        return sock.sendMessage(ctx.from, {
          text: [`✏️ *Auto-Bio*`, ``, `Current: *${cur.toUpperCase()}*`, ``, `Rotates through ${BIOS.length} bios every hour.`, ``, `Usage: \`${ctx.prefix}autobio on/off\``].join('\n')
        }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      await api.sessionSet('toggle:autobio', input)
      if (input === 'on') {
        try { await sock.updateProfileStatus(BIOS[0]) } catch {}
      }
      await sock.sendMessage(ctx.from, { text: input === 'on' ? `✏️ *Auto-Bio Enabled*\n\nBio rotates every hour.` : `✏️ *Auto-Bio Disabled*` }, { quoted: msg })
    }
  },
  {
    command: 'schedmsg',
    aliases: ['schedule', 'remind', 'timer'],
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const sub = ctx.args[0]?.toLowerCase()

      if (sub === 'list') {
        const r    = await api.sessionGet('schedmsgs')
        const list = JSON.parse(r.value || '[]').filter(t => t.chatJid === ctx.from)
        if (!list.length) return sock.sendMessage(ctx.from, { text: `📋 No scheduled messages.\n\nCreate one: ${ctx.prefix}schedmsg <delay> <message>` }, { quoted: msg })
        const now  = Date.now()
        const lines = list.map((t, i) => {
          const left = Math.max(0, t.sendAt - now)
          const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000)
          return `${i + 1}. [${t.id}] "${t.text.slice(0, 40)}" — in ${h}h ${m}m`
        })
        return sock.sendMessage(ctx.from, { text: `📋 *Scheduled (${list.length})*\n\n${lines.join('\n')}` }, { quoted: msg })
      }

      if (sub === 'cancel') {
        const id   = ctx.args[1]
        if (!id) return sock.sendMessage(ctx.from, { text: `❌ Provide task ID.\n${ctx.prefix}schedmsg cancel <id>` }, { quoted: msg })
        const r    = await api.sessionGet('schedmsgs')
        const list = JSON.parse(r.value || '[]').filter(t => t.id !== id)
        await api.sessionSet('schedmsgs', JSON.stringify(list))
        return sock.sendMessage(ctx.from, { text: `✅ Cancelled task [${id}].` }, { quoted: msg })
      }

      if (!ctx.args.length) return sock.sendMessage(ctx.from, {
        text: [`⏰ *Schedule a Message*`, ``, `${ctx.prefix}schedmsg <delay> <message>`, `${ctx.prefix}schedmsg list`, `${ctx.prefix}schedmsg cancel <id>`, ``, `Delay: 30s | 10m | 2h | 1d`].join('\n')
      }, { quoted: msg })

      const delay = parseDelay(ctx.args[0])
      if (!delay) return sock.sendMessage(ctx.from, { text: '❌ Invalid delay. Use: 30s | 10m | 2h | 1d' }, { quoted: msg })
      if (delay < 10000) return sock.sendMessage(ctx.from, { text: '❌ Minimum delay is 10 seconds.' }, { quoted: msg })
      if (delay > 7 * 86400000) return sock.sendMessage(ctx.from, { text: '❌ Maximum delay is 7 days.' }, { quoted: msg })
      const text = ctx.args.slice(1).join(' ').trim()
      if (!text) return sock.sendMessage(ctx.from, { text: '❌ Provide a message to schedule.' }, { quoted: msg })

      const r    = await api.sessionGet('schedmsgs')
      const list = JSON.parse(r.value || '[]')
      const id   = Math.random().toString(36).slice(2, 8).toUpperCase()
      list.push({ id, chatJid: ctx.from, text, sendAt: Date.now() + delay, by: ctx.sender })
      await api.sessionSet('schedmsgs', JSON.stringify(list))

      const h = Math.floor(delay / 3600000), m = Math.floor((delay % 3600000) / 60000), s = Math.floor((delay % 60000) / 1000)
      const eta = [h && `${h}h`, m && `${m}m`, (!h && s) && `${s}s`].filter(Boolean).join(' ')
      await sock.sendMessage(ctx.from, {
        text: [`⏰ *Scheduled!*`, ``, `📝 "${text.slice(0, 60)}"`, `⏳ Sends in: *${eta}*`, `🆔 ID: \`${id}\``].join('\n')
      }, { quoted: msg })
    }
  }
]
