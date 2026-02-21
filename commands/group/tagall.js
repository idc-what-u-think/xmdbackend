// commands/group/tagall.js
// Commands: .tagall (.everyone) | .hidetag

export default [

  // ── .tagall ───────────────────────────────────────────
  {
    command:  'tagall',
    aliases:  ['everyone', 'all'],
    category: 'group',
    description: 'Tag all group members with a visible mention list',
    usage:    '.tagall [message]',
    example:  '.tagall Good morning everyone!',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can tag everyone.'
        }, { quoted: msg })
      }

      const parts = ctx.groupMeta?.participants || []

      if (!parts.length) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Could not fetch group members.'
        }, { quoted: msg })
      }

      // Build mention list — collect all JIDs
      const mentions = parts.map(p => p.id)

      // Build text: @number for each member
      const memberLines = parts.map(p => {
        const num = p.id.split('@')[0]
        return `@${num}`
      })

      const header  = ctx.query ? `📢 *${ctx.query}*\n\n` : `📢 *Attention everyone!*\n\n`
      const tagText = memberLines.join(' ')
      const footer  = `\n\n👥 *${parts.length} members tagged*`

      // WhatsApp has a ~65536 char limit — split into chunks if needed
      const MAX_CHARS = 4000
      const fullText  = header + tagText + footer

      if (fullText.length <= MAX_CHARS) {
        await sock.sendMessage(ctx.from, {
          text:     fullText,
          mentions: mentions
        }, { quoted: msg })
      } else {
        // Send header first, then chunks of tags
        await sock.sendMessage(ctx.from, {
          text: header.trim()
        }, { quoted: msg })

        // Chunk members into groups of ~50
        const CHUNK = 50
        for (let i = 0; i < parts.length; i += CHUNK) {
          const slice    = parts.slice(i, i + CHUNK)
          const sliceMen = slice.map(p => p.id)
          const sliceTxt = slice.map(p => `@${p.id.split('@')[0]}`).join(' ')

          await sock.sendMessage(ctx.from, {
            text:     sliceTxt,
            mentions: sliceMen
          })

          // Small delay between chunks to avoid flood
          await new Promise(r => setTimeout(r, 800))
        }
      }
    }
  },

  // ── .hidetag ──────────────────────────────────────────
  {
    command:  'hidetag',
    aliases:  ['stag', 'hiddentag'],
    category: 'group',
    description: 'Tag all members silently — no visible @mentions in text',
    usage:    '.hidetag <message>',
    example:  '.hidetag Read the pinned message!',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can use this command.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a message.\n\n📌 *Usage:* ${ctx.prefix}hidetag <your message>`
        }, { quoted: msg })
      }

      const parts = ctx.groupMeta?.participants || []

      if (!parts.length) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Could not fetch group members.'
        }, { quoted: msg })
      }

      const mentions = parts.map(p => p.id)

      // The text does NOT contain @numbers — they're hidden in the mentions array
      // WhatsApp still notifies all mentioned users even without the visible text
      await sock.sendMessage(ctx.from, {
        text:     ctx.query,
        mentions: mentions
      }, { quoted: msg })
    }
  }

]
