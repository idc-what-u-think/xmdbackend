export default [
  {
    command: 'antilink',
    aliases: ['antilinkmode'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim()
      const res = await api.getGroupSettings(ctx.from)
      const s   = res.settings || {}
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: [`🔗 *Anti-Link*`, ``, `Current: *${(s.antilink || 'off').toUpperCase()}*`, ``, `Modes: \`off\` | \`delete\` | \`warn\` | \`kick\``, ``, `Usage: \`${ctx.prefix}antilink <mode>\``].join('\n')
        }, { quoted: msg })
      }
      if (!['off','delete','warn','kick'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Modes: `off` | `delete` | `warn` | `kick`' }, { quoted: msg })
      if (input !== 'off' && !ctx.isBotAdmin) return sock.sendMessage(ctx.from, { text: '❌ Make me admin first.' }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, antilink: input })
      const desc = { off: 'disabled.', delete: 'links will be deleted.', warn: 'links deleted + sender warned.', kick: 'sender kicked on first link.' }
      await sock.sendMessage(ctx.from, { text: `🔗 *Anti-Link* set to *${input.toUpperCase()}* — ${desc[input]}` }, { quoted: msg })
    }
  },
  {
    command: 'linkwhitelist',
    aliases: ['whitelistlink', 'allowlink'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) return sock.sendMessage(ctx.from, {
        text: [`✅ *Link Whitelist*`, `Add: \`${ctx.prefix}linkwhitelist <domain>\``, `Remove: \`${ctx.prefix}linkwhitelist remove <domain>\``, `List: \`${ctx.prefix}linkwhitelist list\``].join('\n')
      }, { quoted: msg })
      const res = await api.getGroupSettings(ctx.from)
      const s   = res.settings || {}
      let wl    = Array.isArray(s.antilink_whitelist) ? s.antilink_whitelist : []
      const sub = ctx.args[0]?.toLowerCase()
      if (sub === 'list') {
        return sock.sendMessage(ctx.from, { text: wl.length ? `✅ *Whitelisted:*\n${wl.map((d,i) => `${i+1}. ${d}`).join('\n')}` : '📋 No whitelisted domains.' }, { quoted: msg })
      }
      if (sub === 'remove') {
        const d = ctx.args[1]?.toLowerCase()
        if (!d || !wl.includes(d)) return sock.sendMessage(ctx.from, { text: `❌ *${d || '?'}* not in whitelist.` }, { quoted: msg })
        wl = wl.filter(x => x !== d)
        await api.setGroupSettings(ctx.from, { ...s, antilink_whitelist: wl })
        return sock.sendMessage(ctx.from, { text: `✅ Removed *${d}* from whitelist.` }, { quoted: msg })
      }
      const domain = ctx.query.toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
      if (!domain || domain.length < 3) return sock.sendMessage(ctx.from, { text: '❌ Invalid domain.' }, { quoted: msg })
      if (wl.includes(domain)) return sock.sendMessage(ctx.from, { text: `⚠️ *${domain}* already whitelisted.` }, { quoted: msg })
      if (wl.length >= 20) return sock.sendMessage(ctx.from, { text: '❌ Max 20 whitelisted domains.' }, { quoted: msg })
      wl.push(domain)
      await api.setGroupSettings(ctx.from, { ...s, antilink_whitelist: wl })
      await sock.sendMessage(ctx.from, { text: `✅ *${domain}* whitelisted. Anti-link will allow it.` }, { quoted: msg })
    }
  }
]
