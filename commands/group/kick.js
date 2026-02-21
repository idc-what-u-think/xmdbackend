// commands/group/kick.js
// Commands: .kick (.remove) | .add

export default [

  // ── .kick ─────────────────────────────────────────────
  {
    command:  'kick',
    aliases:  ['remove'],
    category: 'group',
    description: 'Remove a member from the group',
    usage:    '.kick @user',
    example:  '.kick @2348012345678',

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
          text: '❌ I need to be a group admin to kick members.'
        }, { quoted: msg })
      }

      const targetJid = ctx.mentionedJids[0] || ctx.quotedSender

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Tag a user or reply to their message.\n\n📌 *Usage:* ${ctx.prefix}kick @user`
        }, { quoted: msg })
      }

      // Don't kick the bot itself
      if (targetJid === ctx.botId || targetJid.split('@')[0] === ctx.botNumber) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I cannot kick myself 😅'
        }, { quoted: msg })
      }

      // Don't kick the owner
      if (targetJid.split('@')[0] === (process.env.OWNER_NUMBER || '')) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I cannot kick the bot owner.'
        }, { quoted: msg })
      }

      // Prevent kicking an admin
      const parts = ctx.groupMeta?.participants || []
      const targetIsAdmin = parts.some(p =>
        p.id === targetJid && ['admin', 'superadmin'].includes(p.admin)
      )

      if (targetIsAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Cannot kick a group admin.'
        }, { quoted: msg })
      }

      try {
        await sock.groupParticipantsUpdate(ctx.from, [targetJid], 'remove')
        const num = targetJid.split('@')[0]

        await sock.sendMessage(ctx.from, {
          text: `✅ @${num} has been removed from the group.`,
          mentions: [targetJid]
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to kick: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .add ──────────────────────────────────────────────
  {
    command:  'add',
    aliases:  [],
    category: 'group',
    description: 'Add a member to the group',
    usage:    '.add <number> or .add @mention',
    example:  '.add 2348012345678',

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
          text: '❌ I need to be a group admin to add members.'
        }, { quoted: msg })
      }

      // Target from mention OR from raw number in args
      let targetJid = ctx.mentionedJids[0] || null

      if (!targetJid && ctx.query) {
        const cleaned = ctx.query.replace(/\D/g, '')
        if (cleaned.length >= 7) {
          targetJid = `${cleaned}@s.whatsapp.net`
        }
      }

      if (!targetJid) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a number or tag a user.\n\n📌 *Usage:* ${ctx.prefix}add 2348012345678`
        }, { quoted: msg })
      }

      try {
        const result = await sock.groupParticipantsUpdate(ctx.from, [targetJid], 'add')
        const num    = targetJid.split('@')[0]
        const status = result?.[0]?.status

        if (status === '200') {
          await sock.sendMessage(ctx.from, {
            text: `✅ @${num} has been added to the group!`,
            mentions: [targetJid]
          }, { quoted: msg })
        } else if (status === '403') {
          await sock.sendMessage(ctx.from, {
            text: `❌ Cannot add +${num} — their privacy settings prevent being added to groups.`
          }, { quoted: msg })
        } else if (status === '408') {
          await sock.sendMessage(ctx.from, {
            text: `❌ +${num} was not found on WhatsApp.`
          }, { quoted: msg })
        } else if (status === '409') {
          await sock.sendMessage(ctx.from, {
            text: `❌ @${num} is already in the group.`,
            mentions: [targetJid]
          }, { quoted: msg })
        } else {
          await sock.sendMessage(ctx.from, {
            text: `⚠️ Result for +${num}: status ${status || 'unknown'}`
          }, { quoted: msg })
        }
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to add: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
