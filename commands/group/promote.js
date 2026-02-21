// commands/group/promote.js
// Commands: .promote | .demote

export default [

  // ── .promote ──────────────────────────────────────────
  {
    command:  'promote',
    aliases:  ['makeadmin'],
    category: 'group',
    description: 'Promote a member to group admin',
    usage:    '.promote @user',
    example:  '.promote @2348012345678',

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

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to promote members.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag a user or reply to their message.\n\n📌 *Usage:* ${ctx.prefix}promote @user`
        }, { quoted: msg })
      }

      // Check if already admin
      const parts = ctx.groupMeta?.participants || []
      const alreadyAdmin = parts.some(p =>
        p.id === targetJid && ['admin', 'superadmin'].includes(p.admin)
      )

      if (alreadyAdmin) {
        return sock.sendMessage(ctx.from, {
          text: `❌ @${targetJid.split('@')[0]} is already an admin.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      // Make sure target is actually in the group
      const inGroup = parts.some(p => p.id === targetJid)
      if (!inGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ That user is not in this group.'
        }, { quoted: msg })
      }

      try {
        await sock.groupParticipantsUpdate(ctx.from, [targetJid], 'promote')
        const num = targetJid.split('@')[0]

        await sock.sendMessage(ctx.from, {
          text: `👑 @${num} has been promoted to group admin!`,
          mentions: [targetJid]
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to promote: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .demote ───────────────────────────────────────────
  {
    command:  'demote',
    aliases:  ['removeadmin'],
    category: 'group',
    description: 'Demote a group admin to regular member',
    usage:    '.demote @user',
    example:  '.demote @2348012345678',

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

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to demote members.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag a user or reply to their message.\n\n📌 *Usage:* ${ctx.prefix}demote @user`
        }, { quoted: msg })
      }

      // Don't demote the bot owner
      if (targetJid.split('@')[0] === (process.env.OWNER_NUMBER || '')) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Cannot demote the bot owner.'
        }, { quoted: msg })
      }

      // Check if target is actually an admin
      const parts = ctx.groupMeta?.participants || []
      const isTargetAdmin = parts.some(p =>
        p.id === targetJid && ['admin', 'superadmin'].includes(p.admin)
      )

      if (!isTargetAdmin) {
        return sock.sendMessage(ctx.from, {
          text: `❌ @${targetJid.split('@')[0]} is not an admin.`,
          mentions: [targetJid]
        }, { quoted: msg })
      }

      // Can't demote superadmin (group creator)
      const isSuperAdmin = parts.some(p =>
        p.id === targetJid && p.admin === 'superadmin'
      )

      if (isSuperAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Cannot demote the group creator.'
        }, { quoted: msg })
      }

      try {
        await sock.groupParticipantsUpdate(ctx.from, [targetJid], 'demote')
        const num = targetJid.split('@')[0]

        await sock.sendMessage(ctx.from, {
          text: `⬇️ @${num} has been demoted from admin.`,
          mentions: [targetJid]
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to demote: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
