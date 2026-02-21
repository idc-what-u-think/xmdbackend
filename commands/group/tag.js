export default [
  {
    command: 'tagall',
    aliases: ['everyone', 'all'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const parts = ctx.groupMeta?.participants || []
      const jids = parts.map(p => p.id)
      const text = ctx.query || '📢 Attention everyone!'
      const mentions = jids
      const header = `${text}\n\n`
      const lines = jids.map(j => `@${j.split('@')[0]}`)
      const full = header + lines.join('\n')
      if (full.length <= 4000) {
        await sock.sendMessage(ctx.from, { text: full, mentions }, { quoted: msg })
      } else {
        const chunks = []
        let cur = header
        for (const l of lines) {
          if ((cur + l + '\n').length > 3800) { chunks.push(cur); cur = '' }
          cur += l + '\n'
        }
        if (cur) chunks.push(cur)
        for (const chunk of chunks) {
          await sock.sendMessage(ctx.from, { text: chunk, mentions })
          await new Promise(r => setTimeout(r, 800))
        }
      }
    }
  },
  {
    command: 'hidetag',
    aliases: ['stag', 'silentall'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const parts = ctx.groupMeta?.participants || []
      const mentions = parts.map(p => p.id)
      const text = ctx.query || '📢 Message for everyone.'
      await sock.sendMessage(ctx.from, { text, mentions }, { quoted: msg })
    }
  }
]
