export default [
  {
    command: 'kickall',
    aliases: ['removeall'],
    groupOnly: true,
    ownerOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const parts = ctx.groupMeta?.participants || []
      const targets = parts.filter(p => !['admin','superadmin'].includes(p.admin) && p.id !== ctx.botId)
      if (!targets.length) return sock.sendMessage(ctx.from, { text: '❌ No non-admin members to remove.' }, { quoted: msg })
      await sock.sendMessage(ctx.from, { text: `⚠️ Removing ${targets.length} members...` }, { quoted: msg })
      const batch = 5
      for (let i = 0; i < targets.length; i += batch) {
        const chunk = targets.slice(i, i + batch).map(p => p.id)
        await sock.groupParticipantsUpdate(ctx.from, chunk, 'remove').catch(() => {})
        await new Promise(r => setTimeout(r, 1500))
      }
      await sock.sendMessage(ctx.from, { text: `✅ Removed ${targets.length} members.` })
    }
  },
  {
    command: 'leavegc',
    aliases: ['leave', 'leavegroup'],
    groupOnly: true,
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.sendMessage(ctx.from, { text: `👋 Goodbye everyone! ${ctx.botName} is leaving.` })
      await sock.groupLeave(ctx.from)
    }
  },
  {
    command: 'creategc',
    aliases: ['creategroup', 'newgroup'],
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const name = ctx.query
      if (!name) return sock.sendMessage(ctx.from, { text: `❌ Provide a group name.\n📌 *Usage:* ${ctx.prefix}creategc <name>` }, { quoted: msg })
      const result = await sock.groupCreate(name, [ctx.sender])
      const code = await sock.groupInviteCode(result.id).catch(() => null)
      const text = [`✅ Group *${name}* created!`, code ? `🔗 Link: https://chat.whatsapp.com/${code}` : ''].filter(Boolean).join('\n')
      await sock.sendMessage(ctx.from, { text }, { quoted: msg })
    }
  },
  {
    command: 'groupname',
    aliases: ['setgroupname', 'setname'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const name = ctx.query
      if (!name) return sock.sendMessage(ctx.from, { text: `❌ Provide a name.\n📌 *Usage:* ${ctx.prefix}groupname <name>` }, { quoted: msg })
      if (name.length > 100) return sock.sendMessage(ctx.from, { text: '❌ Name must be 100 characters or less.' }, { quoted: msg })
      await sock.groupUpdateSubject(ctx.from, name)
      await sock.sendMessage(ctx.from, { text: `✅ Group name updated to *${name}*` }, { quoted: msg })
    }
  },
  {
    command: 'groupdesc',
    aliases: ['setdesc', 'setgroupdesc'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      const desc = ctx.query
      const clearing = desc?.toLowerCase() === 'clear'
      await sock.groupUpdateDescription(ctx.from, clearing ? '' : (desc || ''))
      await sock.sendMessage(ctx.from, { text: clearing ? '✅ Group description cleared.' : `✅ Group description updated.` }, { quoted: msg })
    }
  }
]
