// commands/group/manage.js
// Commands: .kickall | .leavegc | .creategc | .groupname | .groupdesc

export default [

  // ── .kickall ──────────────────────────────────────────
  {
    command:  'kickall',
    aliases:  ['removeall'],
    category: 'group',
    description: 'Kick all non-admin members from the group (owner/sudo only)',
    usage:    '.kickall',
    example:  '.kickall',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can use this command.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to kick members.'
        }, { quoted: msg })
      }

      const parts = ctx.groupMeta?.participants || []

      // Only kick non-admins, exclude the bot itself
      const toKick = parts.filter(p => {
        const isAdmin     = ['admin', 'superadmin'].includes(p.admin)
        const isBot       = p.id === ctx.botId || p.id.split('@')[0] === ctx.botNumber
        return !isAdmin && !isBot
      })

      if (!toKick.length) {
        return sock.sendMessage(ctx.from, {
          text: '⚠️ No non-admin members to kick.'
        }, { quoted: msg })
      }

      await sock.sendMessage(ctx.from, {
        text: `⏳ Kicking ${toKick.length} members... please wait.`
      }, { quoted: msg })

      let kicked  = 0
      let failed  = 0

      // Kick in batches of 5 to avoid WA rate limits
      const BATCH = 5
      for (let i = 0; i < toKick.length; i += BATCH) {
        const batch = toKick.slice(i, i + BATCH).map(p => p.id)

        try {
          await sock.groupParticipantsUpdate(ctx.from, batch, 'remove')
          kicked += batch.length
        } catch {
          failed += batch.length
        }

        // Delay between batches
        if (i + BATCH < toKick.length) {
          await new Promise(r => setTimeout(r, 1500))
        }
      }

      await sock.sendMessage(ctx.from, {
        text: `✅ *Kickall Done*\n\n✔️ Kicked: ${kicked}\n❌ Failed: ${failed}`
      })
    }
  },

  // ── .leavegc ──────────────────────────────────────────
  {
    command:  'leavegc',
    aliases:  ['leave', 'leavegroup'],
    category: 'group',
    description: 'Make the bot leave the current group (owner/sudo only)',
    usage:    '.leavegc',
    example:  '.leavegc',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can make me leave.'
        }, { quoted: msg })
      }

      try {
        await sock.sendMessage(ctx.from, {
          text: `👋 Goodbye everyone! I've been asked to leave by @${ctx.senderNumber}.`,
          mentions: [ctx.sender]
        })

        // Short delay so the goodbye message sends first
        await new Promise(r => setTimeout(r, 1000))

        await sock.groupLeave(ctx.from)
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to leave: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .creategc ─────────────────────────────────────────
  {
    command:  'creategc',
    aliases:  ['creategroup', 'newgroup'],
    category: 'group',
    description: 'Create a new WhatsApp group (owner/sudo only)',
    usage:    '.creategc <group name>',
    example:  '.creategc Firekid Squad',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isOwner && !ctx.isSudo) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only the bot owner or sudo users can create groups.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide a group name.\n\n📌 *Usage:* ${ctx.prefix}creategc <name>`
        }, { quoted: msg })
      }

      const groupName = ctx.query.trim()

      if (groupName.length > 100) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Group name is too long (max 100 characters).'
        }, { quoted: msg })
      }

      try {
        // Bot creates the group with itself as only member initially
        const result = await sock.groupCreate(groupName, [ctx.sender])

        const groupId   = result.id
        const inviteCode = await sock.groupInviteCode(groupId)
        const link       = `https://chat.whatsapp.com/${inviteCode}`

        await sock.sendMessage(ctx.from, {
          text: `✅ *Group Created!*\n\n👥 *Name:* ${groupName}\n🆔 *ID:* ${groupId}\n🔗 *Link:*\n${link}`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to create group: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .groupname ────────────────────────────────────────
  {
    command:  'groupname',
    aliases:  ['setname', 'changename', 'gcname'],
    category: 'group',
    description: 'Change the group name',
    usage:    '.groupname <new name>',
    example:  '.groupname Firekid XMD Official',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can change the group name.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to change the group name.'
        }, { quoted: msg })
      }

      if (!ctx.query) {
        return sock.sendMessage(ctx.from, {
          text: `❌ Provide the new group name.\n\n📌 *Usage:* ${ctx.prefix}groupname <new name>`
        }, { quoted: msg })
      }

      const newName = ctx.query.trim()

      if (newName.length > 100) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Group name is too long (max 100 characters).'
        }, { quoted: msg })
      }

      try {
        await sock.groupUpdateSubject(ctx.from, newName)

        await sock.sendMessage(ctx.from, {
          text: `✅ Group name changed to *${newName}*`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to change name: ${err.message}`
        }, { quoted: msg })
      }
    }
  },

  // ── .groupdesc ────────────────────────────────────────
  {
    command:  'groupdesc',
    aliases:  ['setdesc', 'changedesc', 'gcdesc'],
    category: 'group',
    description: 'Change the group description',
    usage:    '.groupdesc <new description>',
    example:  '.groupdesc Welcome to the official Firekid XMD group!',

    handler: async (sock, msg, args, ctx) => {
      if (!ctx.isGroup) {
        return sock.sendMessage(ctx.from, {
          text: '❌ This command only works in groups.'
        }, { quoted: msg })
      }

      if (!ctx.isAdmin && !ctx.isOwner) {
        return sock.sendMessage(ctx.from, {
          text: '❌ Only group admins can change the group description.'
        }, { quoted: msg })
      }

      if (!ctx.isBotAdmin) {
        return sock.sendMessage(ctx.from, {
          text: '❌ I need to be a group admin to change the description.'
        }, { quoted: msg })
      }

      // Allow clearing the description with ".groupdesc clear"
      const newDesc = ctx.query?.toLowerCase() === 'clear' ? '' : (ctx.query?.trim() || '')

      try {
        await sock.groupUpdateDescription(ctx.from, newDesc)

        await sock.sendMessage(ctx.from, {
          text: newDesc
            ? `✅ Group description updated!\n\n_${newDesc}_`
            : `✅ Group description cleared.`
        }, { quoted: msg })
      } catch (err) {
        await sock.sendMessage(ctx.from, {
          text: `❌ Failed to change description: ${err.message}`
        }, { quoted: msg })
      }
    }
  }

]
