export default [
  {
    command: 'invite',
    aliases: ['invitelink', 'link'],
    groupOnly: true,
    adminOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const code = await sock.groupInviteCode(ctx.from)
      await sock.sendMessage(ctx.from, { text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}` }, { quoted: msg })
    }
  },
  {
    command: 'revoke',
    aliases: ['resetlink'],
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    handler: async (sock, msg, ctx, { api }) => {
      await sock.groupRevokeInvite(ctx.from)
      const code = await sock.groupInviteCode(ctx.from)
      await sock.sendMessage(ctx.from, { text: `✅ *Invite link reset!*\n\n🔗 New link:\nhttps://chat.whatsapp.com/${code}` }, { quoted: msg })
    }
  },
  {
    command: 'join',
    aliases: ['joingroup'],
    ownerOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const input = ctx.query
      if (!input) return sock.sendMessage(ctx.from, { text: `❌ Provide a link or code.\n📌 *Usage:* ${ctx.prefix}join <link>` }, { quoted: msg })
      const match = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/)
      const code = match ? match[1] : input.trim()
      await sock.groupAcceptInvite(code)
      await sock.sendMessage(ctx.from, { text: `✅ Joined the group.` }, { quoted: msg })
    }
  },
  {
    command: 'gclink',
    aliases: ['groupinfo'],
    groupOnly: true,
    handler: async (sock, msg, ctx, { api }) => {
      const meta = ctx.groupMeta
      const code = await sock.groupInviteCode(ctx.from)
      const text = [
        `📋 *Group Info*`,
        ``,
        `📌 *Name:* ${meta?.subject || 'Unknown'}`,
        `👥 *Members:* ${meta?.participants?.length || 0}`,
        meta?.desc ? `📝 *Description:* ${meta.desc}` : '',
        ``,
        `🔗 *Invite Link:*`,
        `https://chat.whatsapp.com/${code}`
      ].filter(Boolean).join('\n')
      await sock.sendMessage(ctx.from, { text }, { quoted: msg })
    }
  }
]
