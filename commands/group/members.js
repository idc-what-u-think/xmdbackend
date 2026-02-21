export default [
  {
    command: 'listmembers',
    aliases: ['members', 'memberlist'],
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const parts = ctx.groupMeta?.participants || []
      const sorted = [...parts].sort((a, b) => {
        const rank = p => p.admin === 'superadmin' ? 0 : p.admin === 'admin' ? 1 : 2
        return rank(a) - rank(b)
      })
      const lines = sorted.map((p, i) => {
        const tag = p.admin === 'superadmin' ? '👑' : p.admin === 'admin' ? '⭐' : '👤'
        return `${tag} ${i + 1}. +${p.id.split('@')[0]}`
      })
      const header = `👥 *Members (${parts.length})*\n${'─'.repeat(26)}\n\n`
      const full = header + lines.join('\n')
      if (full.length <= 3500) {
        await sock.sendMessage(ctx.from, { text: full }, { quoted: msg })
      } else {
        const pages = []
        let cur = header
        for (const l of lines) {
          if ((cur + l + '\n').length > 3400) { pages.push(cur); cur = '' }
          cur += l + '\n'
        }
        if (cur) pages.push(cur)
        for (let i = 0; i < pages.length; i++) {
          await sock.sendMessage(ctx.from, { text: `${pages[i]}\n_Page ${i + 1}/${pages.length}_` })
          await new Promise(r => setTimeout(r, 600))
        }
      }
    }
  },
  {
    command: 'admins',
    aliases: ['adminlist', 'listadmins'],
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const parts = ctx.groupMeta?.participants || []
      const admins = parts.filter(p => ['admin','superadmin'].includes(p.admin))
      if (!admins.length) return sock.sendMessage(ctx.from, { text: '❌ No admins found.' }, { quoted: msg })
      const mentions = admins.map(p => p.id)
      const lines = admins.map(p => `${p.admin === 'superadmin' ? '👑' : '⭐'} @${p.id.split('@')[0]}`)
      await sock.sendMessage(ctx.from, {
        text: `⭐ *Admins (${admins.length})*\n${'─'.repeat(26)}\n\n${lines.join('\n')}`,
        mentions
      }, { quoted: msg })
    }
  }
]
