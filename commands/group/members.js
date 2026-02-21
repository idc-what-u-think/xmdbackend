// commands/group/members.js
// Commands: .listmembers | .admins

export default [

  // ── .listmembers ──────────────────────────────────────
  {
    command:  'listmembers',
    aliases:  ['members', 'list', 'memberlist'],
    category: 'group',
    description: 'List all group members with their roles',
    usage:    '.listmembers',
    example:  '.listmembers',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      const parts = ctx.groupMeta?.participants || []

      if (!parts.length) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Could not fetch group members.'
        }, { quoted: msg })
      }

      // Sort: superadmin first, then admin, then members
      const sorted = [...parts].sort((a, b) => {
        const rank = { superadmin: 0, admin: 1, null: 2, undefined: 2 }
        return (rank[a.admin] ?? 2) - (rank[b.admin] ?? 2)
      })

      const groupName = ctx.groupMeta?.subject || 'Group'

      // Build the list text
      const lines = sorted.map((p, i) => {
        const num  = p.id.split('@')[0]
        let role   = ''
        if (p.admin === 'superadmin') role = ' 👑'
        else if (p.admin === 'admin') role = ' ⭐'
        return `${String(i + 1).padStart(2, '0')}. +${num}${role}`
      })

      const header = [
        `👥 *${groupName}*`,
        `📊 Total Members: *${parts.length}*`,
        `👑 = Creator  ⭐ = Admin`,
        `${'─'.repeat(28)}`,
        ``
      ].join('\n')

      const footer = `\n${'─'.repeat(28)}`

      // WhatsApp message limit ~4096 chars — paginate if needed
      const MAX   = 3500
      const full  = header + lines.join('\n') + footer

      if (full.length <= MAX) {
        await sock.sendMessage(ctx.from, { text: full }, { quoted: msg })
      } else {
        // Send in pages of ~50 members
        const PAGE = 50

        // Send header + first page
        const firstPage = lines.slice(0, PAGE)
        await sock.sendMessage(ctx.from, {
          text: header + firstPage.join('\n') + `\n_(Page 1)_`
        }, { quoted: msg })

        for (let i = PAGE; i < lines.length; i += PAGE) {
          const page    = lines.slice(i, i + PAGE)
          const pageNum = Math.floor(i / PAGE) + 2

          await new Promise(r => setTimeout(r, 800))

          await sock.sendMessage(ctx.from, {
            text: page.join('\n') + `\n_(Page ${pageNum})_`
          })
        }
      }
    }
  },

  // ── .admins ───────────────────────────────────────────
  {
    command:  'admins',
    aliases:  ['adminlist', 'listadmins'],
    category: 'group',
    description: 'List all group admins',
    usage:    '.admins',
    example:  '.admins',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      const parts = ctx.groupMeta?.participants || []

      // Filter only admins
      const admins = parts.filter(p => ['admin', 'superadmin'].includes(p.admin))

      if (!admins.length) {
        return sock.sendMessage(ctx.from, {
          text: '⚠️ This group has no admins currently.'
        }, { quoted: msg })
      }

      const groupName = ctx.groupMeta?.subject || 'Group'

      // Build mention list
      const mentions   = admins.map(p => p.id)
      const adminLines = admins.map((p, i) => {
        const num  = p.id.split('@')[0]
        const role = p.admin === 'superadmin' ? '👑 Creator' : '⭐ Admin'
        return `${i + 1}. @${num} — ${role}`
      }).join('\n')

      const text = [
        `🛡️ *${groupName} — Admins*`,
        `${'─'.repeat(28)}`,
        ``,
        adminLines,
        ``,
        `${'─'.repeat(28)}`,
        `📊 Total Admins: *${admins.length}*`
      ].join('\n')

      await sock.sendMessage(ctx.from, {
        text,
        mentions
      }, { quoted: msg })
    }
  }

]
