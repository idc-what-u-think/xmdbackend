export default [
  {
    command: 'antibad',
    aliases: ['antiswear', 'antiprofanity'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query?.toLowerCase().trim()
      const res   = await api.getGroupSettings(ctx.from)
      const s     = res.settings || {}
      if (!input) {
        return sock.sendMessage(ctx.from, {
          text: [`🤐 *Anti-Bad-Word*`, ``, `Current: *${(s.antibad || 'off').toUpperCase()}*`, `Bad words: *${(s.badwords || []).length}*`, ``, `Usage: \`${ctx.prefix}antibad on/off\``, `Manage: \`${ctx.prefix}addbadword\` \`${ctx.prefix}delbadword\` \`${ctx.prefix}badwordlist\``].join('\n')
        }, { quoted: msg })
      }
      if (!['on','off'].includes(input)) return sock.sendMessage(ctx.from, { text: '❌ Use `on` or `off`.' }, { quoted: msg })
      if (input === 'on' && !ctx.isBotAdmin) return sock.sendMessage(ctx.from, { text: '❌ Make me admin first.' }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, antibad: input })
      await sock.sendMessage(ctx.from, { text: `🤐 *Anti-Bad-Word* turned *${input.toUpperCase()}*` }, { quoted: msg })
    }
  },
  {
    command: 'addbadword',
    aliases: ['badword', 'addword', 'banword'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) return sock.sendMessage(ctx.from, { text: `❌ ${ctx.prefix}addbadword <word> [word2] [word3]` }, { quoted: msg })
      const words = ctx.query.toLowerCase().trim().split(/\s+/).filter(w => w.length >= 2 && w.length <= 50)
      if (!words.length) return sock.sendMessage(ctx.from, { text: '❌ Words must be 2-50 characters.' }, { quoted: msg })
      const res = await api.getGroupSettings(ctx.from)
      const s   = res.settings || {}
      const existing = s.badwords || []
      if (existing.length >= 100) return sock.sendMessage(ctx.from, { text: '❌ Max 100 bad words. Remove some first.' }, { quoted: msg })
      const toAdd  = words.filter(w => !existing.includes(w))
      const skip   = words.filter(w => existing.includes(w))
      if (!toAdd.length) return sock.sendMessage(ctx.from, { text: `⚠️ All words already in the list.` }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, badwords: [...existing, ...toAdd] })
      await sock.sendMessage(ctx.from, {
        text: `✅ Added: ${toAdd.map(w => `"${w}"`).join(', ')}${skip.length ? `\n⚠️ Already in list: ${skip.join(', ')}` : ''}`
      }, { quoted: msg })
    }
  },
  {
    command: 'delbadword',
    aliases: ['removebadword', 'unbanword'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      if (!ctx.query) return sock.sendMessage(ctx.from, { text: `❌ ${ctx.prefix}delbadword <word>` }, { quoted: msg })
      const words = ctx.query.toLowerCase().trim().split(/\s+/).filter(Boolean)
      const res   = await api.getGroupSettings(ctx.from)
      const s     = res.settings || {}
      const existing = s.badwords || []
      const toRemove = words.filter(w => existing.includes(w))
      if (!toRemove.length) return sock.sendMessage(ctx.from, { text: `❌ None of those words are in the list.` }, { quoted: msg })
      await api.setGroupSettings(ctx.from, { ...s, badwords: existing.filter(w => !toRemove.includes(w)) })
      await sock.sendMessage(ctx.from, { text: `✅ Removed: ${toRemove.map(w => `"${w}"`).join(', ')}` }, { quoted: msg })
    }
  },
  {
    command: 'badwordlist',
    aliases: ['bannedwords', 'wordlist'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const res  = await api.getGroupSettings(ctx.from)
      const s    = res.settings || {}
      const list = s.badwords || []
      if (!list.length) return sock.sendMessage(ctx.from, { text: `📋 No banned words yet.\nAdd some: \`${ctx.prefix}addbadword <word>\`` }, { quoted: msg })
      const text = [`📋 *Bad Words (${list.length}/100)* — Filter: *${(s.antibad || 'off').toUpperCase()}*`, ``, [...list].sort().map((w, i) => `${String(i+1).padStart(2,'0')}. ${w}`).join('\n')].join('\n')
      try {
        await sock.sendMessage(ctx.sender, { text: text })
        await sock.sendMessage(ctx.from, { text: '✅ Bad word list sent to your DM.' }, { quoted: msg })
      } catch {
        await sock.sendMessage(ctx.from, { text }, { quoted: msg })
      }
    }
  }
]
